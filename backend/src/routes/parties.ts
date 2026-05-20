import { Router } from "express";
import type { Server } from "socket.io";
import { prisma } from "../db.js";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const existing = await prisma.party.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate unique code");
}

// finalScore = avgRating × (0.8 + 0.2 × participationRate)
async function computeScores(partyId: string) {
  const songs = await prisma.queuedSong.findMany({
    where: { partyId, status: { in: ["PLAYED", "PLAYING"] } },
    include: { addedBy: true, ratings: true },
    orderBy: { position: "asc" },
  });
  const participantCount = await prisma.participant.count({ where: { partyId } });

  return songs.map((song) => {
    const { ratings } = song;
    if (ratings.length === 0) return { song, finalScore: 0, avgRating: 0, participationRate: 0 };
    const avgRating = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
    const participationRate = ratings.length / Math.max(participantCount, 1);
    const finalScore = avgRating * (0.8 + 0.2 * participationRate);
    return { song, finalScore, avgRating, participationRate };
  });
}

async function endParty(partyId: string, partyCode: string, io: Server) {
  await prisma.queuedSong.updateMany({
    where: { partyId, status: "PLAYING" },
    data: { status: "PLAYED" },
  });

  await prisma.party.update({
    where: { id: partyId },
    data: { status: "ENDED", endedAt: new Date() },
  });

  const scores = await computeScores(partyId);
  scores.sort((a, b) => b.finalScore - a.finalScore);
  const winner = scores[0]?.song ?? null;

  // Fetch full ended party so every client can hydrate from a single event
  const endedParty = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      participants: { orderBy: { joinedAt: "asc" } },
      songs: { include: { addedBy: true, ratings: true }, orderBy: { position: "asc" } },
    },
  });

  const result = { winner, scores };
  io.to(partyCode).emit("party:ended", { result, party: endedParty });
  return result;
}

