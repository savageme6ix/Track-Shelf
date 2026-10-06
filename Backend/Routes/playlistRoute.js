import express from "express";
const router = express.Router();

router.post("/playlist", (req,res)=>{
    const data = req.body;
    if(!data.url){
        return res.status(400).json({error: "URL is required"})
    }
    
    // Strict Spotify Playlist URL Regex
    // 1. Must start with http:// or https:// and open.spotify.com/playlist/
    // 2. Captures exactly 22 alphanumeric characters (the exact length of a Spotify ID)
    // 3. Allows optional tracking parameters (?si=...) at the end, but ignores them
    const spotifyPlaylistRegex = /^https?:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]{22})(?:\?.*)?$/;

    const url = new URL(data.url);
    const match = url.match(spotifyPlaylistRegex);
    if(!match){
        return res.status(400).json({
            error: "Invalid URL. Please provide a valid open.spotify.com/playlist link." 
        })
    }
     const playlistId = match[1]; 

    res.status(200).json({
        message: "Data received succesfully",
        data: playlistId
    })
   
})

export default router;