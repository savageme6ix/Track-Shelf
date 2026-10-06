import express from "express";

const router = express.Router();

router.post("/playlist", (req, res) => {
  const submittedUrl = req.body?.url;

  if (typeof submittedUrl !== "string" || submittedUrl.trim() === "") {
    return res.status(400).json({ error: "A playlist URL is required." });
  }

  let playlistUrl;

  try {
    // URL parsing throws for malformed input, so handle that as a client error.
    playlistUrl = new URL(submittedUrl);
  } catch {
    return res.status(400).json({ error: "Please provide a valid Spotify playlist URL." });
  }

  // Check the actual parsed host and path; URL instances do not have String.match().
  //regex to check if the pathname follows spotifys structure
  const playlistPath = playlistUrl.pathname.match(/^\/playlist\/([a-zA-Z0-9]{22})\/?$/);
  const isSpotifyHost =
    playlistUrl.protocol === "https:" &&
    playlistUrl.hostname === "open.spotify.com" &&
    playlistUrl.port === "";

  if (!isSpotifyHost || !playlistPath) {
    return res.status(400).json({
      error: "Please provide a valid open.spotify.com playlist URL.",
    });
  }

  return res.status(200).json({ playlistId: playlistPath[1] });
});

export default router;
