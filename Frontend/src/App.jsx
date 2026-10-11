import { useState } from 'react';
import axios from 'axios';
import Header from './Components/Header';
import AlbumCard from './Components/AlbumsCard';
import ThemePanel from './Components/ThemePanel';
import { PLACEHOLDER_SRC } from './utils/placeholder';
import { useAlbumTheme } from './utils/useAlbumTheme';
import './index.css';

const API_BASE = 'http://127.0.0.1:3000/api/spotify';

function App() {
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Paste a Spotify playlist link to get started.');
  const [progress, setProgress] = useState(0);
  const { theme, processImage } = useAlbumTheme();

  const importPlaylist = async (url) => {
    setIsLoading(true);
    setError('');
    setProgress(0);
    setStatus('Fetching playlist details and tracks…');

    try {
      const response = await axios.post(
        `${API_BASE}/playlist`,
        { url },
        { withCredentials: true }
      );

      const importedPlaylist = response.data?.playlist;
      const importedTracks = response.data?.tracks;
      if (!importedPlaylist || !Array.isArray(importedTracks)) {
        throw new Error('The server returned an unexpected playlist response.');
      }

      setPlaylist(importedPlaylist);
      setTracks(importedTracks);
      setProgress(100);
      setStatus(`Loaded ${importedTracks.length} tracks from “${importedPlaylist.name}”.`);
      return true;
    } catch (requestError) {
      const statusCode = requestError.response?.status;
      const message = requestError.response?.data?.error;
      if (statusCode === 401) {
        setError('Connect your Spotify account first, then import the playlist again.');
      } else {
        setError(message || requestError.message || 'Playlist import failed. Check the link and try again.');
      }
      setStatus('Import could not be completed.');
      setProgress(0);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const playlistImage = playlist?.image || PLACEHOLDER_SRC;

  return (
    <main className="wrap">
      <Header
        onImport={importPlaylist}
        isLoading={isLoading}
        error={error}
        onConnect={() => window.location.assign(`${API_BASE}/login`)}
      />

      <p className="import-status" role="status" aria-live="polite">
        {isLoading && <span className="loading-dot" aria-hidden="true" />}
        {status}
      </p>

      <div className="grid">
        <AlbumCard
          src={playlistImage}
          title={playlist?.name || 'Your playlist'}
          subtitle={playlist ? `${playlist.totalTracks} total tracks` : 'Import a playlist to see its details'}
          onImageLoad={processImage}
          isImported={Boolean(playlist)}
        />
        <ThemePanel
          theme={theme}
          tracks={tracks}
          isLoading={isLoading}
          progress={progress}
          status={status}
        />
      </div>

      <footer>
        Playlist artwork sets the ambient colors. Track details and artwork come from Spotify.
      </footer>
    </main>
  );
}

export default App;
