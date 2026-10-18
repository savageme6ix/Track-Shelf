import "dotenv/config";
import NodeCache from 'node-cache';
import axios from "axios";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
// Initialize Cache: Standard Time-To-Live (stdTTL) is 600 seconds (10 minutes)
const youtubeCache = new NodeCache({stdTTL:600,checkperiod:120});

const searchVid = async(req,res)=>{
    try{
        const query = req.query.q;
        if(!query){
            return res.status(400).json({error:'Query parameter is required'})
        }

        // 1. Check if the query results are already cached
    const cachedData = youtubeCache.get(query);
    if (cachedData) {
      console.log(`[Cache Hit] Serving results for: "${query}"`);
      return res.json({ source: 'cache', videos: cachedData });
    }

    console.log(`[Cache Miss] Querying YouTube API for: "${query}"`);
        
        // 2. Perform the initial YouTube search
        const response = await axios.get('https://googleapis.com',{
            params: {
                part:'snippet',
                q:query,
                type:'video',
                maxResults:5,
                key:YOUTUBE_API_KEY
            }
        });

        const items = response.data.items || [];
        if(items.length === 0){
            return res.json({source:'api', videos:[]});
        }

        const formattedVideos = items.map(item=>({
            videoId:item.id.videoId,
            title:item.snippet.title,
            channelTitle:item.snippet.channelTitle,
            thumbnail:item.snippet.thumbnails.high.url
        }));

        //send to client
        res.json({videos:formattedVideos});
    }catch(err){

    }
}