import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ─── Security headers via Helmet ──────────────────────────────────────────────
app.use(
  helmet({
    // Content-Security-Policy — carefully tuned for Privy, Bonfires iframe, and Vite
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'", // required by Vite HMR in dev
          "https://*.privy.io",
          "https://privy.io",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'"],
        // Allow iframes from the knowledge graph and Privy auth widget
        frameSrc: [
          "https://pepo.app.bonfires.ai",
          "https://*.privy.io",
          "https://privy.io",
        ],
        // Allow outbound fetch/XHR to known services
        connectSrc: [
          "'self'",
          "wss:",
          "https://*.privy.io",
          "https://privy.io",
          "https://auth.privy.io",
          "https://pepo.app.bonfires.ai",
          "https://orcid.org",
          "https://pub.orcid.org",
          "https://mesoreefdao.org",
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", "https://orcid.org"],
        frameAncestors: ["'none'"], // Prevent clickjacking — this page cannot be iframed
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    // HSTS — only enforce in production (HTTPS only)
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
    // X-Content-Type-Options: nosniff (default ON)
    // X-Frame-Options: SAMEORIGIN (default ON — we still set frameAncestors in CSP for belt-and-suspenders)
    // X-XSS-Protection: disabled (modern browsers use CSP instead)
    xssFilter: false,
    // Referrer-Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // Don't advertise the server stack
    hidePoweredBy: true,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(
  express.json({
    limit: "100kb", // cap body size to prevent large-payload attacks
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// ─── Request logging ──────────────────────────────────────────────────────────
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// ─── Routes + static + error handler ─────────────────────────────────────────
(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => { log(`serving on port ${port}`); },
  );
})();
