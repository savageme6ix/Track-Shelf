export default function AlbumCard({
  src,
  tracks,
  title,
  subtitle,
  onImageLoad,
  isImported,
  onMatch,
  onFind,
  onTestFirst,
  matchDisabled = false,
  findDisabled = false,
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
          <div className="playlist-actions">
            <button type="button" className="playlist-action" onClick={onMatch} disabled={noTracks || matchDisabled}>
              Match
            </button>
            <button type="button" className="playlist-action find-action" onClick={onFind} disabled={noTracks || findDisabled}>
              Find
            </button>
            <button type="button" className="playlist-action test-first-action" onClick={onTestFirst} disabled={noTracks || findDisabled}>
              Test first
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
