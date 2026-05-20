# Nero Party

## What is Nero Party

A real-time listening party app where friends join a shared room, add songs via Spotify, listen together, and rate each song 1–5. The song with the highest weighted score (avg rating × participation rate) wins at the end. Features a jukebox aesthetic with live standings, audio visualizer, and real-time sync.

---

## Tech Stack

- **Backend:** Express.js, Prisma, SQLite, Socket.IO, TypeScript
- **Frontend:** React, Vite, TailwindCSS, TypeScript
- **Music:** Spotify Web API + Spotify Web Playback SDK

---

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/2uchitra/nero-party.git
cd nero-party

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

Create a file called `.env` inside the `backend/` folder with these contents:

```
PORT=3000
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

```bash
# 3. Set up the database
cd backend && npx prisma db push

# 4. Start the backend (port 3000)
cd backend && npm run dev

# 5. Start the frontend (port 5173)
cd ../frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Spotify Setup

You need your own Spotify app credentials to run this. Here's how to get them:

1. Go to [developer.spotify.com](https://developer.spotify.com) and sign in with your Spotify account
2. Click **Create App**
3. Fill in any app name and description
4. Add `http://localhost:3000/api/spotify/callback` as the Redirect URI and click **Add**
5. Check **Web API** and **Web Playback SDK** under API/SDKs
6. Agree to terms and click **Save**
7. Go to your app's **Settings** and copy the **Client ID** and **Client Secret**
8. Paste them into `backend/.env` replacing `your_client_id_here` and `your_client_secret_here`

> ⚠️ **Spotify Premium is required for music playback.** Free accounts can search but cannot play songs.

---

## How to Use

1. Create a party with a name, set max songs and time limit
2. Share the party code with friends
3. Search and add songs to the queue
4. Songs play in sync for all participants
5. Rate each song 1 (Ice Cold) to 5 (Inferno) while it plays
6. At the end, the winner is revealed with confetti and final standings

---

## Scoring Algorithm

Winner is determined by:

```
finalScore = avgRating × (0.8 + 0.2 × participationRate)
```

Rewards both highly rated songs and ones that got more people voting.
