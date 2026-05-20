import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { env } from "./env.js";
import { createPartyRouter } from "./routes/parties.js";
import { spotifyRouter } from "./routes/spotify.js";
import { registerSocketHandlers } from "./socket/handlers.js";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: /^http:\/\/localhost:\d+$/,
    methods: ["GET", "POST", "DELETE"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/parties", createPartyRouter(io));
app.use("/api/spotify", spotifyRouter);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  registerSocketHandlers(io, socket);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    console.warn("[spotify] WARNING: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing — search will fail");
  }
});
