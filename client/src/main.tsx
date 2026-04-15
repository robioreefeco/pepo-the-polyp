import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Privy "not allowed" unhandled rejections that fire when the Privy
// auth iframe can't load (e.g. inside a nested iframe like the Replit preview
// pane). Without this the Vite runtime-error overlay hijacks the screen.
window.addEventListener("unhandledrejection", (event) => {
  const msg: string =
    event?.reason?.message ?? event?.reason?.toString?.() ?? "";
  if (
    msg.includes("not allowed") ||
    msg.includes("Login with") ||
    msg.includes("privy")
  ) {
    event.preventDefault();
    console.warn("[Privy] suppressed unhandled rejection:", msg);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
