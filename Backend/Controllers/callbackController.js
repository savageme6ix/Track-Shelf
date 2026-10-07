import "dotenv/config";
import querystring from 'node:querystring';
const callback = (req, res)=> {

  var code = req.query.code || null;
  var state = req.query.state || null;
  let client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  var client_id = process.env.SPOTIFY_CLIENT_ID;
  

  if (state === null) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
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
