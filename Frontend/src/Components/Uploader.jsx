import { useState } from 'react';

export default function Uploader({ onImport, isLoading }) {
  const [playlistUrl, setPlaylistUrl] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const url = playlistUrl.trim();
    if (!url || isLoading) return;

    const imported = await onImport(url);
    if (imported) setPlaylistUrl('');
  };

  return (
    <form className="uploader" onSubmit={submit}>
      <label className="sr-only" htmlFor="playlist-url">Spotify playlist URL</label>
      <input
        id="playlist-url"
        type="url"
        placeholder="Paste a Spotify playlist link"
        className="idInputter"
        value={playlistUrl}
        onChange={(event) => setPlaylistUrl(event.target.value)}
        required
      />
      <button className="importButton" type="submit" disabled={isLoading || !playlistUrl.trim()}>
        {isLoading ? 'Importing…' : 'Import playlist'}
      </button>
    </form>
  );
}
