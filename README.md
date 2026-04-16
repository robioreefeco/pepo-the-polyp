# Pepo the Polyp

AI guide to the Coral Reef knowledge network, built for MesoReef DAO.

Pepo is a full-stack DeSci and marine conservation web app that fuses multiple knowledge sources into a conversational interface. Researchers, conservationists, and community members can ask questions about coral reef ecology, bleaching events, DeSci, and the MesoAmerican Reef ecosystem.

---

## Features

- **AI Chat** powered by the Bonfires.ai knowledge graph plus scientific journals, Wikipedia, and curated DAO documentation
- **ORCID Login** for researchers to sign in with their persistent digital identifier
- **Privy Auth** supporting email, Google, X/Twitter, LinkedIn, and wallet login
- **Community Leaderboard** with reputation points for contributions and daily logins
- **User Profiles** with bio, tags, location, photo, and linked ORCID iD
- **Reef Knowledge Graph** embedded live from Bonfires.ai
- **Telegram Bot** integration via @PepothePolyp_bot

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Privy.io + ORCID OAuth 2.0 |
| Knowledge | Bonfires.ai API, OpenAlex, Europe PMC, Wikipedia |

---

## Knowledge Sources

Every chat response fuses up to six sources in parallel:

1. **Pepo Knowledge Graph** - 165+ community research episodes via Bonfires.ai
2. **Telegram Bot Taxonomy** - 10 curated categories from @PepothePolyp_bot episodes
3. **Scientific Journals** - peer-reviewed papers from Nature, Science, Frontiers, PLOS ONE, and more via OpenAlex and Europe PMC (no API key required)
4. **Wikipedia** - scientific reference summaries
5. **MesoReefDAO Documentation** - mission, programs, and tech stack
6. **Memento Mori** - DeSci gaming knowledge from the CrewAI-powered permadeath MUD by robioreefeco

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PEPO_API_KEY` | Bonfires.ai API key |
| `VITE_PRIVY_APP_ID` | Privy app ID (browser) |
| `PRIVY_APP_SECRET` | Privy server-side secret |
| `ORCID_CLIENT_ID` | ORCID OAuth client ID |
| `ORCID_CLIENT_SECRET` | ORCID OAuth client secret |
| `SESSION_SECRET` | Express session secret |

> If `VITE_PRIVY_APP_ID` is not set, the app runs without Privy auth.

### Install and Run

```bash
npm install
npm run db:push   # sync database schema
npm run dev       # start dev server on port 5000
```

---

## API Reference

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | Send a message to Pepo AI |
| `/api/graph` | GET | Fetch the full knowledge graph |
| `/api/graph/search` | POST | Search the knowledge graph |
| `/api/profiles` | GET | List all public profiles |
| `/api/profiles/:id` | GET | Get a single profile with contributions |
| `/api/leaderboard` | GET | Get ranked leaderboard |
| `/api/auth/orcid` | GET | Start ORCID OAuth flow |
| `/api/auth/orcid/session` | GET | Check current ORCID session |
| `/api/auth/orcid/logout` | POST | Sign out of ORCID session |

---

## Contribution Points

| Action | Points |
|--------|--------|
| First login | +50 |
| Daily login via ORCID | +10 |
| Asking a question | +10 per day |

Points are stored persistently in PostgreSQL and reflected on the leaderboard.

---

## Project Structure

```
client/src/
  pages/
    Body.tsx                       - Main layout
    CommunityLeaderboard.tsx       - Leaderboard and profile cards
    UserProfileDashboard.tsx       - Profile editor
    sections/
      ApplicationHeaderSection.tsx - Top nav with auth
      ReefInsightDashboardSection.tsx - Knowledge graph + Telegram panel
  components/
    OrcidLoginButton.tsx           - ORCID sign-in button
    PrivyLoginButton.tsx           - Privy modal trigger
  hooks/
    use-orcid-auth.ts              - ORCID session state
    use-profile-sync.ts            - Auto-sync Privy user to DB

server/
  routes.ts                        - All API routes
  storage.ts                       - Database CRUD via Drizzle
  db.ts                            - PostgreSQL connection
  index.ts                         - Express entry point

shared/
  schema.ts                        - Drizzle schema and Zod types
```

---

## Links

- Telegram Bot: https://t.me/PepothePolyp_bot
- MesoReef DAO: https://github.com/robioreefeco/MesoReefDAO
- Bonfires.ai: https://bonfires.ai
- ORCID: https://orcid.org
