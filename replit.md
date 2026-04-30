# Pepo the Polyp — Reef Insight App

## Overview
A full-stack DeSci/marine conservation web app for MesoReef DAO. Pepo is an AI guide to the MesoAmerican Reef knowledge network, powered by the Bonfires.ai knowledge graph.

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + TypeScript (served on port 5000)
- **Database**: PostgreSQL via Drizzle ORM
- **Auth (primary)**: ORCID OAuth2 — standalone login; session stored server-side via express-session
- **Auth (secondary)**: Privy.io (wallet/email/social) — conditionally loaded when `VITE_PRIVY_APP_ID` is set
- **Knowledge Graph**: Bonfires.ai (`https://pepo.app.bonfires.ai`) proxied server-side

### Multi-Source Knowledge
Six parallel knowledge sources fused into every chat response:
1. **Pepo Knowledge Graph** (Bonfires.ai) — 165+ community research episodes from the Telegram bot
2. **@PepothePolyp_bot Taxonomy** — 10 curated knowledge categories extracted from 165 Telegram bot episodes; keywords match the user query to surface the right category; live-refreshed from Bonfires every 60 min
3. **Scientific Journals** (OpenAlex + Europe PMC) — peer-reviewed papers; coral-reef-only filtering; results cached 15 min
4. **Wikipedia** — scientific reference summaries; keyword extracted + cached 10 min
5. **MesoReefDAO Documentation** — curated DAO knowledge (mission, programs, tech stack)
6. **Memento Mori** — curated knowledge from https://github.com/robioreefeco/memento-mori

### Key directories
```
client/src/
  pages/
    Body.tsx                              — Main layout (header + sidebar + dashboard)
    CommunityLeaderboard.tsx              — Community page: Leaderboard (left) + Profile cards (right); rows/cards are clickable divs navigating to /members/:id
    Governance.tsx                        — /governance page: Adaptive DAO voting via Vocdoni. Three voting modes (Standard/Approval/Quadratic), two census modes (Open Wallet / Base Network Members), GitHub repo import for proposal options. Configured via VITE_VOCDONI_ORG_ADDRESS, VITE_VOCDONI_ENV, VITE_GITHUB_OWNER, VITE_GITHUB_REPO.
    PublicProfile.tsx                     — Public member profile at /members/:id; shows avatar, bio, ORCID badge, stats, activity feed
    UserProfileDashboard.tsx              — My Profile edit page (bio, tags, links, ORCID linking)
    WorkspacePage.tsx                     — /workspace page: Fileverse dDocs + dSheets integration cards with launch buttons, About Fileverse section
    sections/
      ApplicationHeaderSection.tsx        — Top nav with Privy auth button + Workspace link
      ExplorerNavigationSidebarSection.tsx — Sidebar with nav, Telegram bot link, Reef Workspace (dDocs/dSheets), Reef Network Map
      ReefInsightDashboardSection.tsx      — Bonfires Knowledge Graph iframe + Telegram Bot panel
  components/
    PrivyLoginButton.tsx                  — Calls login() for Privy's native modal
    OrcidLoginButton.tsx                  — ORCID OAuth login button (redirects to /api/auth/orcid)
    ReefMap.tsx                           — Leaflet map: Esri Ocean basemap + Allen Coral Atlas WMS + GCRMN region polygons (10 regions, from GCRMN/gcrmn_regions shapefile via /api/gcrmn/regions) + NOAA CRW DHW toggle + community member pins
  hooks/
    use-profile-sync.ts                   — Auto-syncs Privy user to DB on login; awards first-login bonus points
    use-geolocation.ts                    — Requests browser geolocation once per session; POSTs to /api/profiles/location
  lib/
    privy.ts                              — PRIVY_ENABLED / PRIVY_APP_ID constants
server/
  routes.ts                               — All API routes; includes ORCID OAuth flow with dynamic redirect URI
  storage.ts                              — DbStorage: profiles, contributions, leaderboard CRUD via Drizzle
  db.ts                                   — Drizzle + pg Pool connection
  index.ts                                — Express server entry
shared/
  schema.ts                               — Drizzle DB schema: users, profiles, contributions, LeaderboardEntry
client/public/figmaAssets/                — Exported Figma assets (SVGs, PNGs)
```

