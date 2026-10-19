import fs from "fs/promises";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "cache", "youtube-cache.json");
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

let cache = {};

// load once when the server starts
export async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    cache = JSON.parse(raw);
  } catch {
    cache = {}; // file doesn't exist yet or is corrupted, start fresh
  }
}

export function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;

  if (Date.now() - entry.savedAt > TTL_MS) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

export async function setCached(key, data) {
  cache[key] = { savedAt: Date.now(), data };

  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}