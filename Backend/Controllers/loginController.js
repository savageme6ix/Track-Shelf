import "dotenv/config";
var client_id = process.env.SPOTIFY_CLIENT_ID;
var redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

const login =(req, res)=> {

  var state = generateRandomString(16);
  var scope = 'user-read-private user-read-email playlist-read-private';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
};

export default login;
