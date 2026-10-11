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
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`,{
      params: {
        //return only these three items
         fields: 'name,images,tracks.total'
    },
    headers: {
        'Authorization': `Bearer ${accessToken}`
    }
  });
    res.json(response.data)
  }catch(error){
    console.error('Error getting playlist:', error.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
}

export default getPlaylist