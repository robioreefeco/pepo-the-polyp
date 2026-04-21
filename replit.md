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
    PublicProfile.tsx                     — Public member profile at /members/:id; shows avatar, bio, ORCID badge, stats, activity feed
    UserProfileDashboard.tsx              — My Profile edit page (bio, tags, links, ORCID linking)
    sections/
      ApplicationHeaderSection.tsx        — Top nav with Privy auth button
      ExplorerNavigationSidebarSection.tsx — Sidebar with nav, Telegram bot link, Reef Network Map
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

## External Integrations

### Bonfires.ai Knowledge Graph
- Base URL: `https://pepo.app.bonfires.ai`
- Authenticated via `PEPO_API_KEY` on the server (never exposed to client)
- Chat has a local fallback if the API is unreachable

### Telegram Bot
- Bot: @PepothePolyp_bot
- URL: https://t.me/PepothePolyp_bot
- Linked from the sidebar's "Telegram Bot" section

### GitHub
- Repo: `github.com/robioreefeco/pepo-the-polyp`
- Push via GitHub integration (`listConnections('github')` in code_execution)

## Running the App
```bash
npm run dev        # Start dev server (port 5000)
npm run build      # Production build
npm run db:push    # Sync database schema
```
