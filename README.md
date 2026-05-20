# Nero Party

A listening party where friends queue songs, listen together in real-time, and crown a winner at the end. No algorithm. Only vibes.

---

## Features

- **Create a party** with optional rules: max songs, time limit
- **Shareable invite code** — 6-character code or direct link
- **Spotify-powered search** — find any song, 30-second previews included
- **Synchronized playback** — audio syncs to when the song started, so latecomers catch up automatically
- **Heat ratings** — rate each song 1–5 while it plays; standings stay hidden until the end
- **Real-time everything** — queue changes, new participants, ratings all sync instantly via Socket.IO
- **Dramatic winner reveal** — 4-phase animated sequence crowns the top song

### Scoring algorithm

```
finalScore = avgRating × (0.8 + 0.2 × participationRate)
```

Participation rate rewards songs that more people voted on, not just songs with one perfect rating.

---

## Getting a Spotify API Key (free, 2 minutes)

Nero Party uses Spotify's **client credentials flow** — no user login, no OAuth, just search and 30-second previews.

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in with any Spotify account (free tier works)
2. Click **Create app**
3. Fill in any name and description; set the Redirect URI to `http://localhost:3000` (required by the form but never used)
4. Select **Web API** under APIs used, then save
5. Open your new app and click **Settings** → copy the **Client ID** and **Client Secret**

Paste them into your `.env` file (see setup below).

> **Note on previews:** Spotify provides 30-second preview URLs for most but not all tracks. Songs without a preview still appear in search results and can be added to the queue — they just won't play audio. Ratings still work.

---

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install & run

```bash
# 1. Clone and install all dependencies
git clone <repo-url>
cd nero-party
npm install          # installs root dev deps (concurrently)
cd backend && npm install
cd ../frontend && npm install
cd ..

# 2. Set up environment variables
cp .env.example .env
# Edit .env and add your Spotify client ID and secret

# 3. Create the database
cd backend && npx prisma migrate dev --name init && cd ..

# 4. Start everything
npm run dev
```

This starts:
- **Backend** on `http://localhost:3000`
- **Frontend** on `http://localhost:5173`

Open `http://localhost:5173` to use the app.

---

## How to run a party

1. **Host** opens the app, clicks **Create**, enters a party name and their name, optionally sets max songs or a time limit
2. Host shares the 6-character invite code or the link
3. **Guests** open the app, click **Join**, enter the code and their name
4. Anyone can search for songs and add them to the queue
5. Host clicks **Start the Party** — the first song begins playing for everyone
6. Listeners rate each song 1–5 while it plays
7. Host clicks **Next Song** to advance; standings stay hidden the whole time
8. When the queue runs out (or host clicks **End Party**), the winner is revealed

---

## Project structure

```
nero-party/
├── .env.example
├── package.json          # root: runs both servers via concurrently
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma # Party, Participant, QueuedSong, Rating models
│   │   └── migrations/
│   └── src/
│       ├── index.ts      # Express + Socket.IO setup
│       ├── db.ts         # Prisma client singleton
│       ├── env.ts        # Typed env vars
│       ├── routes/
│       │   ├── parties.ts  # All party/song/rating REST endpoints
│       │   └── spotify.ts  # GET /api/spotify/search
│       ├── services/
│       │   └── spotify.ts  # Client credentials auth + token cache
│       └── socket/
│           └── handlers.ts # join-party / leave-party handlers
│
└── frontend/
    └── src/
        ├── App.tsx
        ├── lib/
        │   ├── api.ts      # Typed fetch wrapper for all endpoints
        │   └── socket.ts   # Socket.IO client
        ├── pages/
        │   ├── Home.tsx    # Create / Join landing page
        │   └── PartyPage.tsx  # Orchestrates all party views + socket events
        └── components/
            ├── Lobby.tsx       # Waiting room (WAITING status)
            ├── ActiveParty.tsx # Live listening (ACTIVE status)
            ├── WinnerReveal.tsx # Animated end screen (ENDED status)
            ├── SongSearch.tsx  # Spotify search slide-up panel
            ├── HeatRating.tsx  # 1–5 heat rating widget
            └── QueueList.tsx   # Shared queue display
```

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/parties` | Create a party |
| `GET` | `/api/parties/:code` | Get full party state |
| `POST` | `/api/parties/:code/join` | Join a party |
| `POST` | `/api/parties/:code/start` | Host starts the party |
| `POST` | `/api/parties/:code/songs` | Add a song to the queue |
| `DELETE` | `/api/parties/:code/songs/:songId` | Remove a queued song |
| `POST` | `/api/parties/:code/songs/:songId/rate` | Submit a 1–5 rating |
| `POST` | `/api/parties/:code/next` | Advance to the next song |
| `POST` | `/api/parties/:code/end` | End the party early |
| `GET` | `/api/spotify/search?q=` | Search Spotify tracks |

### Socket.IO events

| Event (server → client) | Payload |
|--------------------------|---------|
| `party:state` | Full party object (on join) |
| `participant:joined` | `{ participant, party }` |
| `song:added` | `{ song }` |
| `song:removed` | `{ songId }` |
| `song:playing` | `{ song, songs, serverTime }` |
| `rating:updated` | `{ songId, ratings }` |
| `party:started` | `{ party, serverTime }` |
| `party:ended` | `{ winner, scores }` |

---

## Tech stack

- **Backend:** Express.js, Prisma ORM, Socket.IO, TypeScript
- **Frontend:** React 18, Vite, TailwindCSS, Socket.IO client, React Router
- **Database:** SQLite (via Prisma — zero config, file-based)
- **Music:** Spotify Web API (client credentials — no user auth required)
- **Fonts:** Playfair Display, Inter, JetBrains Mono
