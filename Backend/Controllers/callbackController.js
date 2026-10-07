import "dotenv/config";
import querystring from 'node:querystring';
const callback = (req, res)=> {

  var code = req.query.code || null;
  var state = req.query.state;
  let client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  var client_id = process.env.SPOTIFY_CLIENT_ID;
  

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
} else {
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
    console.log(response.body);
  }
};

export default callback;
