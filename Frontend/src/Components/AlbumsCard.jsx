import axios from "axios";
import { useState } from "react";
export default function AlbumCard({
  src,
  tracks,
  title,
  subtitle,
  onImageLoad,
  isImported,
}) {
  const noTracks = !tracks || tracks.length === 0;
  const [query, setQuery] = useState([""]);
  const [youtubeResult,setYoutubeResult] = useState([]);
  async function searchYoutube() {
    //generating a query for every track
    while (query.length !== tracks.length) {
      tracks.forEach((track)=>{
        setQuery(`${track.name} ${track.artist}`);
      })
    }
    //Do a search for each generated query
    query.forEach(async (query)=>{
      try {
        const response = await axios.get(
          `http://127.0.0.1:3000/api/youtube/search?q=${encodeURIComponent(query)}`,
          { withCredentials: true },
        );
         setYoutubeResult(response.data?.videos);
        if (!youtubeResult) {
          throw new Error("The server returned an unexpected response.");
        }
        console.log(youtubeResult);
      } catch (error) {
        console.log(error.status, error.message, "Error");
      }
    })
      
  }
  return (
    <section className="card playlist-card">
      <img
        className="art"
        crossOrigin="anonymous"
        alt={
          isImported ? `${title} playlist artwork` : "Playlist artwork preview"
        }
        src={src}
        onLoad={(e) => onImageLoad(e.currentTarget)}
      />
      {isImported && <span className="playlist-tag">SPOTIFY PLAYLIST</span>}
      <div className="meta">
        <div className="titles">
          <h2 className="artist">{title}</h2>
          <p className="subtitle">{subtitle}</p>
        </div>
        {isImported && (
          <button
            className="imported-check"
            aria-label="Match to Youtube"
            onClick={searchYoutube}
            disabled={noTracks}
          >
            Track
          </button>
        )}
      </div>
    </section>
  );
}
