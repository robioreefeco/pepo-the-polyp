import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { rateLimit } from "express-rate-limit";

const PEPO_API_KEY = process.env.PEPO_API_KEY || "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || "";
const PRIVY_APP_ID = process.env.PRIVY_APP_ID || "";
const BONFIRES_BASE = "https://pepo.app.bonfires.ai";
const BONFIRE_ID = "69372cce6b69184280de3a89";
const ORCID_CLIENT_ID = process.env.ORCID_CLIENT_ID || "";
const ORCID_CLIENT_SECRET = process.env.ORCID_CLIENT_SECRET || "";
const ORCID_BASE = "https://orcid.org";

const orcidStateStore = new Map<string, { createdAt: number }>();

// ─── Rate limiters ─────────────────────────────────────────────────────────────
// General API: 120 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Chat endpoint: 20 requests per 15 minutes per IP (calls external AI API)
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Chat rate limit reached. Please wait a few minutes before sending more messages." },
});

// Auth endpoints: 10 per 15 minutes (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Please try again later." },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function verifyPrivyToken(token: string): Promise<boolean> {
  if (!PRIVY_APP_SECRET || !PRIVY_APP_ID || !token) return false;
  try {
    const res = await fetch(`https://auth.privy.io/api/v1/users/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "privy-app-id": PRIVY_APP_ID,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function sanitizeString(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

// ─── Routes ────────────────────────────────────────────────────────────────────
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Apply general rate limiting to all /api routes
  app.use("/api", generalLimiter);

  // Proxy: fetch knowledge graph data
  app.get("/api/graph", async (_req: Request, res: Response) => {
    try {
      const response = await fetch(`${BONFIRES_BASE}/graph`, {
        headers: {
          "Authorization": `Bearer ${PEPO_API_KEY}`,
          "Content-Type": "application/json",
          "x-api-key": PEPO_API_KEY,
        },
      });
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: "Graph unavailable" });
      }
      const data = await response.json();
      return res.json(data);
    } catch {
      return res.status(500).json({ error: "Graph unavailable" });
    }
  });

  // Proxy: search knowledge graph
  app.post("/api/graph/search", async (req: Request, res: Response) => {
    const query = sanitizeString(req.body?.query, 500);
    if (!query) return res.status(400).json({ error: "query must be a non-empty string under 500 characters" });

    try {
      const response = await fetch(`${BONFIRES_BASE}/api/graph/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PEPO_API_KEY}`,
          "Content-Type": "application/json",
          "x-api-key": PEPO_API_KEY,
        },
        body: JSON.stringify({ bonfire_id: BONFIRE_ID, query }),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Search unavailable" });
      }
      const data = await response.json();
      return res.json(data);
    } catch {
      return res.status(500).json({ error: "Search unavailable" });
    }
  });

  // Chat endpoint: query Pepo AI via Bonfires (stricter rate limit)
  app.post("/api/chat", chatLimiter, async (req: Request, res: Response) => {
    const message = sanitizeString(req.body?.message, 2000);
    if (!message) return res.status(400).json({ error: "message must be a non-empty string under 2000 characters" });

    try {
      const response = await fetch(`${BONFIRES_BASE}/api/graph/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PEPO_API_KEY}`,
          "Content-Type": "application/json",
          "x-api-key": PEPO_API_KEY,
        },
        body: JSON.stringify({ bonfire_id: BONFIRE_ID, query: message }),
      });

      if (!response.ok) {
        console.log("[Pepo API] graph/query failed:", response.status);
        return res.json({ response: generatePepoResponse(message), source: "local" });
      }

      const data = await response.json() as any;

      if (data.success && Array.isArray(data.episodes) && data.episodes.length > 0) {
        const reply = await buildPepoReply(message, data.episodes);
        return res.json({ response: reply, source: "bonfires" });
      }

      // No Bonfires episodes — still enrich with all knowledge sources
      const [wikiCtx, mesoCtx, journalCtx, botCtx] = await Promise.all([
        fetchWikipediaContext(message),
        fetchMesoReefContext(message),
        fetchJournalKnowledge(message),
        fetchBotKnowledge(message),
      ]);
      let fallbackReply = generatePepoResponse(message);
      if (botCtx.length > 0) {
        fallbackReply += `\n\n🤖 **@PepothePolyp_bot Knowledge:**\n`;
        botCtx.forEach(tax => {
          fallbackReply += `• **${tax.name}**: ${tax.description}\n`;
        });
      }
      if (journalCtx.length > 0) {
        fallbackReply += `\n\n📚 **Peer-Reviewed Science:**\n`;
        journalCtx.slice(0, 3).forEach(paper => {
          const badge = paper.isOA ? " 🔓" : "";
          fallbackReply += `• **${paper.title}**${badge}\n  _${paper.journal}${paper.year ? `, ${paper.year}` : ""}_\n  ${paper.abstract.slice(0, 200)}...\n\n`;
        });
      }
      if (wikiCtx) fallbackReply += `\n🌐 **Wikipedia:**\n${wikiCtx.slice(0, 400)}...`;
      if (mesoCtx) {
        const relevantLines = mesoCtx.split("\n")
          .filter(line => line.toLowerCase().split(" ").some(w => w.length > 4 && message.toLowerCase().includes(w)))
          .slice(0, 4).join("\n");
        if (relevantLines.trim()) fallbackReply += `\n\n🐠 **MesoReefDAO:**\n${relevantLines.trim()}`;
      }
      return res.json({ response: fallbackReply, source: "enriched-local" });
    } catch (err) {
      console.log("[Pepo API] error:", err);
      return res.json({ response: generatePepoResponse(message), source: "local" });
    }
  });

  // Graph stats
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const response = await fetch(`${BONFIRES_BASE}/stats`, {
        headers: {
          "Authorization": `Bearer ${PEPO_API_KEY}`,
          "x-api-key": PEPO_API_KEY,
        },
      });
      if (!response.ok) {
        return res.json({ knowledgeDensity: "8.4 TB", networkHealth: "99.2%", nodeConnections: 3420 });
      }
      const data = await response.json();
      return res.json(data);
    } catch {
      return res.json({ knowledgeDensity: "8.4 TB", networkHealth: "99.2%", nodeConnections: 3420 });
    }
  });

  // ORCID OAuth: initiate login
  app.get("/api/auth/orcid", authLimiter, (req: Request, res: Response) => {
    if (!ORCID_CLIENT_ID) {
      return res.status(500).json({ error: "ORCID not configured" });
    }
    const state = crypto.randomBytes(32).toString("hex"); // upgraded from 16 to 32 bytes
    orcidStateStore.set(state, { createdAt: Date.now() });
    // Clean up stale states (older than 10 minutes)
    for (const [k, v] of orcidStateStore.entries()) {
      if (Date.now() - v.createdAt > 10 * 60 * 1000) orcidStateStore.delete(k);
    }
    const host = req.headers.host || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/auth/orcid/callback`;
    const params = new URLSearchParams({
      client_id: ORCID_CLIENT_ID,
      response_type: "code",
      scope: "/authenticate",
      redirect_uri: redirectUri,
      state,
    });
    return res.redirect(`${ORCID_BASE}/oauth/authorize?${params.toString()}`);
  });

  // ORCID OAuth: callback
  app.get("/api/auth/orcid/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;

    if (!code || !state || !orcidStateStore.has(state)) {
      return res.redirect("/?orcid_error=invalid_state");
    }
    orcidStateStore.delete(state);

    const host = req.headers.host || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/auth/orcid/callback`;

    try {
      const tokenRes = await fetch(`${ORCID_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          client_id: ORCID_CLIENT_ID,
          client_secret: ORCID_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) {
        return res.redirect("/profile?orcid_error=token_failed");
      }
      const token = await tokenRes.json() as { access_token: string; orcid: string; name: string };
      const orcid = token.orcid;
      const name = token.name || "";
      const params = new URLSearchParams({ orcid_id: orcid, orcid_name: encodeURIComponent(name) });
      return res.redirect(`/profile?${params.toString()}`);
    } catch {
      return res.redirect("/profile?orcid_error=server_error");
    }
  });

  // Privy token verification endpoint
  app.post("/api/auth/verify", authLimiter, async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "") || sanitizeString(req.body?.token, 4096);
      if (!token) return res.status(401).json({ valid: false, error: "No token provided" });
      const valid = await verifyPrivyToken(token);
      return res.json({ valid });
    } catch {
      return res.status(500).json({ valid: false });
    }
  });

  return httpServer;
}

