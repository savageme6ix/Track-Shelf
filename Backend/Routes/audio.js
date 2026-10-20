import express from "express";
import youtubedl from "youtube-dl-exec";
import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { invalidateLocalMusicIndex, musicDirectory } from "../Utils/localMusicLibrary.js";

const router = express.Router();
const stagingDirectory = path.join(musicDirectory, ".track-shelf-staging");
const jobs = new Map();
const ALLOWED_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com",
]);

function cleanText(value, fallback, maxLength = 180) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
  return cleaned || fallback;
}

function safeFilePart(value) {
  const part = value.replace(/[\\/:*?"<>|]/g, " ").replace(/[. ]+$/g, "").trim().slice(0, 120);
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(part) ? `_${part}` : part;
}

function quoteForFfmpeg(value) {
  // yt-dlp shell-splits postprocessor arguments; keep each metadata value as one argument.
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function createMetadataArgs({ title, artist, album }) {
  const entries = [["title", title], ["artist", artist]];
  if (album) entries.push(["album", album]);
  const args = entries.map(([key, value]) => `-metadata ${key}=${quoteForFfmpeg(value)}`).join(" ");
  return `FFmpegMetadata+ffmpeg_o:${args}`;
}

async function saveWithoutOverwrite(stagedMp3Path, title, artist) {
  const base = ([safeFilePart(artist), safeFilePart(title)].filter(Boolean).join(" - ") || "Downloaded track").slice(0, 180);
  let suffix = 1;
  while (true) {
    const name = `${base}${suffix > 1 ? ` (${suffix})` : ""}.mp3`;
    const filePath = path.join(musicDirectory, name);
    try {
      // A hard link reserves a unique destination atomically without overwriting an existing song.
      await fs.link(stagedMp3Path, filePath);
      await fs.unlink(stagedMp3Path);
      return name;
    } catch (error) {
      if (error.code === "EEXIST") {
        suffix += 1;
        continue;
      }
      if (error.code === "EPERM" || error.code === "EXDEV" || error.code === "ENOTSUP") {
        try {
          await fs.copyFile(stagedMp3Path, filePath, fsConstants.COPYFILE_EXCL);
          await fs.unlink(stagedMp3Path);
          return name;
        } catch (copyError) {
          if (copyError.code === "EEXIST") {
            suffix += 1;
            continue;
          }
          await fs.unlink(filePath).catch(() => {});
          throw copyError;
        }
      }
      throw error;
    }
  }
}

async function cleanStagedFiles(jobId) {
  try {
    const entries = await fs.readdir(stagingDirectory, { withFileTypes: true });
    await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.startsWith(`${jobId}.`))
      .map((entry) => fs.unlink(path.join(stagingDirectory, entry.name)).catch(() => {})));
  } catch {
    // The staging directory might not exist yet.
  }
}

function setProgressFromStderr(job, chunk) {
  const lines = `${job.stderrBuffer}${chunk.toString("utf8")}`.split(/\r?\n/);
  job.stderrBuffer = lines.pop() ?? "";
  for (const line of lines) {
    const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
    if (match) {
      const percentage = Number(match[1]);
      if (Number.isFinite(percentage)) job.progress = Math.max(job.progress, Math.min(94, Math.floor(percentage * 0.94)));
    } else if (/\[ExtractAudio\]|\[Metadata\]/.test(line)) {
      job.progress = Math.max(job.progress, 96);
      job.message = "Finalizing audio and tags…";
    }
  }
}

async function runDownload(job, url, metadata) {
  const stagedPath = path.join(stagingDirectory, `${job.id}.%(ext)s`);
  const stagedMp3Path = path.join(stagingDirectory, `${job.id}.mp3`);
  job.status = "downloading";
  job.message = "Starting YouTube download…";

  try {
    await fs.mkdir(musicDirectory, { recursive: true });
    await fs.mkdir(stagingDirectory, { recursive: true });
    const subprocess = youtubedl.exec(url, {
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: 0,
      output: stagedPath,
      noPlaylist: true,
      newline: true,
      progress: true,
      embedMetadata: true,
      noEmbedChapters: true,
      postprocessorArgs: createMetadataArgs(metadata),
    }, { timeout: 20 * 60 * 1000, killSignal: "SIGTERM" });
    subprocess.stderr?.on("data", (chunk) => setProgressFromStderr(job, chunk));
    await subprocess;

    job.progress = 98;
    job.message = "Saving file into your Music folder…";
    const fileName = await saveWithoutOverwrite(stagedMp3Path, metadata.title, metadata.artist);
    await cleanStagedFiles(job.id);
    invalidateLocalMusicIndex();

    job.status = "complete";
    job.progress = 100;
    job.message = `Saved ${fileName} to your Music folder.`;
    job.fileName = fileName;
    job.completedAt = Date.now();
    scheduleJobCleanup(job);
  } catch (error) {
    await cleanStagedFiles(job.id);
    job.status = "failed";
    job.message = error.stderr?.split(/\r?\n/).filter(Boolean).slice(-2).join(" ") || "Audio download failed.";
    job.completedAt = Date.now();
    scheduleJobCleanup(job);
    console.error("Download failed:", error.message);
  }
}

router.post("/download-audio", async (req, res) => {
  const body = req.body ?? {};
  const { url } = body;
  const spotifyTrack = body.spotifyTrack && typeof body.spotifyTrack === "object" ? body.spotifyTrack : {};
  const bestCandidate = body.bestCandidate && typeof body.bestCandidate === "object" ? body.bestCandidate : {};
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ message: "A valid YouTube URL is required." });
  }
  if (parsedUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    return res.status(400).json({ message: "Please provide a valid HTTPS YouTube URL." });
  }

  const metadata = {
    title: cleanText(spotifyTrack.name, cleanText(bestCandidate.title, "Unknown title")),
    artist: cleanText(spotifyTrack.artist, cleanText(bestCandidate.channelTitle, "Unknown artist")),
    album: cleanText(spotifyTrack.album, "", 180),
  };
  const job = { id: randomUUID(), status: "queued", progress: 0, message: "Waiting to start…", fileName: null, stderrBuffer: "" };
  jobs.set(job.id, job);
  void runDownload(job, parsedUrl.toString(), metadata);
  res.status(202).json({ jobId: job.id });
});

function scheduleJobCleanup(job) {
  const timer = setTimeout(() => jobs.delete(job.id), 30 * 60 * 1000);
  timer.unref?.();
}

router.get("/download-audio/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Download job not found." });
  if (job.completedAt && Date.now() - job.completedAt > 30 * 60 * 1000) {
    jobs.delete(job.id);
    return res.status(404).json({ message: "Download job has expired." });
  }
  return res.json({ status: job.status, progress: job.progress, message: job.message, fileName: job.fileName });
});

export default router;
