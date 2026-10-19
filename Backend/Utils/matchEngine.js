const matchOutput = [{
    track:
    c
}]
let finalScore = 0;
let artistNameScore = 10;
let channelNameScore = 10;
let titleNameScore = 10;
let durationScore = 5;
function matchEngine(formattedVideos,artist,name,duration){
    
    for(const video of formattedVideos){
        const spotifyArtistName = artist;
        const spotifyTitleName = name;
        const spotifyDuration = duration;
        const title = video.title;
        const channelTitle = video.channelTitle;
        const ytduration = video.duration;
        
    }
}