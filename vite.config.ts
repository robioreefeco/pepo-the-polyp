import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const root = path.resolve(import.meta.dirname, "client");

export default defineConfig({
  plugins: [
    nodePolyfills({ protocolImports: true }),
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Force all packages to use the same React instance
      "react": path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom", "wagmi", "viem", "@privy-io/react-auth"],
  },
  root,
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@privy-io/react-auth",
      "wagmi",
      "viem",
      "@ceramicnetwork/http-client",
      "@ceramicnetwork/stream-tile",
      "dids",
      "@didtools/pkh-ethereum",
      "did-session",
    ],
    esbuildOptions: {
      define: {
        global: "globalThis",
        "process.browser": "true",
        "process.env.NODE_ENV": '"development"',
        "process.version": '"v18.0.0"',
        "process.versions": "{}",
        "process.nextTick": "setTimeout",
      },
    },
  },
});