// ─── Knowledge cache (TTL: 10 min) ────────────────────────────────────────────
const knowledgeCache = new Map<string, { value: string; expiresAt: number }>();

function getCached(key: string): string | null {
  const entry = knowledgeCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.value;
}

function setCached(key: string, value: string, ttlMs = 10 * 60 * 1000): void {
  knowledgeCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ─── Wikipedia knowledge ───────────────────────────────────────────────────────
function extractWikiSearchTerms(query: string): string {
  // Remove common question words and extract meaningful keywords
  const stopWords = new Set(["what", "how", "why", "when", "where", "who", "which", "is", "are", "does", "do",
    "can", "could", "would", "should", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "causes", "cause", "tell", "me", "about", "explain", "describe"]);
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  // Prefer reef-adjacent science terms if present
  const scienceTerms = terms.filter(w =>
    ["coral", "reef", "bleach", "mesoamer", "mesophot", "marine", "ocean", "biodiver",
     "ecosys", "algae", "symbiodinium", "dhw", "restor", "conserv", "dao", "desci",
     "thermal", "temperat", "climate", "species", "habitat", "scleract", "spawning",
     "acidif", "carbonate", "photosyn", "symbiont", "polyp", "zooxanth", "crispr"].some(k => w.includes(k))
  );
  const finalTerms = scienceTerms.length > 0 ? scienceTerms : terms.slice(0, 4);
  return finalTerms.join(" ").trim() || query.slice(0, 60);
}

async function fetchWikipediaContext(query: string): Promise<string> {
  const searchTerms = extractWikiSearchTerms(query);
  const cacheKey = `wiki:${searchTerms}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Search Wikipedia using extracted science/reef keywords
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchTerms)}&limit=2&format=json&namespace=0`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    if (!searchRes.ok) return "";
    const [, titles] = await searchRes.json() as [string, string[], string[], string[]];
    if (!titles || titles.length === 0) return "";

    // Fetch summaries for the top results
    const summaries: string[] = [];
    for (const title of titles.slice(0, 2)) {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });
      if (!summaryRes.ok) continue;
      const summaryData = await summaryRes.json() as { extract?: string; title?: string };
      if (summaryData.extract) {
        summaries.push(`**${summaryData.title}**: ${summaryData.extract.slice(0, 400)}`);
      }
    }

    const result = summaries.join("\n\n");
    if (result) setCached(cacheKey, result);
    return result;
  } catch {
    return "";
  }
}

