 const refresh_token = async(req, res)=> {
  let client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  var client_id = process.env.SPOTIFY_CLIENT_ID;
  const storedRefreshToken = req.session.spotifyRefreshToken;
  console.log(
  "Refresh token present in session:",
  Boolean(req.session.spotifyRefreshToken)
);

if (!storedRefreshToken) {
  return res.status(401).json({ error: "reauthorization_required" });
}

const response = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
  },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: storedRefreshToken,
  }),
});

const body = await response.json();

req.session.spotifyAccessToken = body.access_token;
req.session.spotifyExpiresAt = Date.now() + body.expires_in * 1000;
if (body.refresh_token) {
  req.session.spotifyRefreshToken = body.refresh_token;
}

return res.json({ connected: true });
 
}

export default refresh_token;