TRACK SHELF
===========

Track Shelf is a local web application that helps you explore the tracks in a Spotify playlist. It imports playlist details, finds likely YouTube matches for each track, checks whether a track is already in a local music library, and builds a color theme from the playlist artwork.

The project uses React and Vite for the frontend and Node.js with Express for the backend. Spotify provides playlist and track information. YouTube search results are ranked by a matching heuristic, and cached locally to reduce repeat API requests.

FEATURES
--------

* Connect a Spotify account using OAuth.
* Import a playlist from its Spotify URL.
* Browse playlist tracks, artists, albums, durations, and artwork.
* Search YouTube for candidate videos for each track.
* Rank candidates using title, artist, channel, and duration similarities.
* Resume track matching after a page reload.
* Pause and resume matching when the YouTube daily API quota is reached.
* Check a local music folder for existing tracks using filenames and folder names.
* Create an ambient color palette from the playlist cover artwork.

HOW IT WORKS
------------

1. The user connects Spotify. The backend starts the OAuth flow, checks its state value on return, and keeps access and refresh tokens in the server-side session.
2. The user submits a Spotify playlist URL. The backend validates that it is a Spotify playlist link, fetches playlist information, and retrieves tracks in pages.
3. The frontend displays the playlist and its tracks. The cover image is sampled in the browser to select background, accent, and text colors.
4. When matching starts, the frontend requests a YouTube search for each track in sequence. Sequential requests limit bursts of API traffic and allow the job to resume at the track where it stopped.
5. The backend checks its seven-day JSON cache. If a result is not cached, it queries the YouTube Data API, retrieves video durations, and scores the candidates.
6. Candidate scoring considers title, artist, channel, and duration similarities. It penalizes common alternate versions such as live performances, remixes, covers, karaoke, slowed, sped-up, and instrumental versions unless the Spotify title itself indicates one of those versions. Scores help rank results but are heuristic and do not guarantee an exact recording match.
7. The local library check scans the configured music folder and compares normalized words in candidate and Spotify metadata with audio filenames and folder names. The scan recognizes MP3, M4A, AAC, FLAC, WAV, OGG, OPUS, WMA, and AIFF files. The index is reused for one minute to avoid rescanning for every track.

PROJECT STRUCTURE
-----------------

Backend/
  Controllers/   Spotify playlist, OAuth, and YouTube search request logic
  Routes/        Express API route declarations
  Utils/         Spotify token refresh, matching, cache, and local library logic
  index.js       Express setup, middleware, route mounting, and startup

Frontend/
  src/Components/  Playlist, track list, matching progress, and theme UI
  src/utils/       YouTube matching state and artwork color analysis
  src/App.jsx      Main application state and frontend/backend coordination

REQUIREMENTS
------------

* Node.js and npm compatible with the installed Vite version.
* A Spotify developer application with a client ID and client secret.
* A YouTube Data API key with YouTube Data API v3 access to search and video details.

LOCAL DEVELOPMENT
-----------------

Install dependencies for both applications:

  cd Backend
  npm install
  cd ../Frontend
  npm install

Create Backend/.env with the following values:

  SPOTIFY_CLIENT_ID=your_spotify_client_id
  SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
  SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
  SESSION_SECRET=replace_with_a_long_random_secret
  YOUTUBE_API_KEY=your_youtube_data_api_key
  MUSIC_LIBRARY_PATH=C:\Users\you\Music

MUSIC_LIBRARY_PATH is optional. When omitted, Track Shelf checks the operating system user's Music folder. Keep API credentials and session secrets in the backend environment; do not expose them in frontend code or commit the .env file.

Add the exact SPOTIFY_REDIRECT_URI value to the redirect URI allowlist in the Spotify developer dashboard.

Run the backend and frontend in separate terminals:

  cd Backend
  npm run dev

  cd Frontend
  npm run dev

Open http://127.0.0.1:5173 in a browser. The backend runs at http://127.0.0.1:3000. Both addresses and the CORS origin are currently configured for local development.

CONFIGURATION NOTES
-------------------

* The backend reads its .env file from its working directory, so start it from Backend/.
* The Spotify client secret and YouTube API key are backend-only credentials.
* Spotify tokens are kept in the Express session and are not stored in browser local storage.
* YouTube match progress is saved in browser local storage so an interrupted job can be resumed.
* YouTube search results are cached in Backend/cache/youtube-cache.json. Entries expire individually after seven days.
* The local library scan only reads files from the configured music directory; it does not upload or modify them.
* The current URLs, port, and CORS origin are set for local development. A deployment would need configurable frontend/backend URLs, production session storage, secure cookies, and updated OAuth redirect settings.

AVAILABLE SCRIPTS
-----------------

Frontend:
  npm run dev      Start the Vite development server.
  npm run build    Build the frontend for production.
  npm run preview  Preview a production build locally.
  npm run lint     Run ESLint.

Backend:
  npm run dev      Start the Express server with Nodemon.
  npm test         Placeholder script; no backend automated test suite is configured yet.

KNOWN LIMITATIONS
-----------------

* YouTube matching is based on text and duration heuristics; candidates should be reviewed when exact versions matter.
* Daily YouTube API quota limits can pause matching until the next quota reset.
* Local library checks depend on filenames and folder names containing enough title or artist information.
* The local file index is cached for one minute, so changes to the music folder may not appear immediately.
* The backend is configured for local development and does not yet have production deployment settings.
* The backend package does not yet have an automated test suite.
