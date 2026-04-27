import { useState, useEffect, useRef, useCallback } from "react";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218616437.png";

const TELEGRAM_WEB_URL = "https://web.telegram.org/k/#@PepothePolyp_bot";
const BUTTON_SIZE = 56; // w-14 h-14
const STORAGE_KEY = "pepo_widget_pos";

let popupRef: Window | null = null;

function openTelegramPopup() {
  if (popupRef && !popupRef.closed) {
    popupRef.focus();
    return;
  }
  const w = 420;
  const h = 680;
  const left = Math.max(0, window.screenX + window.outerWidth - w - 24);
  const top = Math.max(0, window.screenY + window.outerHeight - h - 80);
  popupRef = window.open(
    TELEGRAM_WEB_URL,
    "pepo_telegram_chat",
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function defaultPosition() {
  const margin = 16;
  return {
    x: window.innerWidth - BUTTON_SIZE - margin,
    y: window.innerHeight - BUTTON_SIZE - margin - 88 - 12,
  };
}

function loadPosition(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        // Clamp into viewport in case screen size changed
        return {
          x: clamp(parsed.x, 0, window.innerWidth - BUTTON_SIZE),
          y: clamp(parsed.y, 0, window.innerHeight - BUTTON_SIZE),
        };
      }
    }
  } catch {}
  return defaultPosition();
}

export function TelegramChatWidget() {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => loadPosition());
  const [showPulse, setShowPulse] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const dragState = useRef({
    active: false,
    startPointerX: 0,
    startPointerY: 0,
    startElX: 0,
    startElY: 0,
    moved: false,
  });
  const popupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse timeout
  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Track popup closed
  useEffect(() => {
    if (popupOpen) {
      popupIntervalRef.current = setInterval(() => {
        if (!popupRef || popupRef.closed) {
          setPopupOpen(false);
          popupRef = null;
          if (popupIntervalRef.current) clearInterval(popupIntervalRef.current);
        }
      }, 600);
    }
    return () => {
      if (popupIntervalRef.current) clearInterval(popupIntervalRef.current);
    };
  }, [popupOpen]);

  // Keep button inside viewport on resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: clamp(p.x, 0, window.innerWidth - BUTTON_SIZE),
        y: clamp(p.y, 0, window.innerHeight - BUTTON_SIZE),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.startPointerX;
    const dy = e.clientY - dragState.current.startPointerY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragState.current.moved = true;
    }
    const newX = clamp(dragState.current.startElX + dx, 0, window.innerWidth - BUTTON_SIZE);
    const newY = clamp(dragState.current.startElY + dy, 0, window.innerHeight - BUTTON_SIZE);
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      setDragging(false);
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);

      // Save position
      setPos((p) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
        return p;
      });

      // Only trigger click if it wasn't a drag
      if (!dragState.current.moved) {
        setShowPulse(false);
        if (popupRef && !popupRef.closed) {
          popupRef.focus();
        } else {
          openTelegramPopup();
          setPopupOpen(true);
        }
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    },
    [onPointerMove]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      dragState.current = {
        active: true,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startElX: pos.x,
        startElY: pos.y,
        moved: false,
      };
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [pos, onPointerMove, onPointerUp]
  );

  return (
    <button
      onPointerDown={onPointerDown}
      aria-label={popupOpen ? "Bring chat to front" : "Chat with Pepo on Telegram"}
      data-testid="button-pepo-chat-widget"
      className="group fixed z-[60] flex items-center justify-center rounded-full select-none touch-none"
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        left: pos.x,
        top: pos.y,
        cursor: dragging ? "grabbing" : "grab",
        background: "linear-gradient(135deg, #229ED9 0%, #1a7fad 100%)",
        boxShadow: popupOpen
          ? "0 4px 24px rgba(34,158,217,0.7), 0 2px 8px rgba(0,0,0,0.4)"
          : "0 4px 24px rgba(34,158,217,0.5), 0 2px 8px rgba(0,0,0,0.4)",
        transition: dragging ? "none" : "box-shadow 0.2s",
      }}
    >
      <img
        src={pepoPng}
        alt="Pepo"
        draggable={false}
        className="w-10 h-10 rounded-full object-cover object-center pointer-events-none"
      />

      {/* Tooltip */}
      <span
        className="absolute bottom-full mb-2.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#d4e9f3] [font-family:'Inter',Helvetica]"
        style={{ background: "rgba(0,8,12,0.88)", border: "1px solid rgba(34,158,217,0.25)" }}
      >
        {dragging ? "Drop anywhere" : popupOpen ? "Bring to front" : "Chat with Pepo"}
      </span>

      {/* Pulse ring */}
      {!popupOpen && showPulse && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-50 pointer-events-none"
          style={{ background: "#229ED9" }}
        />
      )}

      {/* Online / active dot */}
      <span
        className={`absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#00080c] transition-colors pointer-events-none ${
          popupOpen ? "bg-[#83eef0]" : "bg-[#2ecc71]"
        }`}
      />
    </button>
  );
}
