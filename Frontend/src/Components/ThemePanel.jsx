import { toHex } from '../utils/color';

export default function ThemePanel({ theme, tracks, isLoading, progress, status }) {
  const { bg, accent, text, palette } = theme;
  const visibleTracks = tracks.slice(0, 6);

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
          {visibleTracks.map((track, index) => (
            <article className="track-item" key={`${track.id}-${index}`}>
              {track.image ? (
                <img className="track-art" src={track.image} alt="" loading="lazy" />
              ) : (
                <div className="track-art track-art-empty" aria-hidden="true">♪</div>
              )}
              <div className="track-copy">
                <h3 title={track.name}>{track.name}</h3>
                <p title={track.artist}>{track.artist}</p>
              </div>
              <span className="track-index">{String(index + 1).padStart(2, '0')}</span>
            </article>
          ))}
          {tracks.length > visibleTracks.length && (
            <p className="more-tracks">+ {tracks.length - visibleTracks.length} more loaded tracks</p>
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