export function createPartyRouter(io: Server) {
  const router = Router();

  // Create a new party
  router.post("/", async (req, res) => {
    try {
      const { name, hostName, maxSongs, timeLimitMinutes } = req.body;
      if (!name?.trim() || !hostName?.trim()) {
        res.status(400).json({ error: "name and hostName are required" });
        return;
      }

      const code = await uniqueCode();
      const party = await prisma.party.create({
        data: {
          code,
          name: name.trim(),
          maxSongs: maxSongs ? Number(maxSongs) : null,
          timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
          participants: { create: { name: hostName.trim(), isHost: true } },
        },
        include: {
          participants: true,
          songs: { include: { addedBy: true, ratings: true }, orderBy: { position: "asc" } },
        },
      });

      res.json({ party, participantId: party.participants[0].id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create party" });
    }
  });

  // Get party state by invite code
  router.get("/:code", async (req, res) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: req.params.code.toUpperCase() },
        include: {
          participants: { orderBy: { joinedAt: "asc" } },
          songs: {
            include: { addedBy: true, ratings: true },
            orderBy: { position: "asc" },
          },
        },
      });
      if (!party) {
        res.status(404).json({ error: "Party not found" });
        return;
      }
      res.json(party);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch party" });
    }
  });

  // Join a party
  router.post("/:code/join", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) {
        res.status(400).json({ error: "name is required" });
        return;
      }

      const party = await prisma.party.findUnique({
        where: { code: req.params.code.toUpperCase() },
      });
      if (!party) {
        res.status(404).json({ error: "Party not found" });
        return;
      }
      if (party.status === "ENDED") {
        res.status(400).json({ error: "This party has ended" });
        return;
      }

      const participant = await prisma.participant.create({
        data: { partyId: party.id, name: name.trim() },
      });

      const fullParty = await prisma.party.findUnique({
        where: { id: party.id },
        include: {
          participants: { orderBy: { joinedAt: "asc" } },
          songs: {
            include: { addedBy: true, ratings: true },
            orderBy: { position: "asc" },
          },
        },
      });

      io.to(party.code).emit("participant:joined", { participant, party: fullParty });
      res.json({ participant, party: fullParty });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to join party" });
    }
  });

  // Start the party (host only)
  router.post("/:code/start", async (req, res) => {
    try {
      const { participantId } = req.body;
      const party = await prisma.party.findUnique({
        where: { code: req.params.code.toUpperCase() },
        include: {
          participants: true,
          songs: { orderBy: { position: "asc" } },
        },
      });

      if (!party) { res.status(404).json({ error: "Party not found" }); return; }
      if (party.status !== "WAITING") { res.status(400).json({ error: "Party already started" }); return; }

      const host = party.participants.find((p) => p.id === participantId && p.isHost);
      if (!host) { res.status(403).json({ error: "Only the host can start the party" }); return; }
      if (party.songs.length === 0) { res.status(400).json({ error: "Add at least one song first" }); return; }

      const firstSong = party.songs[0];
      const now = new Date();

      await prisma.$transaction([
        prisma.party.update({ where: { id: party.id }, data: { status: "ACTIVE", startedAt: now } }),
        prisma.queuedSong.update({ where: { id: firstSong.id }, data: { status: "PLAYING", playedAt: now } }),
      ]);

      const updated = await prisma.party.findUnique({
        where: { id: party.id },
        include: {
          participants: { orderBy: { joinedAt: "asc" } },
          songs: { include: { addedBy: true, ratings: true }, orderBy: { position: "asc" } },
        },
      });

      io.to(party.code).emit("party:started", { party: updated, serverTime: now.getTime() });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to start party" });
    }
  });

  // Add a song to the queue
  router.post("/:code/songs", async (req, res) => {
    try {
      const { participantId, spotifyId, title, artist, album, albumArt, previewUrl, durationMs } = req.body;

      const party = await prisma.party.findUnique({
        where: { code: req.params.code.toUpperCase() },
        include: { songs: true },
      });

      if (!party) { res.status(404).json({ error: "Party not found" }); return; }
      if (party.status === "ENDED") { res.status(400).json({ error: "Party has ended" }); return; }
      if (party.maxSongs && party.songs.length >= party.maxSongs) {
        res.status(400).json({ error: `Queue is full (max ${party.maxSongs} songs)` });
        return;
      }
      if (party.songs.some((s) => s.spotifyId === spotifyId)) {
        res.status(400).json({ error: "Song already in queue" });
        return;
      }

      const song = await prisma.queuedSong.create({
        data: {
          partyId: party.id,
          addedById: participantId,
          spotifyId,
          title,
          artist,
          album,
          albumArt,
          previewUrl: previewUrl ?? null,
          durationMs: Number(durationMs),
          position: party.songs.length,
        },
        include: { addedBy: true, ratings: true },
      });

      io.to(party.code).emit("song:added", { song });
      res.json(song);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add song" });
    }
  });

  // Remove a queued song (host or adder only)
  router.delete("/:code/songs/:songId", async (req, res) => {
    try {
      const { participantId } = req.body;

      const song = await prisma.queuedSong.findUnique({
        where: { id: req.params.songId },
        include: { party: true },
      });

      if (!song) { res.status(404).json({ error: "Song not found" }); return; }
      if (song.status !== "QUEUED") { res.status(400).json({ error: "Can only remove queued songs" }); return; }

      const participant = await prisma.participant.findUnique({ where: { id: participantId } });
      if (!participant || (!participant.isHost && song.addedById !== participantId)) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      await prisma.queuedSong.delete({ where: { id: song.id } });

      // Re-index remaining queued positions
      const remaining = await prisma.queuedSong.findMany({
        where: { partyId: song.partyId, status: "QUEUED" },
        orderBy: { position: "asc" },
      });
      await Promise.all(
        remaining.map((s, i) =>
          prisma.queuedSong.update({ where: { id: s.id }, data: { position: i } })
        )
      );

      io.to(song.party.code).emit("song:removed", { songId: song.id });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to remove song" });
    }
  });

  // Rate the currently playing song
  router.post("/:code/songs/:songId/rate", async (req, res) => {
    try {
      const { participantId, score } = req.body;
      const numScore = Number(score);

      if (!numScore || numScore < 1 || numScore > 5) {
        res.status(400).json({ error: "Score must be 1–5" });
        return;
      }

      const song = await prisma.queuedSong.findUnique({
        where: { id: req.params.songId },
        include: { party: true },
      });

      if (!song) { res.status(404).json({ error: "Song not found" }); return; }
      if (song.status !== "PLAYING") {
        res.status(400).json({ error: "Can only rate the currently playing song" });
        return;
      }

      await prisma.rating.upsert({
        where: { songId_participantId: { songId: song.id, participantId } },
        create: { songId: song.id, participantId, score: numScore },
        update: { score: numScore },
      });

      const allRatings = await prisma.rating.findMany({ where: { songId: song.id } });
      io.to(song.party.code).emit("rating:updated", { songId: song.id, ratings: allRatings });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to submit rating" });
    }
  });

  // Advance to the next song (host only)
  router.post("/:code/next", async (req, res) => {
    try {
      const { participantId } = req.body;

      const party = await prisma.party.findUnique({
        where: { code: req.params.code.toUpperCase() },
        include: {
          participants: true,
          songs: { orderBy: { position: "asc" } },
        },
      });

      if (!party) { res.status(404).json({ error: "Party not found" }); return; }
      if (party.status !== "ACTIVE") { res.status(400).json({ error: "Party is not active" }); return; }

      const host = party.participants.find((p) => p.id === participantId && p.isHost);
      if (!host) { res.status(403).json({ error: "Only the host can advance songs" }); return; }

      const currentSong = party.songs.find((s) => s.status === "PLAYING");
      if (currentSong) {
        await prisma.queuedSong.update({ where: { id: currentSong.id }, data: { status: "PLAYED" } });
      }

      const nextSong = party.songs.find((s) => s.status === "QUEUED");
      if (!nextSong) {
        const result = await endParty(party.id, party.code, io);
        res.json({ ended: true, result });
        return;
      }

      const now = new Date();
      await prisma.queuedSong.update({
        where: { id: nextSong.id },
        data: { status: "PLAYING", playedAt: now },
      });

      const updatedParty = await prisma.party.findUnique({
        where: { id: party.id },
        include: {
          participants: { orderBy: { joinedAt: "asc" } },
          songs: { include: { addedBy: true, ratings: true }, orderBy: { position: "asc" } },
        },
      });

      // party:updated replaces the old song:playing event — emits full party so
      // every client can replace their state atomically with a single payload.
      io.to(party.code).emit("party:updated", updatedParty);
      res.json({
        song: updatedParty?.songs.find((s) => s.status === "PLAYING") ?? null,
        party: updatedParty,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to advance song" });
    }
  });

  // End the party early (host only)
  router.post("/:code/end", async (req, res) => {
    try {
      const { participantId } = req.body;

      const party = await prisma.party.findUnique({
        where: { code: req.params.code.toUpperCase() },
        include: { participants: true },
      });

      if (!party) { res.status(404).json({ error: "Party not found" }); return; }
      if (party.status === "ENDED") { res.status(400).json({ error: "Party already ended" }); return; }

      const host = party.participants.find((p) => p.id === participantId && p.isHost);
      if (!host) { res.status(403).json({ error: "Only the host can end the party" }); return; }

      const result = await endParty(party.id, party.code, io);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to end party" });
    }
  });

  return router;
}
