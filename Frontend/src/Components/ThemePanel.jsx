import { toHex } from '../utils/color';

export default function ThemePanel({ theme, tracks, isLoading, progress, youtubeResult, localChecks = {}, onDownload, downloadingTracks = {}, downloadProgress = {}, downloadErrors = {}, status, trackPage, setTrackPage }) {
  const { bg, accent, text, palette } = theme;
  const pageSize = 6;
  const pageCount = Math.ceil(tracks.length / pageSize);
  const firstTrackIndex = trackPage * pageSize;
  const visibleTracks = tracks.slice(firstTrackIndex, firstTrackIndex + pageSize);

  //resultsById turns the array into an object keyed by track id:
//   e.g {
//   abc: { trackId: "abc", bestMatch: {...}, confidence: 0.94, ... },
//   def: { trackId: "def", bestMatch: {...}, confidence: 0.6, ... },
// }
  // Let each displayed Spotify track find its saved match result by Spotify track ID.
  const resultsById = Object.fromEntries(
    (youtubeResult ?? []).map((r) => [r.trackId, r])
  );

  return (
    <aside className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">YOUR IMPORT</p>
          <h2>Tracks in the mix</h2>
        </div>
        {tracks.length > 0 && <span className="track-count">{tracks.length}</span>}
      </div>

      <div className="import-progress" aria-live="polite">
        <div className="progress-copy">
          <span>{isLoading ? 'Importing playlist' : 'Import progress'}</span>
          <span>{isLoading ? 'Working…' : `${progress}%`}</span>
        </div>
        <div
          className={`progress${isLoading ? ' is-loading' : ''}`}
          role="progressbar"
          aria-label="Playlist import progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={isLoading ? undefined : progress}
          aria-valuetext={isLoading ? status : `${progress}%`}
        >
          <span style={isLoading ? undefined : { width: `${progress}%` }} />
        </div>
        <p className="progress-status">{status}</p>
      </div>

      {visibleTracks.length > 0 ? (
        <div className="track-list">
          {visibleTracks.map((track, index) => {
            const match = resultsById[track.id];
            // Keep the same confidence bands as the progress box's final totals.
            const isMatched = match?.bestMatch && match.confidence >= 0.8;
            const possibleMatch = match?.bestMatch && match.confidence >= 0.4 && match.confidence < 0.8;
            const noMatch = match && (!match.bestMatch || match.confidence < 0.4);
            const localMatch = localChecks[track.id] ?? match?.localMatch;
            const youtubeCandidate = localMatch?.bestMatch ?? match?.bestMatch;
            const canDownload = localMatch && !localMatch.found && youtubeCandidate?.videoId;
            const trackDownloadProgress = downloadProgress[track.id] ?? 0;
            const isDownloading = Boolean(downloadingTracks[track.id]);

            return(
            <article className="track-item" key={`${track.id}-${firstTrackIndex + index}`}>
              {track.image ? (
                <img className="track-art" src={track.image} alt="" loading="lazy" />
              ) : (
                <div className="track-art track-art-empty" aria-hidden="true">♪</div>
              )}
              <div className="track-copy">
                <div className="track-title-row">
                  <h3 title={track.name}>{track.name}</h3>
                  {canDownload && (
                    <button
                      type="button"
                      className={`track-download-button${isDownloading ? " is-downloading" : ""}`}
                      onClick={() => onDownload(track, youtubeCandidate)}
                      disabled={isDownloading}
                      aria-label={isDownloading ? `Downloading ${track.name}: ${trackDownloadProgress}%` : `Download ${track.name} as audio`}
                    >
                      {isDownloading && <span className="track-download-fill" style={{ width: `${trackDownloadProgress}%` }} />}
                      <span className="track-download-label">
                        {isDownloading ? `Downloading ${trackDownloadProgress}%` : trackDownloadProgress === 100 ? "Saved" : "Download"}
                      </span>
                    </button>
                  )}
                </div>
                <p title={track.artist}>{track.artist} 
                  {isMatched && <span className="matched-badge"> · matched</span>}
                  {possibleMatch && <span className="possible-badge"> ·⚠️ possible match</span>}
                  {noMatch && <span className="no-badge"> · no match</span>}
                  {localMatch?.found && <span className="local-badge" title={localMatch.path}> · on this PC</span>}
                  {localMatch && !localMatch.found && (localMatch.bestMatch?.videoId ? (
                    <a
                      className="local-missing-badge"
                      href={`https://www.youtube.com/watch?v=${encodeURIComponent(localMatch.bestMatch.videoId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open YouTube candidate: ${localMatch.bestMatch.title}`}
                    >
                      · not in Music folder
                    </a>
                  ) : (
                    <span className="local-missing-badge"> · not in Music folder</span>
                  ))}
                </p>
                {downloadErrors[track.id] && <p className="track-download-error" role="alert" title={downloadErrors[track.id]}>{downloadErrors[track.id]}</p>}
              </div>
              <span className="track-index">{String(firstTrackIndex + index + 1).padStart(2, '0')}</span>
            </article>
            )
          })}
          {pageCount > 1 && (
            <nav className="track-pagination" aria-label="Track pages">
              <button
                type="button"
                onClick={() => setTrackPage((page) => page - 1)}
                disabled={trackPage === 0}
              >
                ← Previous
              </button>
              <span>
                {firstTrackIndex + 1}–{Math.min(firstTrackIndex + pageSize, tracks.length)} of {tracks.length}
              </span>
              <button
                type="button"
                onClick={() => setTrackPage((page) => page + 1)}
                disabled={trackPage >= pageCount - 1}
              >
                Next →
              </button>
            </nav>
          )}
        </div>
      ) : (
        <div className="empty-tracks">
          <span aria-hidden="true">♫</span>
          <p>Your imported tracks will appear here.</p>
        </div>
      )}

      <div className="theme-readout" aria-label="Extracted artwork colors">
        <div className="row">
          <span className="pill">BG: {toHex(bg)}</span>
          <span className="pill">Accent: {toHex(accent)}</span>
          <span className="pill">Text: {toHex(text)}</span>
        </div>
        <div className="palette">
          {palette.slice(0, 6).map((rgb, index) => (
            <div
              key={`${toHex(rgb)}-${index}`}
              className="swatch"
              title={toHex(rgb)}
              style={{ background: toHex(rgb) }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
