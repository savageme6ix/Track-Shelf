import { getValidAccessToken } from "../Utils/spotifyAccessTokenChecker";
const getMe = async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);

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

    if (error.message === "reauthorization_required") {
      return res.status(401).json({
        error: "reauthorization_required",
      });
    }

    return res.status(502).json({
      error: "spotify_request_failed",
    });
    
  }
};

export default getMe;