import "dotenv/config";
import axios from "axios";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const searchVid = async(req,res)=>{
    try{
        const query = req.query.q;
        if(!query){
            return res.status(400).json({error:'Query parameter is required'})
        }

        const response = await axios.get('https://googleapis.com',{
            params: {
                part:'snippet',
                q:query,
                type:'video',
                maxResults:5,
                key:YOUTUBE_API_KEY
            }
        });

        const formattedVideos = response.data.items.map(item=>({
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