## Auth: ORCID OAuth2

ORCID is the **primary** standalone auth method (no Privy required).

### Flow
1. User clicks "Login with ORCID" → GET `/api/auth/orcid?mode=auth`
2. Server builds ORCID authorization URL with `redirect_uri` derived dynamically from the incoming request host (supports `thepolyp.xyz`, `pepothepolyp.replit.app`, and `localhost` with a single build)
3. ORCID redirects to GET `/api/auth/orcid/callback?code=...&state=...`
4. Server exchanges code for access token + ORCID iD, creates/updates profile, stores session
5. Redirect to `/profile`

### Profile ID format
- Privy users: `did:privy:xxx`
- ORCID-only users: `orcid:0000-0000-0000-0000`
- URL-encode with `encodeURIComponent` when linking to `/members/:id`

### ORCID app registration (orcid.org/developer-tools)
App ID: `APP-7ZOOJ6V1LVQD5MBX`

Registered redirect URIs:
- `https://thepolyp.xyz/api/auth/orcid/callback`
- `https://pepothepolyp.replit.app/api/auth/orcid/callback`

## Auth: Privy.io

- App ID: `cmnysfvqe00ff0cjmh15ba116`
- Login methods: wallet, email, Google, Twitter, LinkedIn
- EVM-only chains: mainnet, polygon, base, arbitrum, optimism, avalanche
- `showWalletUIs: true` enables embedded wallet key export
- Conditionally active — set `VITE_PRIVY_APP_ID` to enable

## Contribution Points System

| Action | Points |
|--------|--------|
| First login | +50 |
| Asking a question | +10 (once per day per user) |
| Linking ORCID iD | +25 (once) |

- Leaderboard auto-refreshes every 30 seconds on the Community page
- Points stored persistently in PostgreSQL `profiles.points`

## Environment Variables / Secrets

| Key | Purpose |
|-----|---------|
| `PEPO_API_KEY` | Authenticates calls to Bonfires.ai API |
| `ORCID_CLIENT_ID` | ORCID OAuth2 client ID |
| `ORCID_CLIENT_SECRET` | ORCID OAuth2 client secret |
| `PRIVY_APP_SECRET` | Privy server-side secret |
| `VITE_PRIVY_APP_ID` | Privy app ID for the browser client |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |

## API Endpoints (all prefixed `/api`)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST `{ message }` | Sends chat message to Pepo AI |
| `/api/graph` | GET | Fetches full knowledge graph from Bonfires.ai |
| `/api/graph/search` | POST `{ query }` | Searches the knowledge graph |
| `/api/stats` | GET | Returns network health stats |
| `/api/leaderboard` | GET | Returns ranked list of members |
| `/api/profiles/me` | GET | Returns current user's profile |
| `/api/profiles/sync` | POST | Syncs Privy user to DB; awards first-login points |
| `/api/profiles/update` | POST | Updates bio, tags, links, etc. |
| `/api/profiles/orcid` | POST `{ orcidId, orcidName }` | Links ORCID iD to authenticated user |
| `/api/profiles/location` | POST `{ latitude, longitude }` | Saves geolocation for authenticated user (Privy or ORCID session) |
| `/api/map/markers` | GET | Returns public users with lat/lng for the Reef Network Map |
| `/api/profiles/:id` | GET | Public profile by member ID |
| `/api/contributions` | POST `{ type, description }` | Records a contribution and awards points |
| `/api/auth/orcid` | GET | Initiates ORCID OAuth2 flow |
| `/api/auth/orcid/callback` | GET | ORCID OAuth2 callback (exchanges code for token) |
| `/api/auth/orcid/session` | GET | Returns current ORCID session |
| `/api/auth/orcid/logout` | POST | Destroys ORCID session |

## IPFS / Helia Image Storage

Helia (the official js-IPFS successor) runs in offline mode on the server, backed by **in-memory stores** (`MemoryBlockstore` / `MemoryDatastore` from `blockstore-core` / `datastore-core`). No filesystem or libp2p networking required — works on ephemeral autoscale deployments.

