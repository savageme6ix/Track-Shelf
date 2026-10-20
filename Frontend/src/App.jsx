import { useState } from 'react';
import axios from 'axios';
import Header from './Components/Header';
import AlbumCard from './Components/AlbumsCard';
import ThemePanel from './Components/ThemePanel';
import MatchProgress from './Components/MatchProgress';
import { PLACEHOLDER_SRC } from './utils/placeholder';
import { useAlbumTheme } from './utils/useAlbumTheme';
import useYoutubeSearch from './utils/youtubeSearch';
import './index.css';

const API_BASE = 'http://127.0.0.1:3000/api/spotify';

function App() {
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Paste a Spotify playlist link to get started.');
  const [progress, setProgress] = useState(0);
  const [trackPage, setTrackPage] = useState(0);
  const [localChecks, setLocalChecks] = useState({});
  const [isCheckingLocal, setIsCheckingLocal] = useState(false);
  const [localCheckStatus, setLocalCheckStatus] = useState("");
  const { theme, processImage } = useAlbumTheme();
  const { matchingJob, searchYoutube, resumeYoutube } = useYoutubeSearch();
  // Never show a saved job's results beside a different playlist.
  const youtubeResult = playlist && matchingJob?.playlistId === playlist.id
    ? matchingJob.results
    : [];

  const importPlaylist = async (url) => {
    setIsLoading(true);
    setError('');
    setProgress(0);
    setTrackPage(0);
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
      setLocalChecks({});
      setLocalCheckStatus("");
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

  const findLocalFiles = async (firstOnly = false) => {
    if (!tracks.length || isCheckingLocal) return;
    setIsCheckingLocal(true);
    setLocalCheckStatus(firstOnly ? "Checking the first track…" : "Checking tracks against your Music folder…");
    const existingResults = Object.fromEntries((youtubeResult ?? []).map((result) => [result.trackId, result]));
    const tracksToCheck = firstOnly ? tracks.slice(0, 1) : tracks;
    let checkedCount = 0;

    try {
      for (const track of tracksToCheck) {
        let candidate = existingResults[track.id]?.bestMatch;
        if (!candidate) {
          const response = await axios.get("http://127.0.0.1:3000/api/youtube/search", {
            params: {
              name: track.name,
              artist: track.primaryArtist || track.artist,
              duration: track.durationMs,
            },
            withCredentials: true,
          });
          candidate = response.data?.bestMatch;
        }
        if (!candidate) {
          setLocalCheckStatus(`No YouTube best candidate was available for “${track.name}”.`);
          continue;
        }
        const response = await axios.post("http://127.0.0.1:3000/api/youtube/local-check", {
          bestMatch: candidate,
          spotifyTrack: { name: track.name, artist: track.primaryArtist || track.artist },
        });
        setLocalChecks((current) => ({ ...current, [track.id]: response.data.localMatch }));
        checkedCount += 1;
      }
      if (checkedCount > 0) {
        setLocalCheckStatus(firstOnly
          ? `Finished checking “${tracks[0].name}”.`
          : `Finished checking ${checkedCount} track${checkedCount === 1 ? "" : "s"}.`);
      }
    } catch (checkError) {
      setLocalCheckStatus(checkError.response?.data?.error || checkError.message || "Local music check failed.");
    } finally {
      setIsCheckingLocal(false);
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
        <div className="playlist-column">
          <AlbumCard
            src={playlistImage}
            tracks={tracks}
            title={playlist?.name || 'Your playlist'}
            subtitle={playlist ? `${playlist.totalTracks} total tracks` : 'Import a playlist to see its details'}
            onImageLoad={processImage}
            isImported={Boolean(playlist)}
            onMatch={() => {
              if (playlist && !matchingJob?.isRunning && matchingJob?.playlistId !== playlist.id) {
                searchYoutube(tracks, playlist.id);
              }
            }}
            onFind={() => findLocalFiles(false)}
            onTestFirst={() => findLocalFiles(true)}
            matchDisabled={matchingJob?.isRunning || matchingJob?.playlistId === playlist?.id || isCheckingLocal}
            findDisabled={isCheckingLocal || matchingJob?.isRunning}
          />
          {localCheckStatus && <p className="local-check-status" role="status" aria-live="polite">{localCheckStatus}</p>}
          {/* MatchProgress receives the saved job and the start/resume actions. */}
          <MatchProgress
            playlist={playlist}
            job={matchingJob}
            onStart={() => searchYoutube(tracks, playlist.id)}
            onResume={resumeYoutube}
          />
        </div>
        <ThemePanel
          theme={theme}
          tracks={tracks}
          youtubeResult={youtubeResult}
          localChecks={localChecks}
          isLoading={isLoading}
          progress={progress}
          status={status}
          trackPage={trackPage}
          setTrackPage={setTrackPage}
        />
      </div>

      <footer>
        Playlist artwork sets the ambient colors. Track details and artwork come from Spotify.
      </footer>
    </main>
  );
}

export default App;
