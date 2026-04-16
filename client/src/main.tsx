import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress unhandled promise rejections that originate from browser wallet extensions
// (MetaMask, Rabby, etc.). Privy's wallet connector auto-discovers injected providers;
// in sandboxed or restricted origins those connections fail inside the extension itself.
// Using capture:true ensures this runs before Vite's runtime-error overlay handler.
window.addEventListener(
  "unhandledrejection",
  (event) => {
    const stack: string = event.reason?.stack ?? "";
    const message: string = event.reason?.message ?? "";
    const fromExtension =
      stack.includes("chrome-extension://") ||
      stack.includes("moz-extension://") ||
      stack.includes("safari-web-extension://");
    const isWalletError =
      message.includes("MetaMask") ||
      message.includes("Failed to connect") ||
      message.includes("wallet_requestPermissions") ||
      message.includes("Rabby");
    if (fromExtension || isWalletError) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  },
  { capture: true }
);

createRoot(document.getElementById("root")!).render(<App />);
