import fs from "fs/promises";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "cache", "youtube-cache.json");
// Keep successful candidate results for a week so repeat searches can skip YouTube API calls.
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

let cache = {};

function removeExpiredEntries() {
  const now = Date.now();
  let removed = false;

  for (const [key, entry] of Object.entries(cache)) {
    const validEntry = entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      Number.isFinite(entry.savedAt) &&
      entry.savedAt <= now &&
      entry.data &&
      typeof entry.data === "object" &&
      !Array.isArray(entry.data);

    if (!validEntry || now - entry.savedAt > TTL_MS) {
      delete cache[key];
      removed = true;
    }
  }

  return removed;
}

async function saveCache() {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// load once when the server starts
export async function loadCache() {
  let raw;
  try {
    raw = await fs.readFile(CACHE_FILE, "utf-8");
  } catch {
    cache = {}; // file doesn't exist yet or is corrupted, start fresh
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    cache = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    cache = {}; // Invalid JSON, start fresh.
    return;
  }

  if (removeExpiredEntries()) await saveCache();
}

export async function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;

  if (!Number.isFinite(entry.savedAt) || Date.now() - entry.savedAt > TTL_MS) {
    delete cache[key];
    await saveCache();
    return null;
  }
  return entry.data;
}

export async function setCached(key, data) {
  removeExpiredEntries();
  cache[key] = { savedAt: Date.now(), data };
  await saveCache();
}
