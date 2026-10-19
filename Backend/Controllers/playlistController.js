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
         fields: 'id,name,images,items.total'
    },
    headers: {
        'Authorization': `Bearer ${accessToken}`
    }
  });

  // 2. Fetch Playlist Tracks (Track Names, Artist Names,and Track artwork)
  const meta = metaDataResponse.data;
  const allItems = [];
  const limit = 20;
  let offset = 0;

while (offset < meta.items.total) {
  const response = await axios.get(
    `https://api.spotify.com/v1/playlists/${playlistId}/items`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        limit,
        offset,
        fields: 'items(item(id,name,duration_ms,artists(name),album(name,images)))',
      },
    }
  );

  const items = response.data.items ?? [];
  if (items.length === 0) break;

  allItems.push(...items);
  offset += items.length;
}

const playlist = {
  id: meta.id,
  name: meta.name,
  image: meta.images?.[0]?.url ?? null,
  totalTracks: meta.items?.total ?? 0
};

const tracks = allItems
  .filter(entry => entry.item) // removed or unavailable tracks can come back null
  .map(({ item }) => ({
    id: item.id,
    name: item.name,
    artist: item.artists.map(a => a.name).join(', '), //for display
    primaryArtist: item.artists[0]?.name ?? '',          // for matching so that if two artists are titled on a song matching wont bring any issues
    album: item.album.name,
    durationMs: item.duration_ms,
    image: item.album.images?.[0]?.url ?? null
  }));
    // 3. SEND ONE SINGLE RESPONSE combining all collected data
    return res.json({
      playlist: playlist,
      tracks: tracks
    });
  }catch(error){
    console.error('Spotify API Fetch Error:', error.response?.data || error.message);
    // Prevents crashing if one of the network steps fails
    return res.status(500).json({ error: 'Failed to fetch playlist data from Spotify.' });
  }

}

export default getPlaylist