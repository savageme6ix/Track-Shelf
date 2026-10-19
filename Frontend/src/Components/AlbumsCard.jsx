export default function AlbumCard({
  src,
  tracks,
  title,
  subtitle,
  onImageLoad,
  isImported,
  onMatch,
  matchDisabled = false,
}) {
  const noTracks = !tracks || tracks.length === 0;
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
            onClick={onMatch}
            disabled={noTracks || matchDisabled}
          >
            Match
          </button>
        )}
      </div>
    </section>
  );
}