// ─── MesoReefDAO knowledge ────────────────────────────────────────────────────
const MESOREEFDAO_KNOWLEDGE = `
MesoReefDAO is a decentralized science (DeSci) initiative dedicated to the conservation and regeneration of the Mesoamerican Barrier Reef — the world's second-largest coral reef system, stretching 1,000 km along the coasts of Mexico, Belize, Guatemala, and Honduras.

**Mission**: Scale global coral reef restoration by combining decentralized science, marine biotechnology, community innovation, and blockchain-based governance.

**Key Programs**:
- **Regen Reef Projects**: Field-based coral restoration and biotech research on the Mesoamerican and Mesophotic reefs (below 40m depth).
- **Modular Wetlabs**: Mobile laboratory units for coral and fish biotechnology, enabling in-situ research and assisted evolution experiments.
- **IoT & AI Monitoring**: Real-time ecological sensors (DHW trackers, bleaching alerts) integrated with AI to detect thermal anomalies and trigger restoration protocols.
- **DAO Governance**: On-chain proposals and voting for reef conservation funding, with transparency over how regenerative finance flows into blue economy development.
- **IP-NFTs & DeSci**: Decentralized frameworks for managing biodiversity patents and open-access research protocols.
- **Mesophotic Reefs**: Focus on reefs below 40m as thermal refugia — less studied but critically important for coral survival under climate change.

**Technology Stack**: IoT sensors, Marine Degree Heating Weeks (DHW) monitoring, CRISPR-assisted coral evolution, multi-omics research, blockchain governance (on-chain proposals), and AI-powered species distribution modeling.

**Community**: MesoReefDAO brings together marine biologists, local fishing communities, NGOs, policymakers, and DeSci contributors across the Caribbean and beyond.

**Conservation Focus**: Coral bleaching prevention, thermally resilient genotype identification, blue carbon offsetting, biodiversity incentives, and transparent impact reporting through on-chain mechanisms.
`.trim();

async function fetchMesoReefContext(query: string): Promise<string> {
  const lc = query.toLowerCase();
  const keywords = ["dao", "mesoreefdao", "meso", "regen", "wetlab", "governance", "proposal", "nft", "desci",
    "coral", "reef", "bleach", "conservation", "restoration", "monitoring", "iot", "ai", "marine",
    "mesophotic", "biotechnology", "token", "blockchain", "fund"];
  if (!keywords.some(k => lc.includes(k))) return "";
  return MESOREEFDAO_KNOWLEDGE;
}

