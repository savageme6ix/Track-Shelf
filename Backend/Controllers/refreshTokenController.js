 const refresh_token = async(req, res)=> {
  let client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  var client_id = process.env.SPOTIFY_CLIENT_ID;
  var refresh_token = req.session.spotifyRefreshToken;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  try{
    const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
    const body = await response.json();

  if (response.ok) { // Status code 200-299
      req.session.spotifyAccessToken = body.access_token;
      refresh_token = body.refresh_token || refresh_token;

      return res.send({
        'access_token': body.access_token, 
        'refresh_token': refresh_token
      });
    } else if (response.status === 400 && body.error === 'invalid_grant') {
      return res.status(401).send({
        'error': 'reauthorization_required',
        'authorize_url': '/login'
      });
    } else {
      return res.status(response.status).send(body);
    }
  }catch(error){
    return res.status(500).send({
      'error': 'token_refresh_failed'
    });
  }

};

export default refresh_token;