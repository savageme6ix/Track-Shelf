import { useCallback, useRef, useState } from "react";
import axios from "axios";

const STORAGE_KEY = "track-shelf.matching-job.v1";

function readSavedJob() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    // Older runs treated API failures as unmatched; rewind to the first failure so it can be retried.
    const failedResultIndex = Array.isArray(saved?.results)
      ? saved.results.findIndex((result) => result.requestError)
      : -1;
    let retryIndex = null;
    if (failedResultIndex >= 0) {
      retryIndex = saved.results[failedResultIndex].trackIndex ?? failedResultIndex;
      saved.results = saved.results.filter((result, index) => (result.trackIndex ?? index) < retryIndex);
      saved.completed = retryIndex;
      saved.nextIndex = retryIndex;
      saved.finished = false;
      saved.paused = false;
      saved.error = "Earlier YouTube requests failed and were counted incorrectly. Continue matching to retry them.";
    }
    if (saved?.isRunning) {
      saved.isRunning = false;
      saved.nextIndex = retryIndex ?? saved.completed;
      saved.error = "Matching was interrupted. Continue when you're ready.";
    }
    return saved;
  } catch {
    return null;
  }
}

function saveJob(job) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
  } catch (error) {
    console.warn("Could not save matching progress:", error);
  }
}

export default function useYoutubeSearch() {
  const [job, setJob] = useState(readSavedJob);
  // Prevent a fast double click from starting two matching loops at once.
  const activeRun = useRef(false);

  const updateJob = useCallback((nextJob) => {
    setJob(nextJob);
    // Save after each state change so closing the app doesn't lose completed tracks.
    saveJob(nextJob);
  }, []);

  const runMatching = useCallback(async (tracks, playlistId, startingJob = null) => {
    if (!tracks?.length || !playlistId || activeRun.current) return;
    activeRun.current = true;

    const isSameJob = startingJob?.playlistId === playlistId;
    let nextJob = isSameJob
      ? { ...startingJob, isRunning: true, paused: false, error: "" }
      : {
          playlistId,
          tracks,
          results: [],
          completed: 0,
          nextIndex: 0,
          isRunning: true,
          paused: false,
          resetAt: null,
          error: "",
          finished: false,
        };

    updateJob(nextJob);

    // Do one track at a time, so a quota error pauses on the exact track that still needs work.
    for (let index = nextJob.nextIndex; index < nextJob.tracks.length; index += 1) {
      const track = nextJob.tracks[index];
      let result;

      let attempt = 0;
      while (!result) {
        try {
          const response = await axios.get("http://127.0.0.1:3000/api/youtube/search", {
            params: {
              name: track.name,
              artist: track.primaryArtist || track.artist,
              duration: track.durationMs,
            },
            withCredentials: true,
          });
          result = { trackId: track.id, trackIndex: index, ...response.data };
        } catch (error) {
          if (error.response?.data?.quotaExceeded) {
            // Keep this track pending; quota exhaustion does not mean the song was unmatched.
            const pausedJob = {
              ...nextJob,
              isRunning: false,
              paused: true,
              resetAt: error.response.data.resetAt,
              nextIndex: index,
              error: "YouTube's daily search quota has been reached.",
            };
            updateJob(pausedJob);
            activeRun.current = false;
            return;
          }

          if (error.response?.data?.rateLimited && attempt < 3) {
            // A short rate limit can clear quickly, so retry with increasing waits before stopping.
            const waitMs = Math.max(500, Math.min(error.response.data.retryAfterMs ?? 2000, 30000));
            attempt += 1;
            await new Promise((resolve) => window.setTimeout(resolve, waitMs * attempt));
            continue;
          }

          const pendingJob = {
            ...nextJob,
            isRunning: false,
            paused: false,
            nextIndex: index,
            error: error.response?.data?.error || error.message || "YouTube search failed. Continue to retry this track.",
          };
          // A real request failure stays pending and does not inflate the unmatched count.
          updateJob(pendingJob);
          activeRun.current = false;
          return;
        }
      }

      const results = [...nextJob.results, result];
      nextJob = {
        ...nextJob,
        results,
        completed: index + 1,
        nextIndex: index + 1,
      };
      updateJob(nextJob);
    }

    updateJob({ ...nextJob, isRunning: false, paused: false, finished: true, nextIndex: nextJob.tracks.length });
    activeRun.current = false;
  }, [updateJob]);

  const searchYoutube = useCallback((tracks, playlistId) => {
    // Reuse saved results/progress when continuing this same playlist.
    const savedJob = job?.playlistId === playlistId ? job : null;
    return runMatching(tracks, playlistId, savedJob);
  }, [job, runMatching]);

  const resumeYoutube = useCallback(() => {
    if (!job?.paused || job.isRunning) return;
    if (job.resetAt && Date.now() < new Date(job.resetAt).getTime()) return;
    runMatching(job.tracks, job.playlistId, job);
  }, [job, runMatching]);

  return {
    youtubeResult: job?.results ?? [],
    matchingJob: job,
    searchYoutube,
    resumeYoutube,
  };
}
