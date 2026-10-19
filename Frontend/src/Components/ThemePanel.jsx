import { toHex } from '../utils/color';

export default function ThemePanel({ theme, tracks, isLoading, progress, youtubeResult,status, trackPage, setTrackPage }) {
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
            const isMatched = match?.bestMatch && match.confidence >= 0.8;
            const possibleMatch = match?.bestMatch && match.confidence >= 0.4 && match.confidence < 0.8;
            const noMatch = match?.bestMatch && match.confidence < 0.4;

            <article className="track-item" key={`${track.id}-${firstTrackIndex + index}`}>
              {track.image ? (
                <img className="track-art" src={track.image} alt="" loading="lazy" />
              ) : (
                <div className="track-art track-art-empty" aria-hidden="true">♪</div>
              )}
              <div className="track-copy">
                <h3 title={track.name}>{track.name}</h3>
                <p title={track.artist}>{track.artist} 
                  {isMatched && <span className="matched-badge"> · matched</span>}
                  {possibleMatch && <span className="possible-badge"> ·⚠️ possible match</span>}
                  {noMatch && <span className="no-badge"> · no match</span>}
                </p>
              </div>
              <span className="track-index">{String(firstTrackIndex + index + 1).padStart(2, '0')}</span>
            </article>
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
