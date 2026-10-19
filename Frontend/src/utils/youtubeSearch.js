
import { useState } from "react";
import axios from "axios";

export default function useYoutubeSearch() {
  const [query, setQuery] = useState([]);
  const [youtubeResult, setYoutubeResult] = useState([]);

  async function searchYoutube(tracks) {
  setQuery(tracks.map((track) => `${track.name} ${track.artist}`));

  const resultsByTrack = [];

  for (const track of tracks) {
    try {
      const response = await axios.get("http://127.0.0.1:3000/api/youtube/search", {
        params: {
          name: track.name,
          artist: track.artist,
          duration: track.durationMs,
        },
        withCredentials: true,
      });

      resultsByTrack.push({ trackId: track.id, ...response.data });
    } catch (error) {
      console.error(`YouTube search failed for "${track.name}":`, error);
      resultsByTrack.push({ trackId: track.id, bestMatch: null, candidates: [], confidence: 0 });
    }
  }

  setYoutubeResult(resultsByTrack);
}

  return {
    query,
    youtubeResult,
    searchYoutube,
  };
}
