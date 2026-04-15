# Pepo the Polyp — Reef Insight App

## Overview
A full-stack DeSci/marine conservation web app for MesoReef DAO. Pepo is an AI guide to the MesoAmerican Reef knowledge network, powered by the Bonfires.ai knowledge graph.

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + TypeScript (served on port 5000)
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Privy.io (wallet/email/social login) — conditionally loaded when `VITE_PRIVY_APP_ID` is set
- **Knowledge Graph**: Bonfires.ai (`https://pepo.app.bonfires.ai`) proxied server-side
- **Multi-Source Knowledge**: Six parallel knowledge sources fused into every chat response:
  1. **Pepo Knowledge Graph** (Bonfires.ai) — 165+ community research episodes from the Telegram bot
  2. **@PepothePolyp_bot Taxonomy** — 10 curated knowledge categories extracted from 165 Telegram bot episodes; keywords match the user query to surface the right category; live-refreshed from Bonfires every 60 min
  3. **Scientific Journals** (OpenAlex + Europe PMC) — peer-reviewed papers from Nature, Science, Frontiers, PLOS ONE, Global Change Biology, PeerJ, PNAS, Royal Society, and thousands more — free API, no key required, results cached 15 min; coral-reef-only filtering (title/abstract relevance guard + medical/human biology exclusion list)
  4. **Wikipedia** — scientific reference summaries; keyword extracted + cached 10 min
  5. **MesoReefDAO Documentation** — curated DAO knowledge (mission, programs, tech stack)
  6. **Memento Mori** — curated knowledge from https://github.com/robioreefeco/memento-mori — permadeath MUD / DeSci game by robioreefeco; covers architecture (CrewAI engine, FastAPI gateway, TypeScript/Bun client, Bonfires KG, Redstone L2), game design (permadeath, onchain state, NPC agents), and its DeSci-gaming connection to MesoReefDAO. Triggered by keywords: game, MUD, permadeath, CrewAI, memento, mori, NPC, quest, dungeon, robioreefeco, etc.

### Key directories
```
client/src/
  pages/
    Body.tsx                          — Main layout (header + sidebar + dashboard)
    sections/
      ApplicationHeaderSection.tsx    — Top nav with Privy auth button
      ExplorerNavigationSidebarSection.tsx — Sidebar with nav, Telegram bot link
      ReefInsightDashboardSection.tsx  — Chat interface + graph + stats
  components/
    PrivyLoginButton.tsx              — Auth button (only rendered when Privy is active)
  lib/
    privy.ts                          — PRIVY_ENABLED / PRIVY_APP_ID constants
server/
  routes.ts                           — /api/chat, /api/graph, /api/stats endpoints
  index.ts                            — Express server entry
shared/
  schema.ts                           — Drizzle DB schema
client/public/figmaAssets/            — Exported Figma assets (SVGs, PNGs)
```

## Environment Variables / Secrets

| Key | Where | Purpose |
|-----|-------|---------|
| `PEPO_API_KEY` | Secret | Authenticates calls to Bonfires.ai API |
| `PRIVY_APP_ID` | Secret | Privy server-side app ID |
| `VITE_PRIVY_APP_ID` | Env var (shared) | Privy app ID for the browser client |
| `DATABASE_URL` | Secret (Replit) | PostgreSQL connection string |
| `SESSION_SECRET` | Secret (Replit) | Express session secret |

**Note**: If `VITE_PRIVY_APP_ID` is not set, the app runs without Privy auth (login button links to dashboard.privy.io).

## API Endpoints (all prefixed `/api`)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/graph` | GET | Fetches full knowledge graph from Bonfires.ai |
| `/api/graph/search` | POST `{ query }` | Searches the knowledge graph |
| `/api/chat` | POST `{ message }` | Sends a chat message to Pepo AI |
| `/api/stats` | GET | Returns network health stats |

## Integrations

### Privy.io (Auth)
- Supports: email, wallet, Google, Twitter, Telegram login
- Conditionally active — set `VITE_PRIVY_APP_ID` to enable
- Get your App ID at: https://dashboard.privy.io

### Bonfires.ai Knowledge Graph
- Base URL: `https://pepo.app.bonfires.ai`
- Authenticated via `PEPO_API_KEY` on the server (never exposed to client)
- Chat has a local fallback if the API is unreachable

### Telegram Bot
- Bot: @PepothePolyp_bot
- URL: https://t.me/PepothePolyp_bot
- Linked from the sidebar's "Telegram Bot" section

## Running the App
```bash
npm run dev        # Start dev server (port 5000)
npm run build      # Production build
npm run db:push    # Sync database schema
```
