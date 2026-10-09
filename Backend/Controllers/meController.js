
const getMe = async (req, res) => {
  try {
    const accessToken = req.session.spotifyAccessToken;

    // Check whether the session contains a token.
    if (!accessToken) {
      return res.status(401).json({
        error: "No access token in session",
        hint: "Log in again or refresh the token.",
      });
    }

    const response = await fetch(
      "https://api.spotify.com/v1/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    // Forward Spotify's error to your frontend.
    if (!response.ok) {
      console.error("Spotify /me error:", response.status, data);

      return res.status(response.status).json(data);
    }

    // Send the successful result to your frontend.
    return res.json(data);

  } catch (error) {
    console.error("getMe failed:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export default getMe;