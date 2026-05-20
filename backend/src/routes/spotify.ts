import { Router } from "express";
import { searchTracks, checkHealth } from "../services/spotify.js";

export const spotifyRouter = Router();

spotifyRouter.get("/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query?.trim()) {
    res.status(400).json({ error: "query required" });
    return;
  }
  try {
    const tracks = await searchTracks(query.trim());
    res.json(tracks);
  } catch (err) {
    console.error("[spotify] Search error:", err);
    res.status(500).json({ error: "Spotify search failed" });
  }
});

spotifyRouter.get("/health", async (_req, res) => {
  const health = await checkHealth();
  const status = health.tokenValid ? 200 : 503;
  res.status(status).json(health);
});