**Persistence**: uploaded image bytes are base64-encoded and saved to the `ipfs_blocks` PostgreSQL table. On a cold start, `/api/ipfs/cat/:cid` reads from DB and re-hydrates Helia memory, so images survive restarts. If a CID is not found locally, the endpoint redirects to `https://ipfs.io/ipfs/<cid>` as a final fallback.

### Server module
- `server/ipfs.ts` — `uploadToIPFS(buffer)`, `getIPFSBytes(cid)`, `hydrateIPFS(buffer)` helpers; lazy-initialised Helia node using MemoryBlockstore/MemoryDatastore.

### API routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/ipfs/upload` | POST (multipart) | Accepts an image (≤10 MB), stores via Helia + saves base64 to `ipfs_blocks` DB, returns `{ cid, size, mimeType }` |
| `/api/ipfs/cat/:cid` | GET | Serves raw bytes: memory → DB → 302 redirect to ipfs.io gateway |
| `/api/ipfs/info` | GET | Returns Helia node status |

### Frontend helpers
- `client/src/lib/ipfs.ts` — `uploadImageToIPFS(file)`, `ipfsImageUrl(cid)` (local cat URL), `ipfsPublicUrl(cid)` (ipfs.io gateway)
- `client/src/components/IPFSImageUpload.tsx` — drag-and-drop upload widget (full and compact modes); shows CID + gateway links after upload

### Schema fields
- `profiles.avatarCid text` — CID of the user's avatar image
- `profiles.ipfsImages text[]` — array of CIDs for additional reef images
- `ipfs_blocks` table — `cid` (PK), `data` (base64 text), `mimeType`, `uploadedAt`

### UI integration
- **Profile page** (`/profile`) — Compact IPFS upload strip below the circular avatar preview; CID saved to `avatarCid` on Save Profile
- **Workspace page** (`/workspace`) — "Coral Reef Image Archive" section (full drag-and-drop uploader + session image grid)

## External Integrations

### Bonfires.ai Knowledge Graph
- Base URL: `https://pepo.app.bonfires.ai`
- Authenticated via `PEPO_API_KEY` on the server (never exposed to client)
- Chat has a local fallback if the API is unreachable

### Live Chat Widget (TelegramChatWidget)
- Component: `client/src/components/TelegramChatWidget.tsx`
- Floating Pepo avatar button in bottom-right corner; available on all pages (mounted in AppInner in App.tsx)
- Full in-browser live chat: sends messages to `/api/chat`, streams AI responses from Bonfires.ai
- Shows typing indicator, per-message timestamps, +points badge when points awarded
- Keeps conversation history for the session; greets with welcome message on open
- Footer link to @PepothePolyp_bot for users who prefer Telegram app

### Telegram Bot
- Bot: @PepothePolyp_bot
- URL: https://t.me/PepothePolyp_bot
- Linked from sidebar "Telegram Bot" section and from the live chat widget footer

### GitHub
- Repo: `github.com/robioreefeco/pepo-the-polyp`
- Push via GitHub integration (`listConnections('github')` in code_execution)

## Running the App
```bash
npm run dev        # Start dev server (port 5000)
npm run build      # Production build (Vite frontend → dist/public/ + esbuild server → dist/index.mjs)
npm run db:push    # Sync database schema
```

## Deployment (Autoscale)

- **Build**: `npm run build` (script/build.ts) — Vite builds frontend to `dist/public/`, esbuild bundles server to `dist/index.mjs` (1.3 MB)
- **Run**: `node dist/index.mjs`
- **ESM strategy**: server bundle uses ESM format. CJS packages (express, pg, etc.) are bundled inline by esbuild (with a `createRequire` banner for any dynamic `require()` calls). ESM-only packages (helia, blockstore-core, datastore-core, blockstore-fs, datastore-fs, @helia/unixfs, multiformats) are **externalized** — they stay in node_modules and load via native ESM import, keeping `import.meta.url` correct in each module.
- **Static files**: `server/static.ts` serves `dist/public/` relative to `process.cwd()` (project root), so it works whether invoked from the bundle or directly via tsx.
- **IPFS on autoscale**: Uses MemoryBlockstore + PostgreSQL `ipfs_blocks` table for persistence. No filesystem dependency; works correctly on ephemeral autoscale instances.
