import "dotenv/config";
import querystring from 'node:querystring';
const callback = async(req, res)=> {

  var code = req.query.code || null;
  var state = req.query.state;
  let client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  var client_id = process.env.SPOTIFY_CLIENT_ID;
  let error = req.query.error;
  
  // 1. Handle Denied Authorization or Missing Code immediately
  if (error || !code) {
    console.error("Spotify Authorization Denied or Code Missing:", error);
    
    // Clean up the temporary state from the session
    delete req.session.spotifyState;

    return res.redirect('/#' + 
      querystring.stringify({
        error: error || 'missing_authorization_code'
      })
    );
  }

  if (req.query.state !== req.session.spotifyState) {
  // 1. Destroy the session on the server
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      // Even if it fails, you likely still want to redirect the user
    }

    // 2. Clear the cookie on the client browser
    res.clearCookie('connect.sid'); 

    // 3. Redirect the user now that the session is wiped
    return res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      })
    );
  });
   return; // Stop execution here since session.destroy is asynchronous
} try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  }),
});

const tokenData = await tokenResponse.json();

if (!tokenResponse.ok) {
  console.error("Spotify token exchange failed:", tokenData);
  return res.status(502).send("Spotify token exchange failed.");
}

req.session.spotifyAccessToken = tokenData.access_token;
req.session.spotifyRefreshToken = tokenData.refresh_token;
req.session.spotifyExpiresAt = Date.now() + tokenData.expires_in * 1000;
delete req.session.spotifyState;


return res.redirect("http://127.0.0.1:5173/?spotify=connected");

  }catch(error){
    console.error("Network or parsing error during token exchange:");
     return res.status(500).send("Internal server error during Spotify connection.");
  }
};

export default callback;