// ─── Memento Mori knowledge ───────────────────────────────────────────────────
const MEMENTO_MORI_KNOWLEDGE = `
**Memento Mori** is a permadeath MUD (multi-user dungeon) and DeSci gaming experiment by the MesoReefDAO / robioreefeco team. It is a dark fantasy world where death is permanent, the world lives in a knowledge graph, and AI agents collaboratively narrate every action.

**Core Concept**: Players enter a living world powered by the Bonfires Knowledge Graph. Every character, item, location, NPC, and quest exists as a node in the graph with temporal edges. When a character dies — it dies permanently. Dead characters become lore. The world remembers.

**Architecture**:
- **Client** (TypeScript / Bun): Rich terminal-style MUD interface with virtualized scrolling (Pretext), wallet gate (EIP-1193 / MetaMask), codex entity browser, optimistic inventory updates.
- **Gateway** (FastAPI / Python): WebSocket hub, Matrix transport bridge (one Matrix room per game location), 30 MCP tool endpoints for NPC agents, REST routes for session, inventory, codex, and onchain state.
- **Engine** (CrewAI / Python): 31 AI crews across 10 subsystems — context gathering, event detection, combat, world generation, NPC generation, item generation, quest design, narrative, faction, and enrichment. 12 orchestration flows.
- **Data** (Bonfires KG / Neo4j + LadybugDB, Matrix / Synapse): World graph with bi-temporal edges (valid_at, expired_at), episodic memory via Graphiti.
- **Chain** (MUD framework, Solidity, Redstone L2): Onchain canonical state for characters, deaths, items, and epochs. Dual-write to KG + blockchain on every world mutation.
- **LLM** (OpenRouter / Gemini Flash): All AI reasoning for narration, NPC design, world generation, and enrichment.

**Game Loop**: Player types action → Gateway posts to Matrix room → Engine's RoundController runs context crew, plausibility check, event detection, NPC response window (15s), narration crew, memory consolidation → Narrative posted back → Client renders with rich text.

**Permadeath System**: On death — character node stays in KG forever (append-only), HAS_STATUS:DEAD and DIED_AT edges are created, death recorded onchain (immutable), NPCs remember the fallen, items drop at death location, death feed announces to all players.

**Onchain Integration (Redstone L2)**: MUD tables store Characters (name, wallet, level, alive/dead), Deaths (cause, location, level), Items (rarity, slot, quantity, owner), Epochs (state root, IPFS CID). Chain is the canonicality gate — entities only appear in-client if they exist onchain.

**Knowledge Graph Schema**:
Player --[CARRIES {valid_at, expired_at}]--> Item
Player --[LOCATED_IN]--> Location --[EXIT_TO]--> Location
NPC --[LOCATED_IN]--> Location, NPC --[MEMBER_OF]--> Faction
Player --[HAS_QUEST]--> Quest, Player --[DIED_AT]--> Location

**NPC Agents**: Each NPC is a Bonfires AI agent with its own Matrix identity. Agents access 30 engine tools (KG search, world mutation, inventory, combat) via MCP HTTP. Tool access is gated by KG entity labels.

**Entity Archetypes** (player classes): warrior (heavy armor, swordsmanship), rogue (stealth, lockpicking, daggers), mage (spellcraft, arcane lore), ranger (archery, tracking, foraging).

**AI Crews** (31 total): Context assembly, action classification, combat (5 crews), world generation (4 crews), NPC generation (4 crews), item generation (3 crews), quest design (3 crews), narration + memory (2 crews), faction (2 crews), enrichment.

**Development Status**: Phases 0–10 complete (full game loop, UI, inventory, codex, onchain). Next phases: Matrix end-to-end deployment, world seeding via WorldGenFlow, rich state updates (damage numbers, visual effects), faction integration, narrative art generation.

**Connection to MesoReefDAO**: Memento Mori is an experimental DeSci gaming project by the robioreefeco collective — the same team behind Pepo the Polyp and MesoReefDAO. It explores how Bonfires Knowledge Graphs, onchain canonical state, and AI agent orchestration can power persistent decentralized worlds, a pattern directly applicable to on-chain reef monitoring, conservation incentives, and DAO-governed science.

**Repository**: https://github.com/robioreefeco/memento-mori
`.trim();

const MEMENTO_MORI_KEYWORDS = [
  "memento", "mori", "mud", "permadeath", "dungeon", "dark fantasy", "game",
  "rpg", "npc", "quest", "combat", "narrative", "crewai", "crew", "agent",
  "matrix", "synapse", "redstone", "bun", "pretext", "codex", "inventory",
  "character", "faction", "robioreef", "robioreefeco", "bonfires game",
  "world gen", "world generation", "knowledge graph game", "desci game",
  "blockchain game", "onchain game", "ai game", "permadeath",
];

async function fetchMementoMoriContext(query: string): Promise<string> {
  const lc = query.toLowerCase();
  if (!MEMENTO_MORI_KEYWORDS.some(k => lc.includes(k))) return "";
  // Return the most relevant paragraphs
  const paragraphs = MEMENTO_MORI_KNOWLEDGE.split("\n\n");
  const relevant = paragraphs.filter(p => {
    const words = lc.split(/\s+/).filter(w => w.length > 3);
    return words.some(w => p.toLowerCase().includes(w));
  });
  return (relevant.length ? relevant.slice(0, 5).join("\n\n") : paragraphs.slice(0, 3).join("\n\n"));
}

// ─── @PepothePolyp_bot Telegram Knowledge Taxonomy ────────────────────────────
// All 10 knowledge categories from 165 Telegram bot episodes (auto-updated from Bonfires)

