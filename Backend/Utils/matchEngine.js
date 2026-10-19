const matchOutput = [{
    
}]
let finalScore = 0;
let artistNameScore = 10;
let channelNameScore = 10;
let titleNameScore = 10;
let durationScore = 5;

function msToMinsSec(duration){
   let mins = duration/60;
   let secs = duration%60;
   return `${mins} : ${secs}`
}

function matchEngine(formattedVideos,artist,name,duration){
    
    for(const video of formattedVideos){
        const spotifyArtistName = artist;
        const spotifyTitleName = name;
        const spotifyDuration = msToMinsSec(duration);
        const title = video.title;
        const channelTitle = video.channelTitle;
        const ytduration = video.duration;

        // artist name title
        if(channelTitle === spotifyArtistName){
            finalScore = artistNameScore
        }else if(channelTitle !== spotifyArtistName){
            finalScore = artistNameScore - 5
        }

        //song title
        if(title === spotifyTitleName && ){
            finalScore += titleNameScore
        }else if(title !== titleNameScore){
            finalScore -= 5
        }

        //duration
        if(ytduration === spotifyDuration){
            finalScore += durationScore
        }else{
            finalScore -= durationScore-2
        }

    }


}