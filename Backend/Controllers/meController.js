const getMe = async(access_token)=>{
    access_token = req.session.spotifyAccessToken
    const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: 'Bearer ' + access_token
    }
    
    });
    const data = await response.json();
}

export default getMe;