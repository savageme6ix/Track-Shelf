import "dotenv/config";
import { getCached, setCached } from "../Utils/fileCache.js";
import { matchEngine } from "../Utils/matchEngine.js";
import { findLocalTrack } from "../Utils/localMusicLibrary.js";
import axios from "axios";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

function nextQuotaResetAt() {
  // YouTube daily quotas reset at midnight Pacific; the UI converts this instant to Nairobi time.
  const timeZone = "America/Los_Angeles";
  const dateKey = (date) => new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => part.value).join("-");
  const now = Date.now();
  const today = dateKey(new Date(now));
  let low = now;
  let high = now + 36 * 60 * 60 * 1000;

  while (dateKey(new Date(high)) === today) high += 12 * 60 * 60 * 1000;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    if (dateKey(new Date(middle)) === today) low = middle;
    else high = middle;
  }
  return new Date(high).toISOString();
}

function isDailyQuotaError(error) {
  // Google has returned both reason codes and RESOURCE_EXHAUSTED daily-limit messages.
  const googleError = error.response?.data?.error;
  const reasons = googleError?.errors?.map((item) => item.reason) ?? [];
  const message = googleError?.message ?? "";
  return reasons.some((reason) => ["quotaExceeded", "dailyLimitExceeded"].includes(reason)) ||
    /quota exceeded[\s\S]*(?:per day|daily)/i.test(message);
}

function isRateLimitError(error) {
  const reasons = error.response?.data?.error?.errors?.map((item) => item.reason) ?? [];
  return reasons.some((reason) => ["rateLimitExceeded", "userRateLimitExceeded", "servingLimitExceeded"].includes(reason));
}

function getRetryAfterMs(error) {
  const seconds = Number(error.response?.headers?.["retry-after"]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 2000;
}

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

        // Reuse a previous match before spending another YouTube search request.
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Serving results for: "${query}"`);
      const localMatch = await findLocalTrack(cachedData.bestMatch, spotifyTrack);
      return res.json({ source: 'cache', ...cachedData, localMatch });
    }

    console.log(`[Cache Miss] Querying YouTube API for: "${query}"`);
        
        // Search gives candidate titles/channels; videos.list below supplies durations for scoring.
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
        const localMatch = await findLocalTrack(bestCandidate.bestMatch, spotifyTrack);

        // Only successful search results are cached; API errors remain retryable.
        await setCached(cacheKey, bestCandidate);

        //send to client
        res.json({source: 'api', ...bestCandidate, localMatch});
    }catch(error){
         console.error('API Error:', error.response?.data || error.message);
        if (isDailyQuotaError(error)) {
          return res.status(429).json({
            error: "YouTube daily quota reached.",
            quotaExceeded: true,
            resetAt: nextQuotaResetAt(),
          });
        }
        if (error.response?.status === 429 || isRateLimitError(error)) {
          return res.status(429).json({
            error: "YouTube is temporarily rate limiting requests.",
            rateLimited: true,
            retryAfterMs: getRetryAfterMs(error),
          });
        }
        res.status(error.response?.status || 500).json({
         error: 'Failed to fetch search results.',
         details: error.response?.data || error.message
     });
    }
}

export default searchVid;