interface BonfireTaxonomy {
  name: string;
  description: string;
  category: string;
  keywords: string[];
}

const TELEGRAM_TAXONOMY_SEED: BonfireTaxonomy[] = [
  {
    name: "Coral Ecology and Functional Restoration",
    description: "Scientific research on coral holobionts, heat-resistant genotypes, and multi-trophic strategies including microfragmentation, probiotics, and mesophotic refugia to prevent functional extinction.",
    category: "scientific_research",
    keywords: ["coral", "holobiont", "genotype", "microfragment", "probiotic", "mesophotic", "refugia", "bleach", "restor", "ecology", "heat", "therma", "symbiodinium", "zooxanth", "polyp"],
  },
  {
    name: "Marine Biotechnology and Omics",
    description: "Molecular biology focusing on CRISPR, multi-omics, and assisted evolution, including research on bioactive compounds (SCRiPs, Galaxin) for pharmaceuticals and gene function validation.",
    category: "scientific_research",
    keywords: ["biotech", "crispr", "omics", "genomic", "evolution", "scrip", "galaxin", "molecular", "pharmac", "gene", "rna", "protein", "bioactive", "sequenc"],
  },
  {
    name: "Decentralized Science (DeSci) and IP-NFTs",
    description: "Blockchain frameworks for managing biodiversity patents, IP-NFTs, and open-access protocols to ensure data transparency, decentralized research funding, and on-chain verification.",
    category: "web3_infrastructure",
    keywords: ["desci", "ip-nft", "ipnft", "nft", "patent", "blockchain", "decentralized", "open-access", "open access", "protocol", "verification", "on-chain", "funding"],
  },
  {
    name: "Regenerative Finance (ReFi) and Blue Economy",
    description: "Market-based conservation using biodiversity credits, tokenized assets, and carbon credits to monetize ecosystem services and support sustainable marine livelihoods.",
    category: "economic_models",
    keywords: ["refi", "blue economy", "biodiversity credit", "carbon credit", "token", "asset", "monetize", "ecosystem services", "livelihood", "market", "credit", "offset", "finance", "fund"],
  },
  {
    name: "Digital Twins and dMRV Systems",
    description: "Integration of AI, IoT, and blockchain for decentralized Monitoring, Reporting, and Verification (dMRV) using virtual replicas, eDNA, and real-time sensors.",
    category: "technology_systems",
    keywords: ["digital twin", "dmrv", "mrv", "iot", "sensor", "edna", "monitor", "report", "verify", "real-time", "data", "ai", "blockchain", "virtual", "replica"],
  },
  {
    name: "DAO Governance and $POLYP Tokenomics",
    description: "Organizational structures for decentralized decision-making, featuring dual-entity legal frameworks, $POLYP tokenomics, and community-driven stewardship models.",
    category: "governance",
    keywords: ["dao", "governance", "polyp", "tokenomics", "token", "vote", "proposal", "stewardship", "decision", "legal", "community", "decentralized", "entity"],
  },
  {
    name: "AI Agents and Knowledge Graphs",
    description: "Human-AI collaboration using agentic workflows (c0ralGPT) and decentralized knowledge graphs to automate data verification, scientific discovery, and information coordination.",
    category: "technology_systems",
    keywords: ["ai agent", "knowledge graph", "c0ralgpt", "coralgpt", "agentic", "workflow", "automate", "discovery", "coordination", "llm", "machine learning", "nlp"],
  },
  {
    name: "Open-Source Hardware and Citizen Science",
    description: "Development of accessible underwater monitoring tools, including CoralAID kits, modular wetlabs, and open-source toolkits for community-led ocean science.",
    category: "community_operations",
    keywords: ["coralaid", "coral aid", "wetlab", "open-source", "open source", "hardware", "citizen science", "underwater", "toolkit", "monitoring", "modular", "community-led"],
  },
  {
    name: "Community Engagement and Cultural Stewardship",
    description: "Fostering stewardship through social media, digital culture (GM/GN), and the integration of arts, music, and ocean literacy to build community cohesion.",
    category: "community_operations",
    keywords: ["community", "social media", "telegram", "discord", "culture", "arts", "music", "ocean literacy", "education", "outreach", "engagement", "stewardship", "cohesion"],
  },
  {
    name: "Global Policy and Strategic Alignment",
    description: "Alignment with international frameworks like the High Seas Treaty and Davos themes, focusing on equitable restoration and global ocean stewardship.",
    category: "governance",
    keywords: ["policy", "high seas", "treaty", "davos", "global", "international", "framework", "equitable", "strategic", "alignment", "ocean stewardship", "conservation policy"],
  },
];

