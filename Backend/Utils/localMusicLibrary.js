import fs from "node:fs/promises"; //lets Node.js read directories and inspect files asynchronously.
import os from "node:os"; // get information aboutoperating system, including home directory
import path from "node:path";// helps construct file paths correctly on Windows, Linux and macOS.

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".opus", ".wma", ".aiff"]);
const CACHE_MS = 60_000;
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

// walk gets the entries (songs)
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
  if (Date.now() - indexedAt < CACHE_MS) return indexedFiles;
  if (!indexing) {
    indexing = walk(musicDirectory).then((files) => {
      indexedFiles = files.map((filePath) => ({ filePath, name: normalize(path.basename(filePath)) }));
      indexedAt = Date.now();
      return indexedFiles;
    }).finally(() => { indexing = null; });
  }
  return indexing;
}

export async function findLocalTrack(bestMatch, spotifyTrack) {
  if (!bestMatch) return { found: false, directory: musicDirectory };
  const files = await getIndex();
  const artistTokens = normalize(spotifyTrack?.artist).split(" ").filter((token) => token.length > 1);
  const titleTokens = normalize(spotifyTrack?.name).split(" ").filter((token) => token.length > 1);
  const expected = [...titleTokens, ...artistTokens];
  const matchedFile = files.find(({ name }) => {
    if (!name) return false;
    const coverage = expected.filter((token) => name.includes(token)).length / Math.max(expected.length, 1);
    return coverage >= 0.75 && titleTokens.some((token) => name.includes(token)) &&
      (artistTokens.length === 0 || artistTokens.some((token) => name.includes(token)));
  });
  return matchedFile
    ? { found: true, fileName: path.basename(matchedFile.filePath), path: matchedFile.filePath, directory: musicDirectory }
    : { found: false, directory: musicDirectory };
}
