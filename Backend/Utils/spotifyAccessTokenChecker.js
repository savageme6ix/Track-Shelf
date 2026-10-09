
import "dotenv/config";

export async function getValidAccessToken(req) {
  const {
    spotifyAccessToken,
    spotifyRefreshToken,
    spotifyExpiresAt,
  } = req.session;

  if (!spotifyRefreshToken) {
    throw new Error("reauthorization_required");
  }

  // Refresh 60 seconds before the actual expiry.
  const refreshBuffer = 60 * 1000;

  const needsRefresh =
    !spotifyAccessToken ||
    !spotifyExpiresAt ||
    Date.now() >= spotifyExpiresAt - refreshBuffer;

  if (!needsRefresh) {
    return spotifyAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const response = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${clientId}:${clientSecret}`
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: spotifyRefreshToken,
      }),
    }
  );

  const body = await response.json();

  if (!response.ok) {
    console.error("Spotify token refresh failed:", body);

    throw new Error(
      body.error === "invalid_grant"
        ? "reauthorization_required"
        : "token_refresh_failed"
    );
  }

  // Save the new token and its expiration.
  req.session.spotifyAccessToken = body.access_token;

  req.session.spotifyExpiresAt =
    Date.now() + body.expires_in * 1000;

  // Spotify may omit a new refresh token.
  if (body.refresh_token) {
    req.session.spotifyRefreshToken = body.refresh_token;
  }

  return body.access_token;
}