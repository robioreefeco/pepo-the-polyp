import { useState, useEffect, useRef, useCallback } from "react";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218616437.png";
import { usePrivy } from "@privy-io/react-auth";

const TELEGRAM_APP_URL = "https://t.me/PepothePolyp_bot";

interface Message {
  id: string;
  role: "pepo" | "user";
  text: string;
  ts: string;
  pointsAwarded?: number;
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <img
        src={pepoPng}
        alt="Pepo"
        className="w-7 h-7 rounded-full border border-[#229ED940] object-cover object-center flex-shrink-0 mb-0.5"
      />
      <div
        className="flex items-center gap-1.5 px-3.5 py-3 rounded-[14px] rounded-bl-[4px]"
        style={{ background: "rgba(34,158,217,0.12)", border: "1px solid rgba(34,158,217,0.22)" }}
      >
        {[0, 0.18, 0.36].map((delay, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#229ED9] animate-bounce"
            style={{ animationDelay: `${delay}s`, animationDuration: "0.9s" }}
          />
        ))}
      </div>
    </div>
  );
}

function PepoBubble({ message }: { message: Message }) {
  return (
    <div className="flex items-end gap-2">
      <img
        src={pepoPng}
        alt="Pepo"
        className="w-7 h-7 rounded-full border border-[#229ED940] object-cover object-center flex-shrink-0 mb-0.5"
      />
      <div
        className="flex flex-col gap-1 px-3.5 py-2.5 rounded-[14px] rounded-bl-[4px] max-w-[215px]"
        style={{ background: "rgba(34,158,217,0.12)", border: "1px solid rgba(34,158,217,0.22)" }}
      >
        <p className="text-[#d4e9f3] text-[12px] [font-family:'Inter',Helvetica] leading-[1.6] m-0 whitespace-pre-wrap break-words">
          {message.text}
        </p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[#229ED966] text-[9px] [font-family:'Inter',Helvetica] leading-none">
            {message.ts}
          </span>
          {message.pointsAwarded && message.pointsAwarded > 0 && (
            <span className="text-[#83eef0] text-[9px] [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold leading-none">
              +{message.pointsAwarded} pts 🎉
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div
        className="flex flex-col gap-1 px-3.5 py-2.5 rounded-[14px] rounded-br-[4px] max-w-[215px]"
        style={{
          background: "linear-gradient(135deg, rgba(34,158,217,0.5) 0%, rgba(26,127,173,0.5) 100%)",
          border: "1px solid rgba(34,158,217,0.4)",
        }}
      >
        <p className="text-white text-[12px] [font-family:'Inter',Helvetica] leading-[1.6] m-0 whitespace-pre-wrap break-words">
          {message.text}
        </p>
        <span className="text-white/40 text-[9px] [font-family:'Inter',Helvetica] text-right leading-none">
          {message.ts}
        </span>
      </div>
    </div>
  );
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "pepo",
    text: "Hi! 👋 I'm Pepo — your MesoReef DAO guide. Ask me anything about coral conservation, governance, or reef science!",
    ts: timestamp(),
  },
];

export function TelegramChatWidget() {
  const [open, setOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { getAccessToken, authenticated: privyAuthenticated } = usePrivy();

  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 80);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const toggle = () => {
    setOpen((o) => !o);
    setShowPulse(false);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text, ts: timestamp() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (privyAuthenticated) {
        const token = await getAccessToken();
        if (token) headers["x-privy-token"] = token;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      const reply = data.response ?? "Sorry, I couldn't get a response right now. Try again!";

      const pepoMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "pepo",
        text: reply,
        ts: timestamp(),
        pointsAwarded: data.pointsAwarded,
      };
      setMessages((prev) => [...prev, pepoMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "pepo",
          text: "Oops — looks like I'm having trouble reaching the reef network. Please try again in a moment! 🪸",
          ts: timestamp(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, privyAuthenticated, getAccessToken]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="fixed right-4 md:right-6 z-[60] flex flex-col items-end gap-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px + 12px)" }}
    >
      {/* Chat panel */}
      {open && (
        <div
          className="w-[300px] md:w-[340px] rounded-[20px] overflow-hidden border border-[#229ED930] flex flex-col"
          style={{
            height: "min(480px, 65vh)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 2px 12px rgba(34,158,217,0.2)",
          }}
          data-testid="widget-pepo-chat-panel"
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 shrink-0"
            style={{ background: "linear-gradient(135deg, #229ED9 0%, #1a7fad 100%)" }}
          >
            <div className="relative flex-shrink-0">
              <img
                src={pepoPng}
                alt="Pepo"
                className="w-10 h-10 rounded-full border-2 border-white/30 object-cover object-center"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#2ecc71] border-2 border-[#1a7fad]" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-bold text-white text-sm [font-family:'Plus_Jakarta_Sans',Helvetica] leading-5">
                Pepo the Polyp
              </span>
              <span className="text-white/70 text-[10px] [font-family:'Inter',Helvetica] leading-4">
                AI reef guide · always online
              </span>
            </div>
            <button
              onClick={toggle}
              aria-label="Close chat"
              data-testid="button-close-chat-widget"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors flex-shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto flex flex-col gap-3 px-4 py-3"
            style={{ background: "rgba(0,8,12,0.97)" }}
          >
            {messages.map((msg) =>
              msg.role === "pepo" ? (
                <PepoBubble key={msg.id} message={msg} />
              ) : (
                <UserBubble key={msg.id} message={msg} />
              )
            )}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="shrink-0 flex items-end gap-2 px-3 py-3 border-t border-[#229ED920]"
            style={{ background: "rgba(0,8,12,0.98)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Pepo anything…"
              rows={1}
              disabled={loading}
              data-testid="input-pepo-chat"
              className="flex-1 resize-none bg-[#229ED912] border border-[#229ED930] rounded-[12px] px-3 py-2 text-[12px] text-[#d4e9f3] placeholder-[#d4e9f340] [font-family:'Inter',Helvetica] leading-[1.5] focus:outline-none focus:border-[#229ED960] transition-colors disabled:opacity-50 max-h-[80px] overflow-y-auto"
              style={{ scrollbarWidth: "none" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              data-testid="button-send-pepo-chat"
              aria-label="Send message"
              className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #229ED9 0%, #1a7fad 100%)",
                boxShadow: input.trim() ? "0 2px 10px rgba(34,158,217,0.4)" : "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div
            className="shrink-0 flex items-center justify-center gap-2 py-2 border-t border-[#229ED910]"
            style={{ background: "rgba(0,8,12,0.98)" }}
          >
            <span className="text-[#d4e9f328] text-[9px] [font-family:'Inter',Helvetica]">
              Also on
            </span>
            <a
              href={TELEGRAM_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-telegram-app-footer"
              className="flex items-center gap-1 text-[#229ED9] text-[9px] [font-family:'Inter',Helvetica] font-medium hover:opacity-80 transition-opacity no-underline"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.67l-2.948-.924c-.64-.203-.652-.64.136-.954l11.5-4.433c.536-.194 1.006.131.836.862z" fill="#229ED9" />
              </svg>
              @PepothePolyp_bot
            </a>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={toggle}
        aria-label="Chat with Pepo"
        data-testid="button-pepo-chat-widget"
        className="relative flex items-center justify-center w-14 h-14 rounded-full transition-transform hover:scale-105 active:scale-95 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #229ED9 0%, #1a7fad 100%)",
          boxShadow: "0 4px 24px rgba(34,158,217,0.5), 0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <img
            src={pepoPng}
            alt="Pepo"
            className="w-10 h-10 rounded-full object-cover object-center"
          />
        )}

        {/* Pulse ring */}
        {!open && showPulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-50"
            style={{ background: "#229ED9" }}
          />
        )}

        {/* Online dot */}
        {!open && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#2ecc71] border-2 border-[#00080c]" />
        )}
      </button>
    </div>
  );
}