// Live taxonomy cache from Bonfires (refreshed every 60 min)
let liveTaxonomyCache: { taxonomies: BonfireTaxonomy[]; fetchedAt: number } | null = null;

async function fetchLiveTaxonomies(): Promise<BonfireTaxonomy[]> {
  if (liveTaxonomyCache && Date.now() - liveTaxonomyCache.fetchedAt < 60 * 60 * 1000) {
    return liveTaxonomyCache.taxonomies;
  }
  try {
    const res = await fetch(`${BONFIRES_BASE}/api/bonfires/${BONFIRE_ID}`, {
      headers: { "Authorization": `Bearer ${PEPO_API_KEY}`, "x-api-key": PEPO_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return TELEGRAM_TAXONOMY_SEED;
    const data = await res.json() as any;
    const raw = data.latest_taxonomies as any[] || [];
    if (raw.length === 0) return TELEGRAM_TAXONOMY_SEED;

    const merged: BonfireTaxonomy[] = raw.map((t: any) => {
      const seed = TELEGRAM_TAXONOMY_SEED.find(s =>
        s.name.toLowerCase().includes(t.name?.toLowerCase().slice(0, 10))
      );
      return {
        name: t.name || seed?.name || "Knowledge Category",
        description: t.description || seed?.description || "",
        category: t.category || seed?.category || "general",
        keywords: seed?.keywords || [],
      };
    });
    liveTaxonomyCache = { taxonomies: merged, fetchedAt: Date.now() };
    return merged;
  } catch {
    return TELEGRAM_TAXONOMY_SEED;
  }
}

function matchTaxonomies(query: string, taxonomies: BonfireTaxonomy[], maxMatches = 3): BonfireTaxonomy[] {
  const lc = query.toLowerCase();
  const scored = taxonomies.map(t => {
    const score = t.keywords.filter(kw => lc.includes(kw)).length;
    return { t, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, maxMatches).map(({ t }) => t);
}

async function fetchBotKnowledge(query: string): Promise<BonfireTaxonomy[]> {
  // Use seed immediately for fast response; refresh live cache in background
  const seedMatches = matchTaxonomies(query, TELEGRAM_TAXONOMY_SEED);
  // Kick off a background live refresh (non-blocking — updates cache for next call)
  fetchLiveTaxonomies().then(live => {
    if (live !== TELEGRAM_TAXONOMY_SEED) {
      liveTaxonomyCache = { taxonomies: live, fetchedAt: Date.now() };
    }
  }).catch(() => {});
  // If we have a warm cache from a prior live fetch, prefer it
  if (liveTaxonomyCache) {
    return matchTaxonomies(query, liveTaxonomyCache.taxonomies);
  }
  return seedMatches;
}

// ─── Scientific Journal Aggregator ───────────────────────────────────────────

interface JournalPaper {
  title: string;
  journal: string;
  year: number | string;
  abstract: string;
  doi?: string;
  isOA: boolean;
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  if (!invertedIndex || typeof invertedIndex !== "object") return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions as number[]) {
      words[pos] = word;
    }
  }
  return words.filter(Boolean).join(" ");
}

// Coral-reef relevance guard — paper must mention reef/coral science topics
const REEF_RELEVANCE_TERMS = [
  "coral", "reef", "bleach", "symbiodinium", "zooxanthellae", "scleractinian",
  "cnidarian", "calcification", "polyp", "acropora", "porites", "symbiotic algae",
  "marine ecology", "coral restoration", "coral holobiont", "mesophotic",
];

// Hard exclusion: papers clearly about unrelated medical/human biology domains
const REEF_EXCLUSION_TERMS = [
  "human gut", "gut microbiota", "gut microbiome", "intestine", "cancer treatment",
  "human disease", "clinical trial", "patient", "dental", "tooth", "nanoparticle therapy",
  "pharmaceutical drug", "vaccine", "hospital", "lung", "cardiovascular",
];

function isCoralReefRelevant(title: string, abstract: string): boolean {
  const titleLc = title.toLowerCase();
  const abstractLc = abstract.toLowerCase();
  const combined = titleLc + " " + abstractLc;

  // Hard exclusions first
  if (REEF_EXCLUSION_TERMS.some(t => combined.includes(t))) return false;

  // Title must mention a core reef term → strong positive signal
  const titleMatch = REEF_RELEVANCE_TERMS.some(t => titleLc.includes(t));
  if (titleMatch) return true;

  // Abstract must mention reef terms prominently (3+ distinct term types)
  const abstractHits = REEF_RELEVANCE_TERMS.reduce(
    (count, t) => count + (abstractLc.includes(t) ? 1 : 0), 0
  );
  return abstractHits >= 3;
}

function buildCoralReefQuery(userQuery: string): string {
  const terms = extractWikiSearchTerms(userQuery);
  // Always anchor to coral reef context; add user-specific science keywords
  const reefTerms = terms
    .split(" ")
    .filter(w => !["coral", "reef"].includes(w)) // avoid duplicate
    .slice(0, 4)
    .join(" ");
  return reefTerms ? `coral reef ${reefTerms}` : "coral reef";
}

async function fetchOpenAlexPapers(query: string, limit = 12): Promise<JournalPaper[]> {
  const cacheKey = `openalex:${query.slice(0, 80)}`;
  const cached = getCached(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const searchQuery = buildCoralReefQuery(query);
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(searchQuery)}&per-page=${limit}&select=title,abstract_inverted_index,doi,primary_location,publication_year,open_access&sort=cited_by_count:desc`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "PepoThePolyp/1.0 (mesoreefdao.org; mailto:contact@mesoreefdao.org)" },
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const papers: JournalPaper[] = (data.results || [])
      .map((p: any) => {
        const abstract = reconstructAbstract(p.abstract_inverted_index).slice(0, 400);
        return {
          title: p.title || "",
          journal: p.primary_location?.source?.display_name || "Academic Journal",
          year: p.publication_year || "",
          abstract,
          doi: p.doi || "",
          isOA: p.open_access?.is_oa ?? false,
        };
      })
      .filter((p: JournalPaper) => p.title && p.abstract && isCoralReefRelevant(p.title, p.abstract));
    if (papers.length) setCached(cacheKey, JSON.stringify(papers), 15 * 60 * 1000);
    return papers;
  } catch {
    return [];
  }
}

async function fetchEuropePMCPapers(query: string, limit = 5): Promise<JournalPaper[]> {
  const cacheKey = `europepmc:${query.slice(0, 80)}`;
  const cached = getCached(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const searchQuery = buildCoralReefQuery(query);
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(searchQuery)}&format=json&pageSize=${limit}&resultType=core&sort=CITED+desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const papers: JournalPaper[] = (data.resultList?.result || [])
      .filter((p: any) => p.abstractText && p.title && isCoralReefRelevant(p.title, p.abstractText))
      .map((p: any) => ({
        title: p.title,
        journal: p.journalTitle || p.source || "Academic Publication",
        year: p.pubYear || "",
        abstract: (p.abstractText || "").slice(0, 400),
        doi: p.doi || "",
        isOA: p.isOpenAccess === "Y",
      }));
    if (papers.length) setCached(cacheKey, JSON.stringify(papers), 15 * 60 * 1000);
    return papers;
  } catch {
    return [];
  }
}

async function fetchJournalKnowledge(query: string): Promise<JournalPaper[]> {
  // Fetch from both sources in parallel, merge and deduplicate by title
  const [oaPapers, pmcPapers] = await Promise.all([
    fetchOpenAlexPapers(query, 4),
    fetchEuropePMCPapers(query, 2),
  ]);

  const seen = new Set<string>();
  const merged: JournalPaper[] = [];
  for (const paper of [...oaPapers, ...pmcPapers]) {
    const key = paper.title.toLowerCase().slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(paper);
    }
  }
  return merged.slice(0, 5);
}

// ─── Reply builder ────────────────────────────────────────────────────────────
async function buildPepoReply(query: string, episodes: any[]): Promise<string> {
  // Fetch all six knowledge sources in parallel
  const [wikiContext, mesoContext, mementoContext, journalPapers, botTaxonomies] = await Promise.all([
    fetchWikipediaContext(query),
    fetchMesoReefContext(query),
    fetchMementoMoriContext(query),
    fetchJournalKnowledge(query),
    fetchBotKnowledge(query),
  ]);

  const top = episodes.slice(0, 3);
  const names = top.map((e: any) => e.name).filter(Boolean);
  const summaries = top
    .map((e: any) => {
      const c = e.content?.content || e.summary || "";
      return c ? c.slice(0, 250).replace(/\s+/g, " ").trim() : "";
    })
    .filter(Boolean);

  let reply = ``;

  // Community knowledge graph results
  if (names.length > 0) {
    reply += `🔬 **Community Knowledge Graph:**\n`;
    names.forEach((name: string, i: number) => {
      reply += `• **${name}**`;
      if (summaries[i]) reply += `\n  ${summaries[i]}...`;
      reply += "\n";
    });
    reply += "\n";
  }

  // @PepothePolyp_bot Telegram taxonomy knowledge
  if (botTaxonomies.length > 0) {
    reply += `🤖 **@PepothePolyp_bot Knowledge (${botTaxonomies.length} topic${botTaxonomies.length > 1 ? "s" : ""}):**\n`;
    botTaxonomies.forEach(tax => {
      const catEmoji: Record<string, string> = {
        scientific_research: "🔬", web3_infrastructure: "⛓️", economic_models: "💱",
        technology_systems: "🛰️", governance: "🏛️", community_operations: "🤝",
      };
      const emoji = catEmoji[tax.category] || "📌";
      reply += `${emoji} **${tax.name}**\n  ${tax.description}\n\n`;
    });
  }

  // Scientific journals section
  if (journalPapers.length > 0) {
    reply += `📚 **Peer-Reviewed Science:**\n`;
    journalPapers.forEach((paper) => {
      const oaBadge = paper.isOA ? " 🔓" : "";
      reply += `• **${paper.title}**${oaBadge}\n`;
      reply += `  _${paper.journal}${paper.year ? `, ${paper.year}` : ""}_\n`;
      if (paper.abstract) reply += `  ${paper.abstract.slice(0, 220)}...\n`;
      if (paper.doi) reply += `  DOI: ${paper.doi}\n`;
      reply += "\n";
    });
  }

  // Wikipedia context
  if (wikiContext) {
    reply += `🌐 **Wikipedia Reference:**\n${wikiContext.slice(0, 500)}...\n\n`;
  }

  // MesoReefDAO context
  if (mesoContext) {
    const relevantLines = mesoContext
      .split("\n")
      .filter(line => {
        const lc = query.toLowerCase();
        return line.toLowerCase().split(" ").some(w => w.length > 4 && lc.includes(w));
      })
      .slice(0, 5)
      .join("\n");
    if (relevantLines.trim()) {
      reply += `🐠 **MesoReefDAO Context:**\n${relevantLines.trim()}\n\n`;
    }
  }

  // Memento Mori context
  if (mementoContext) {
    reply += `🎮 **Memento Mori (DeSci Game):**\n${mementoContext.slice(0, 800)}...\n\n`;
  }

  reply += `🛠️ [github.com/robioreefeco/memento-mori](https://github.com/robioreefeco/memento-mori)`;
  return reply;
}

// ─── Fallback response ────────────────────────────────────────────────────────
const REPO_FOOTER = `\n\n🛠️ [github.com/robioreefeco/memento-mori](https://github.com/robioreefeco/memento-mori)`;

function generatePepoResponse(userMessage: string): string {
  const lc = userMessage.toLowerCase();
  if (lc.includes("coral") || lc.includes("bleach")) {
    return "I'm analyzing the reef knowledge network for coral bleaching data. The MesoAmerican Reef has experienced severe thermal stress events — DHW levels above 8 trigger widespread coral mortality. I track thermally resilient genotypes and mesophotic refugia as key adaptation strategies. Ask me anything specific about bleaching events, DHW metrics, or reef restoration!" + REPO_FOOTER;
  }
  if (lc.includes("dao") || lc.includes("governance") || lc.includes("proposal")) {
    return "MesoReefDAO governs reef conservation through on-chain proposals — transparent funding of Regen Reef projects, wetlab research, IoT monitoring, and biodiversity offsetting. Which governance area would you like to explore?" + REPO_FOOTER;
  }
  if (lc.includes("graph") || lc.includes("node") || lc.includes("knowledge")) {
    return "The Pepo Knowledge Graph holds hundreds of community episodes covering coral ecology, DeSci governance, marine biotechnology, IoT monitoring, and conservation economics. Which quadrant shall we explore?" + REPO_FOOTER;
  }
  if (lc.includes("temperature") || lc.includes("heat") || lc.includes("thermal") || lc.includes("dhw")) {
    return "Sea surface temperatures across the MesoAmerican Reef corridor are monitored in real-time using Marine Degree Heating Weeks (DHW). At 4 DHW bleaching begins; at 8+ DHW widespread mortality occurs. MesoReefDAO integrates IoT sensors and AI to track these thresholds and activate restoration protocols." + REPO_FOOTER;
  }
  if (lc.includes("mesophotic") || lc.includes("deep") || lc.includes("refugia")) {
    return "Mesophotic reefs (40–150m depth) are among MesoReefDAO's key research priorities. These deep reefs remain cooler and may act as thermal refugia — seed banks for thermally resilient coral genotypes. Less studied but critically important for climate adaptation strategies." + REPO_FOOTER;
  }
  if (lc.includes("telegram")) {
    return "You can reach me on Telegram at @PepothePolyp_bot! Click the Telegram Bot link in the sidebar to open our chat directly. I'll send you real-time reef alerts and knowledge graph insights there too." + REPO_FOOTER;
  }
  return "Greetings, Explorer. I am Pepo, your guide to the MesoAmerican Reef knowledge network — powered by the Pepo Knowledge Graph, Wikipedia science, and MesoReefDAO documentation. I can help you explore coral bleaching data, DAO governance, thermal stress events, mesophotic reefs, marine biotechnology, and species distribution. What would you like to explore?" + REPO_FOOTER;
}
