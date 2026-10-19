const normalize = (s="")=>
    s.toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, "")   // drop (Official Video), [Lyrics], etc.
        .replace(/[^\p{L}\p{N}\s]/gu, "")  // strip punctuation
        .replace(/\s+/g, " ")
        .trim();

const BAD_WORDS = ["live", "remix", "cover", "karaoke", "slowed", "reverb", "sped up", "instrumental"];

const MAX_SCORE = 10+10+10+5;

function scoreVideo(video,{name,artist,durationSec}){
    const title = normalize(video.title);
    const channel = normalize(video.channelTitle);
    const spName = normalize(name);
    const spArtist = normalize(artist);

    let score = 0;

    if(title.includes(spName)) score += 10;
    if(title.includes(spArtist)) score += 10;
    if(channel.includes(spArtist)) score += 10;

    //duration: full points within 3s, partial within 10s
    if(video.durationSec != null){
    const diff = Math.abs(video.durationSec - durationSec);
    if(diff<=3) score += 5;
    else if(diff<= 10) score +=2;
    }

    //penalize unwanted versions, unless the spotify track itself has that word
    for(const word of BAD_WORDS){
        if(title.includes(word) && !spName.includes(word)) score-=5;

    }

    return Math.max(score,0);
}

export function matchEngine(formattedVideos,spotifyTrack){
    const candidates = formattedVideos.map((video)=>{
        const score = scoreVideo(video,spotifyTrack);
        return{...video,score,confidence: +(score/MAX_SCORE).toFixed(2)}
    })
    .sort((a,b) => b.score - a.score);

    const bestMatch = candidates[0] ?? null;

    return{
        spotifyTrack,
        candidates,
        bestMatch,
        confidence: bestMatch ? bestMatch.confidence : 0,
    };
}

