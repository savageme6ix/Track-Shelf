import Uploader from './Uploader';

export default function Header({ onImport, isLoading, error, onConnect }) {
  return (
    <header className="site-header">
      <div className="brand-copy">
        <h1>Track-Shelf</h1>
        <p>Bring a Spotify playlist into your music shelf.</p>
      </div>
      <div className="header-actions">
        <button className="connect-button" type="button" onClick={onConnect}>
          Connect to Spotify
        </button>
        <Uploader onImport={onImport} isLoading={isLoading} />
      </div>
      {error && <p className="import-error" role="alert">{error}</p>}
    </header>
  );
}
