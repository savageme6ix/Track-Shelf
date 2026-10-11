export default function AlbumCard({ src, title, subtitle, onImageLoad, isImported }) {
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
        {isImported && <span className="imported-check" aria-label="Playlist imported">✓</span>}
      </div>
    </section>
  );
}
