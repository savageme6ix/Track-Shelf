import { useState } from "react";
import axios from "axios";
export default async function searchYoutube() {
  const [query, setQuery] = useState([]);
  const [youtubeResult, setYoutubeResult] = useState([]);
  
  // 1. Generate all search queries
  const queries = tracks.map(
    track => `${track.name} ${track.artist}`
  );

  // 2. Save those queries in React state
  setQuery(queries);

  try {
    // 3. Search YouTube for every query
    const results = await Promise.all(
        //we are using queries and not the query state because state migh take sometime to update
      queries.map(async (searchQuery) => {
        const response = await axios.get(
          `http://127.0.0.1:3000/api/youtube/search?q=${encodeURIComponent(searchQuery)}`,
          { withCredentials: true }
        );

        // 4. Return videos for this individual search
        return response.data?.videos ?? [];
      })
    );

    // 5. Combine all video arrays and save them in state
    setYoutubeResult(results.flat());

  } catch (error) {
    console.error("YouTube search failed:", error);
  }
}