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
  onTestDownload,
  matchDisabled = false,
  findDisabled = false,
  testDownloadDisabled = false,
  testDownloadProgress = 0,
  isFindingSecondCandidate = false,
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
            <button
              type="button"
              className={`playlist-action test-download-action${testDownloadProgress > 0 && testDownloadProgress < 100 ? " is-downloading" : ""}`}
              onClick={onTestDownload}
              disabled={noTracks || testDownloadDisabled}
              title="Download the second track as a test"
            >
              {testDownloadProgress > 0 && testDownloadProgress < 100 && <span className="test-download-fill" style={{ width: `${testDownloadProgress}%` }} />}
              <span className="test-download-label">
                {isFindingSecondCandidate ? "Preparing #2…" : testDownloadProgress === 100 ? "Test saved" : testDownloadProgress > 0 ? `Test #2 ${testDownloadProgress}%` : "Test download #2"}
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
