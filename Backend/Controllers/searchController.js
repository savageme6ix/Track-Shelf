import "dotenv/config";
import NodeCache from 'node-cache';
import { matchEngine } from "../Utils/matchEngine.js";
import axios from "axios";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
// Initialize Cache: Standard Time-To-Live (stdTTL) is 600 seconds (10 minutes)
const youtubeCache = new NodeCache({stdTTL:600,checkperiod:120});

function parseISO8601Duration(durationString) {
  const matches = durationString.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return null;

  const hours = matches[1] ? parseInt(matches[1]) : 0;
  const minutes = matches[2] ? parseInt(matches[2]) : 0;
  const seconds = matches[3] ? parseInt(matches[3]) : 0;

  return hours * 3600 + minutes * 60 + seconds;
}

const searchVid = async(req,res)=>{
    if(!YOUTUBE_API_KEY){
      return res.status(500).json({
        error:"Unaouthorized",
        message:"Missing Yt-API key"
        });
    }
    try{
        const {name,artist,duration} = req.query;

        if(!name || !artist || !Number.isFinite(Number(duration))){
            return res.status(400).json({error:'name and artist required'})
        }
        const query = `${name} ${artist}`;

        const durationSec = Math.round(Number(duration) / 1000); // Spotify duration_ms → seconds
        const spotifyTrack = {name,artist,durationSec}
        const cacheKey = `${name}|${artist}|${durationSec}`.toLowerCase();

        // 1. Check if the query results are already cached
    const cachedData = youtubeCache.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Serving results for: "${query}"`);
      return res.json({ source: 'cache', ...cachedData});
    }

    console.log(`[Cache Miss] Querying YouTube API for: "${query}"`);
        
        // 2. Perform the initial YouTube search
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search',{
            params: {
                part:'snippet',
                q:query,
                type:'video',
                maxResults:8,
                key:YOUTUBE_API_KEY
            }
        });

        const items = response.data.items || [];
        if(items.length === 0){
            return res.json({source:'api', ...matchEngine([],{name,artist,durationSec})});
        }

        //Extract videoIDs into a comma separated string "id1,id2,id3"
        const videoIds = items.map(item=>item.id.videoId).join(',');

        //request duration details from videos endpoint
        const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos',{
            params: {
                part:'contentDetails',
                id:videoIds,
                key:YOUTUBE_API_KEY
            }
        });

        // Create a quick lookup map of { videoId: duration }
        // Note: YouTube returns duration in ISO 8601 format (e.g., "PT14M32S" for 14m 32s)
        const durationMap = {};
        detailsResponse.data.items.forEach(item=>{
            durationMap[item.id]=item.contentDetails.duration;
        })

    // const durationMap = {
    //     "dQw4w9WgXcQ": "PT14M32S",
    //     "eBGIQ7ZuuiU": "PT4M12S"
    // };

        const formattedVideos = items.map(item=>{
            const id = item.id.videoId;
            return{
            videoId:id,
            title:item.snippet.title,
            channelTitle:item.snippet.channelTitle,
            thumbnail:item.snippet.thumbnails?.high.url?? null,
            durationSec:durationMap[id]?parseISO8601Duration(durationMap[id]) : null
            }
        });
        
        const bestCandidate = matchEngine(formattedVideos,spotifyTrack);

        // 6. Save the formatted result to cache for 10 minutes
        youtubeCache.set(cacheKey, bestCandidate);

        //send to client
        res.json({source: 'api', ...bestCandidate});
    }catch(error){
         console.error('API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
         error: 'Failed to fetch search results.',
         details: error.response?.data || error.message
     });
    }
}

export default searchVid;