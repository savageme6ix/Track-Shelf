import { useRef, useState } from 'react';
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
const DOWNLOAD_TIMEOUT_MS = 8 * 60 * 1000;

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
  const [downloadingTracks, setDownloadingTracks] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadErrors, setDownloadErrors] = useState({});
  const [downloadAll, setDownloadAll] = useState({ active: false, total: 0, completed: 0, currentTrackId: null });
  const cancelDownloadAllRef = useRef(false);
  const currentDownloadJobIdRef = useRef(null);
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
      setDownloadingTracks({});
      setDownloadProgress({});
      setDownloadErrors({});
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

  const findLocalFiles = async () => {
    if (!tracks.length || isCheckingLocal) return;
    setIsCheckingLocal(true);
    setLocalCheckStatus(`Checking ${tracks.length} tracks against your Music folder…`);
    const existingResults = Object.fromEntries((youtubeResult ?? []).map((result) => [result.trackId, result]));
    let checkedCount = 0;
    let noCandidateCount = 0;
    let failedCount = 0;
    const failedTrackNames = [];
    let quotaStoppedAt = null;
    let quotaResetAt = null;

    try {
      for (let trackIndex = 0; trackIndex < tracks.length; trackIndex += 1) {
        const track = tracks[trackIndex];
        setLocalCheckStatus(`Checking track ${trackIndex + 1} of ${tracks.length}: “${track.name}”…`);
        try {
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
            noCandidateCount += 1;
            continue;
          }

          const response = await axios.post("http://127.0.0.1:3000/api/youtube/local-check", {
            bestMatch: candidate,
            spotifyTrack: { name: track.name, artist: track.primaryArtist || track.artist },
          });
          if (!response.data?.localMatch) throw new Error("The local music check returned an unexpected response.");

          setLocalChecks((current) => ({
            ...current,
            [track.id]: { ...response.data.localMatch, bestMatch: candidate },
          }));
          checkedCount += 1;
        } catch (trackError) {
          if (trackError.response?.data?.quotaExceeded) {
            quotaStoppedAt = track.name;
            quotaResetAt = trackError.response.data.resetAt ?? null;
            break;
          }
          failedCount += 1;
          failedTrackNames.push(track.name);
          console.warn(`Local music check failed for “${track.name}”; continuing with the next track.`, trackError);
        }
      }
      const summary = [`Finished checking ${checkedCount} track${checkedCount === 1 ? "" : "s"}`];
      if (noCandidateCount) summary.push(`${noCandidateCount} had no YouTube candidate`);
      if (failedCount) summary.push(`${failedCount} could not be checked (${failedTrackNames.slice(0, 3).join(", ")}${failedTrackNames.length > 3 ? ", …" : ""})`);
      if (quotaStoppedAt) {
        const resetText = quotaResetAt ? ` YouTube quota resets at ${new Date(quotaResetAt).toLocaleString()}.` : "";
        setLocalCheckStatus(`Stopped at “${quotaStoppedAt}” because YouTube’s daily quota was reached. Checked ${checkedCount} tracks before the limit.${resetText}`);
        return;
      }
      setLocalCheckStatus(`${summary.join(" · ")}.`);
    } finally {
      setIsCheckingLocal(false);
    }
  };

  const downloadTrackAudio = async (track, candidate) => {
    if (!candidate?.videoId || downloadingTracks[track.id]) return false;
    setDownloadingTracks((current) => ({ ...current, [track.id]: true }));
    setDownloadProgress((current) => ({ ...current, [track.id]: 2 }));
    setDownloadErrors((current) => ({ ...current, [track.id]: "" }));

    try {
      const deadline = Date.now() + DOWNLOAD_TIMEOUT_MS;
      const youtubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(candidate.videoId)}`;
      const response = await axios.post("http://127.0.0.1:3000/api/download-audio", {
        url: youtubeUrl,
        spotifyTrack: { name: track.name, artist: track.artist, album: track.album },
        bestCandidate: candidate,
      }, { timeout: DOWNLOAD_TIMEOUT_MS });
      const jobId = response.data?.jobId;
      if (!jobId) throw new Error("The download service did not return a job ID.");
      currentDownloadJobIdRef.current = jobId;
      if (cancelDownloadAllRef.current) {
        await axios.post(`http://127.0.0.1:3000/api/download-audio/${encodeURIComponent(jobId)}/cancel`);
      }

      let jobStatus;
      do {
        if (Date.now() >= deadline) {
          throw new Error("Download timed out after 8 minutes. You can try again.");
        }
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        if (Date.now() >= deadline) {
          throw new Error("Download timed out after 8 minutes. You can try again.");
        }
        const progressResponse = await axios.get(
          `http://127.0.0.1:3000/api/download-audio/${encodeURIComponent(jobId)}`,
          { timeout: Math.max(1, deadline - Date.now()) }
        );
        jobStatus = progressResponse.data;
        setDownloadProgress((current) => ({ ...current, [track.id]: jobStatus.progress ?? 0 }));
        if (jobStatus.status === "canceled") return false;
        if (jobStatus.status === "failed") throw new Error(jobStatus.message || "Audio download failed.");
      } while (jobStatus.status !== "complete");
      return true;
    } catch (downloadError) {
      if (cancelDownloadAllRef.current) return false;
      const message = downloadError.response?.data?.message || downloadError.message || "Audio download failed. Try again.";
      setDownloadProgress((current) => ({ ...current, [track.id]: 0 }));
      setDownloadErrors((current) => ({ ...current, [track.id]: message }));
      return false;
    } finally {
      currentDownloadJobIdRef.current = null;
      setDownloadingTracks((current) => ({ ...current, [track.id]: false }));
    }
  };

  const downloadAllTracks = async () => {
    if (downloadAll.active || !tracks.length || Object.values(downloadingTracks).some(Boolean)) return;
    const matchesById = Object.fromEntries((youtubeResult ?? []).map((result) => [result.trackId, result]));
    const queue = tracks.flatMap((track) => {
      const localCheck = localChecks[track.id];
      const candidate = localCheck?.bestMatch ?? matchesById[track.id]?.bestMatch;
      if (!localCheck || localCheck.found || !candidate?.videoId || downloadProgress[track.id] === 100) return [];
      return [{ track, candidate }];
    });
    if (!queue.length) return;

    cancelDownloadAllRef.current = false;
    setDownloadAll({ active: true, total: queue.length, completed: 0, currentTrackId: null });
    for (const { track, candidate } of queue) {
      if (cancelDownloadAllRef.current) break;
      setDownloadAll((current) => ({ ...current, currentTrackId: track.id }));
      await downloadTrackAudio(track, candidate);
      if (cancelDownloadAllRef.current) break;
      setDownloadAll((current) => ({ ...current, completed: current.completed + 1 }));
    }
    setDownloadAll((current) => ({ ...current, active: false, currentTrackId: null }));
    cancelDownloadAllRef.current = false;
  };

  const cancelDownloadAll = async () => {
    if (!downloadAll.active) return;
    cancelDownloadAllRef.current = true;
    const jobId = currentDownloadJobIdRef.current;
    if (jobId) {
      try {
        await axios.post(`http://127.0.0.1:3000/api/download-audio/${encodeURIComponent(jobId)}/cancel`);
      } catch (cancelError) {
        console.warn("Could not cancel the active audio download:", cancelError.message);
      }
    }
  };

  const downloadQueueProgress = downloadAll.total
    ? Math.min(100, Math.round(((downloadAll.completed + (downloadAll.currentTrackId ? (downloadProgress[downloadAll.currentTrackId] ?? 0) / 100 : 0)) / downloadAll.total) * 100))
    : 0;

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
            onFind={findLocalFiles}
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
          onDownload={downloadTrackAudio}
          downloadingTracks={downloadingTracks}
          downloadProgress={downloadProgress}
          downloadErrors={downloadErrors}
          downloadAll={downloadAll}
          downloadQueueProgress={downloadQueueProgress}
          onDownloadAll={downloadAllTracks}
          onCancelDownloadAll={cancelDownloadAll}
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
