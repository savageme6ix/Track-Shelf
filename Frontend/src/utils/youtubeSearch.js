import { useCallback, useRef, useState } from "react";
import axios from "axios";

const STORAGE_KEY = "track-shelf.matching-job.v1";

function readSavedJob() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.isRunning) {
      saved.isRunning = false;
      saved.nextIndex = saved.completed;
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
  const activeRun = useRef(false);

  const updateJob = useCallback((nextJob) => {
    setJob(nextJob);
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

    for (let index = nextJob.nextIndex; index < nextJob.tracks.length; index += 1) {
      const track = nextJob.tracks[index];
      let result;

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

        result = {
          trackId: track.id,
          trackIndex: index,
          bestMatch: null,
          candidates: [],
          confidence: 0,
          requestError: error.response?.data?.error || error.message,
        };
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
