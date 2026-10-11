import axios from 'axios';
import { getValidAccessToken } from '../Utils/spotifyAccessTokenChecker.js';
const getPlaylist = async(req, res) => {
  const submittedUrl = req.body?.url;

  if (typeof submittedUrl !== "string" || submittedUrl.trim() === "") {
    return res.status(400).json({ error: "A playlist URL is required." });
  }

  let playlistUrl;

  try {
    // URL parsing throws for malformed input, so handle that as a client error.
    playlistUrl = new URL(submittedUrl);
  } catch {
    return res.status(400).json({ error: "Please provide a valid Spotify playlist URL." });
  }

  // Check the actual parsed host and path; URL instances do not have String.match().
  //regex to check if the pathname follows spotifys structure
  const playlistPath = playlistUrl.pathname.match(/^\/playlist\/([a-zA-Z0-9]{22})/);
  const isSpotifyHost =
    playlistUrl.protocol === "https:" &&
    playlistUrl.hostname === "open.spotify.com" &&
    playlistUrl.port === "";

  if (!isSpotifyHost || !playlistPath) {
    return res.status(400).json({
      error: "Please provide a valid open.spotify.com playlist URL.",
    });
  }

  let playlistId = playlistPath[1];

  // Now, get the playlist using extracted ID
  try{
     const accessToken = await getValidAccessToken(req);
      // 1. Fetch Playlist Metadata (Name, Image, Total Count)
    const metaDataResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`,{
      params: {
        //return only these three items
         fields: 'name,images,tracks.total'
    },
    headers: {
        'Authorization': `Bearer ${accessToken}`
    }
  });

  // 2. Fetch Playlist Tracks (Track Names, Artist Names,and Track artwork)
  
  const tracksResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    // 1. Headers handle Authorization
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    // 2. Params handle configuration, filtering, and sizing
    params: {
      limit: 20, // Get up to 20 tracks at a time
      offset: 0, // Start at the very beginning of the playlist
      // This filters down the response to ONLY track names and artist names
      fields: 'items(track(name,artists(name),album(images)))'
    }
  });
    // 3. SEND ONE SINGLE RESPONSE combining all your collected data
    return res.json({
      playlistInfo: metaDataResponse.data,
      tracks: tracksResponse.data.items
    });
  }catch(error){
    console.error('Spotify API Fetch Error:', error.response?.data || error.message);
    // Prevents crashing if one of the network steps fails
    return res.status(500).json({ error: 'Failed to fetch playlist data from Spotify.' });
  }

}

export default getPlaylist