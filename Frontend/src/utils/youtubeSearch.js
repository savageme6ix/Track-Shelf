
import { useState } from "react";
import axios from "axios";

export default function useYoutubeSearch() {
  const [query, setQuery] = useState([]);
  const [youtubeResult, setYoutubeResult] = useState([]);

  async function searchYoutube(tracks) {
    const queries = tracks.map(
      track => `${track.name} ${track.artist}`
    );

    setQuery(queries);

    try {
      const results = await Promise.all(
        queries.map(async (searchQuery) => {
          const response = await axios.get(
            `http://127.0.0.1:3000/api/youtube/search?q=${encodeURIComponent(searchQuery)}`,
            { withCredentials: true }
          );

          return response.data?.videos ?? [];
        })
      );

      setYoutubeResult(results.flat());
    } catch (error) {
      console.error("YouTube search failed:", error);
    }
  }

  return {
    query,
    youtubeResult,
    searchYoutube
  };
}
