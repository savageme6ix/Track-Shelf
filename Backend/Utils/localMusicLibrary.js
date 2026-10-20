import fs from "node:fs/promises"; //lets Node.js read directories and inspect files asynchronously.
import os from "node:os"; // get information aboutoperating system, including home directory
import path from "node:path";// helps construct file paths correctly on Windows, Linux and macOS.

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".opus", ".wma", ".aiff"]);

// Words that show up in YouTube titles/channels but rarely in filenames; they are ignored when comparing.
const TITLE_NOISE = new Set([
  "official", "video", "audio", "lyrics", "lyric", "music", "clip", "visualizer", "hd", "4k", "mv", "vevo",
  "topic", "feat", "ft", "featuring",
]);

const CACHE_MS = 60_000;

// Share of the title's words that must appear in the filename (0.8 = 80%).
const MIN_TITLE_COVERAGE = 0.8;

// A title with this many words (or more) that is found completely in the filename
// is accepted even if no artist name is found. Shorter titles MUST also show the artist,
// because a short title like "Halo" is far too common to trust on its own.
const LONG_TITLE_WORDS = 3;

let indexedFiles = [];
let indexedAt = 0;
let indexing;

// path.resolve converts the chosen path into an absolute path
export const musicDirectory = path.resolve(process.env.MUSIC_LIBRARY_PATH || path.join(os.homedir(), "Music"));

// make song names easier to compare, even when filenames contain extra information or different punctuation.
function normalize(value = "") {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(mp3|m4a|aac|flac|wav|ogg|opus|wma|aiff)$/i, "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

// Turns text into a list of whole words with the noise words removed.
// e.g. "The Weeknd - Blinding Lights (Official Video)" → ["the", "weeknd", "blinding", "lights"]
function toTokens(value = "") {
  return normalize(value).split(" ").filter((word) => word && !TITLE_NOISE.has(word));
}

async function walk(directory) {
  let entries;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch { return []; }
  //processes directory entries concurrently, 
  // rather than waiting for each entry to finish 
  // before starting the next one.
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    // If walk() finds another directory, it calls itself on that directory(recursive).
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) return [fullPath];
    return [];
  }));
  return nested.flat();
}

async function getIndex() {
  // Reuse the last scan if it is less than a minute old, so we don't re-read the disk for every track.
  if (Date.now() - indexedAt < CACHE_MS) return indexedFiles;
  // If a scan is already running, everyone waits for that same scan instead of starting a new one.
  if (!indexing) {
    indexing = walk(musicDirectory).then((files) => {
      indexedFiles = files.map((filePath) => {
        // Folder names below the music folder, e.g. "Beyonce/Lemonade" → "beyonce", "lemonade".
        // Many libraries are organised as Artist/Album/Song.mp3, so the artist is often in the folder, not the filename.
        const relativeFolder = path.relative(musicDirectory, path.dirname(filePath));
        return {
          filePath,
          // Sets store each word once and let us check "is this whole word present?" instantly.
          // This is what stops "love" from matching inside "glove".
          nameWords: new Set(toTokens(path.basename(filePath))),
          folderWords: new Set(toTokens(relativeFolder)),
        };
      });
      indexedAt = Date.now();
      return indexedFiles;
    }).finally(() => { indexing = null; });
  }
  return indexing;
}

// Decides whether ONE file matches a title + artist. Used for both the Spotify and the YouTube details.
function isMatch(titleWords, artistWords, { nameWords, folderWords }) {
  if (titleWords.length === 0) return false;

  // 1. How many of the title's words appear (as whole words) in the filename?
  const foundCount = titleWords.filter((word) => nameWords.has(word)).length;
  const titleCoverage = foundCount / titleWords.length;
  if (titleCoverage < MIN_TITLE_COVERAGE) return false;

  // 2. Is any artist word in the filename OR in the folder path?
  const artistFound = artistWords.some((word) => nameWords.has(word) || folderWords.has(word));

  // 3. Accept when the artist is found, or when the title is long and completely present.
  //    A short title alone (like "Halo") is never enough.
  const longTitleFullMatch = titleWords.length >= LONG_TITLE_WORDS && titleCoverage === 1;
  return artistFound || longTitleFullMatch;
}

// bestMatch = the YouTube candidate chosen by the match engine (can be null)
// spotifyTrack = { name, artist, durationSec } from the request (more reliable than the YouTube title)
export async function findLocalTrack(bestMatch, spotifyTrack) {
  // Nothing to compare against at all.
  if (!bestMatch && !spotifyTrack) return { found: false, directory: musicDirectory };

  const files = await getIndex();

  // Spotify side: the track name without suffixes like "- Remastered 2011", plus the artist.
  const spotifyTitleWords = toTokens(spotifyTrack?.name?.split(" - ")[0]);
  const spotifyArtistWords = toTokens(spotifyTrack?.artist);

  // YouTube side: Compare against YouTube's selected result: its title and channel name.
  const youtubeTitleWords = toTokens(bestMatch?.title);
  const youtubeChannelWords = toTokens(bestMatch?.channelTitle);

  for (const file of files) {
    // A file counts as found if EITHER side matches, so a wrong YouTube pick can't hide a song you own.
    const bySpotify = isMatch(spotifyTitleWords, spotifyArtistWords, file);
    const byYoutube = isMatch(youtubeTitleWords, youtubeChannelWords, file);

    if (bySpotify || byYoutube) {
      return {
        found: true,
        matchedBy: bySpotify ? "spotify" : "youtube", // handy for debugging which side matched
        fileName: path.basename(file.filePath),
        path: file.filePath,
        directory: musicDirectory,
      };
    }
  }

  return { found: false, directory: musicDirectory };
}
