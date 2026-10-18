import axios from "axios";
export default function AlbumCard({ src,tracks, title, subtitle, onImageLoad, isImported }) {
  async function searchYoutube(){
    let searchQuery = `${tracks[0].name} ${tracks[0].artist}`;
    try{
      const response = await axios.get(`http://127.0.0.1:3000/api/youtube/search?q=${encodeURIComponent(searchQuery)}`,
      {withCredentials:true}
    )
      const youtubeResult = response.data?.videos;
      if(!youtubeResult){
        throw new Error('The server returned an unexpected response.');
      }
      console.log(youtubeResult);
    }catch(error){
      console.log(error.status, error.message, "Error")
    }
  }
  return (
    <section className="card playlist-card">
      <img
        className="art"
        crossOrigin="anonymous"
        alt={isImported ? `${title} playlist artwork` : 'Playlist artwork preview'}
        src={src}
        onLoad={(e) => onImageLoad(e.currentTarget)}
      />
      {isImported && <span className="playlist-tag">SPOTIFY PLAYLIST</span>}
      <div className="meta">
        <div className="titles">
          <h2 className="artist">{title}</h2>
          <p className="subtitle">{subtitle}</p>
        </div>
        {isImported && <button className="imported-check" aria-label="Match to Youtube" onClick={searchYoutube}>Track</button>}
      </div>
    </section>
  );
}
