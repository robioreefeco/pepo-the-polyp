import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const footerLinks = [
  { label: "PRIVACY", href: "https://mesoreefdao.gitbook.io/privacy-policy" },
  { label: "TERMS", href: "https://mesoreefdao.gitbook.io/terms-and-conditions" },
  { label: "CONSERVATION", href: "https://mesoreefdao.org/science-ai" },
];

interface Message {
  id: string;
  role: "pepo" | "user";
  text: string;
  time: string;
  insight?: { label: string; detail: string };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "pepo",
    text: "Greetings, Explorer. I am Pepo. I've mapped 3,420 new node connections in the MesoAmerican reef today. Which quadrant shall we analyze?",
    time: formatTime(new Date(Date.now() - 60000 * 5)),
  },
];

export const ReefInsightDashboardSection = (): JSX.Element => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch live stats
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const statsData = [
    {
      label: "KNOWLEDGE DENSITY",
      renderValue: () => (
        <div className="relative self-stretch w-full h-8">
          <div className="absolute top-0 left-0 h-8 flex items-center [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-2xl tracking-[0] leading-8 whitespace-nowrap">
            {stats?.knowledgeDensity?.split(" ")[0] || "8.4"}
          </div>
          <div className="absolute top-3.5 left-11 h-4 flex items-center opacity-50 [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#657881] text-xs tracking-[0] leading-4 whitespace-nowrap">
            {stats?.knowledgeDensity?.split(" ")[1] || "TB"}
          </div>
        </div>
      ),
    },
    {
      label: "NETWORK HEALTH",
      renderValue: () => (
        <div className="flex items-center gap-2 relative self-stretch w-full flex-[0_0_auto]">
          <div className="relative w-2 h-2 bg-[#f9a414] rounded-full shadow-[0px_0px_8px_#f9a414]" />
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-2xl tracking-[0] leading-8 whitespace-nowrap">
              {stats?.networkHealth || "99.2%"}
            </div>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text,
      time: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      const pepoMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "pepo",
        text: data.response || "I'm analyzing the reef data now...",
        time: formatTime(new Date()),
        insight:
          data.response?.toLowerCase().includes("correlation") ||
          text.toLowerCase().includes("correlation")
            ? { label: "Insight Detected", detail: "87% correlation with local temperature spikes" }
            : undefined,
      };

      setMessages((prev) => [...prev, pepoMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "pepo",
          text: "I'm having trouble connecting to the reef network. Please try again shortly.",
          time: formatTime(new Date()),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex items-start gap-6 p-6 relative flex-1 self-stretch grow">
      {/* Left Panel: Chat Interface */}
      <div className="flex flex-col items-start justify-between p-6 relative flex-1 self-stretch grow bg-[#001017bf] rounded-[48px] overflow-hidden border border-solid border-[#83eef01a] backdrop-blur-lg backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(16px)_brightness(100%)]">
        {/* Header */}
        <div className="pt-0 pb-8 px-0 flex-[0_0_auto] flex flex-col items-start relative self-stretch w-full">
          <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto]">
            <div className="inline-flex items-center gap-3 relative flex-[0_0_auto]">
              <img
                className="relative flex-[0_0_auto]"
                alt="Container"
                src="/figmaAssets/container.svg"
              />
              <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
                <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-xl tracking-[0] leading-7 whitespace-nowrap">
                  Coral Reef Knowledge
                </div>
              </div>
            </div>
            <Badge className="px-3 py-1 bg-[#83eef01a] rounded-full border border-solid border-[#83eef033] [font-family:'Inter',Helvetica] font-medium text-[#83eef0] text-xs tracking-[1.20px] leading-4 whitespace-nowrap hover:bg-[#83eef01a]">
              ACTIVE LINK
            </Badge>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 grow flex flex-col items-start relative self-stretch w-full overflow-y-auto pb-4 gap-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#83eef033]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-4 w-full ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              {msg.role === "pepo" ? (
                <div className="flex flex-col w-10 h-10 items-start justify-center relative bg-[#ffffff01] rounded-full overflow-hidden border border-solid border-[#83eef066] shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a] flex-shrink-0">
                  <div className="bg-[url(/figmaAssets/pepo.png)] relative flex-1 self-stretch w-full grow bg-cover bg-[50%_50%]" />
                </div>
              ) : (
                <img
                  className="relative w-10 h-10 flex-shrink-0"
                  alt="User"
                  src="/figmaAssets/overlay-border.svg"
                />
              )}

              {/* Bubble */}
              <div
                className={`inline-flex flex-col items-start gap-2 p-5 relative flex-[0_0_auto] max-w-[75%] ${
                  msg.role === "pepo"
                    ? "bg-[#0a293366] rounded-[0px_48px_48px_48px] border border-solid border-[#ffffff0d] backdrop-blur-[2px]"
                    : "bg-[#83eef026] rounded-[48px_0px_48px_48px] border border-solid border-[#83eef033] backdrop-blur-[2px]"
                }`}
              >
                <p className="relative w-fit [font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-sm tracking-[0] leading-5 whitespace-pre-wrap">
                  {msg.text}
                </p>
                {msg.insight && (
                  <div className="inline-flex items-center gap-4 p-4 relative flex-[0_0_auto] bg-[#00000066] rounded-[32px] border border-solid border-[#83eef01a] w-full">
                    <img
                      className="relative flex-[0_0_auto]"
                      alt="Overlay"
                      src="/figmaAssets/overlay.svg"
                    />
                    <div className="inline-flex flex-col items-start relative flex-[0_0_auto] flex-1">
                      <span className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#83eef0] text-xs tracking-[0] leading-4 whitespace-nowrap">
                        {msg.insight.label}
                      </span>
                      <p className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#9aaeb8] text-[11px] tracking-[0] leading-[16.5px] opacity-70">
                        {msg.insight.detail}
                      </p>
                    </div>
                    <span className="relative flex items-center justify-center w-fit [font-family:'Inter',Helvetica] font-normal text-[#f9a414] text-xs text-center tracking-[0] leading-4 underline whitespace-nowrap cursor-pointer flex-shrink-0">
                      Export
                    </span>
                  </div>
                )}
                <time
                  className={`relative flex items-center w-fit opacity-60 [font-family:'Inter',Helvetica] font-normal text-[#9aaeb8] text-[10px] tracking-[0] leading-[16.2px] whitespace-nowrap ${
                    msg.role === "user" ? "self-end text-[#74dfe299]" : ""
                  }`}
                >
                  {msg.time}
                </time>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex flex-col w-10 h-10 items-start justify-center relative bg-[#ffffff01] rounded-full overflow-hidden border border-solid border-[#83eef066] flex-shrink-0">
                <div className="bg-[url(/figmaAssets/pepo.png)] relative flex-1 self-stretch w-full grow bg-cover bg-[50%_50%]" />
              </div>
              <div className="inline-flex items-center gap-2 px-5 py-4 bg-[#0a293366] rounded-[0px_48px_48px_48px] border border-solid border-[#ffffff0d]">
                <Loader2 className="w-4 h-4 text-[#83eef0] animate-spin" />
                <span className="[font-family:'Inter',Helvetica] font-normal text-[#9aaeb8] text-sm">
                  Pepo is analyzing...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-col flex items-start relative self-stretch w-full flex-[0_0_auto] mt-4">
          <div className="flex items-center justify-between pl-6 pr-20 pt-[17px] pb-[18px] bg-[#00000099] rounded-[48px] overflow-hidden border border-solid border-[#ffffff1a] backdrop-blur-[6px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(6px)_brightness(100%)] relative self-stretch w-full flex-[0_0_auto]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Inquire within the Regen Reef Realm..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none [font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-sm tracking-[0] placeholder:text-[#65788166] disabled:opacity-50"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="absolute top-[calc(50%-22px)] right-6 w-16 h-16 flex items-center justify-center rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-[0px_4px_6px_-4px_#83eef033,0px_10px_15px_-3px_#83eef033]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-[#00585a] animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-[#00585a]" />
            )}
          </button>
        </div>
      </div>

      {/* Right Panel: Graph + Stats + Footer */}
      <div className="flex flex-col w-[400px] items-start gap-6 relative self-stretch">
        {/* Live Knowledge Graph from Bonfires.ai */}
        <div className="relative flex-1 self-stretch w-full grow rounded-[32px] overflow-hidden border border-solid border-[#83eef01a] bg-[#00080c]">
          <iframe
            src="https://pepo.app.bonfires.ai/graph"
            title="Pepo Knowledge Graph"
            className="w-full h-full border-none"
            allow="fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href="https://pepo.app.bonfires.ai/graph"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#00000099] rounded-full border border-solid border-[#83eef033] backdrop-blur-sm hover:bg-[#00000099] transition-colors no-underline"
          >
            <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-xs whitespace-nowrap">
              Open Full Graph →
            </span>
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 grid-rows-[93px] h-fit gap-4 w-full">
          {statsData.map((stat, index) => (
            <Card
              key={index}
              className="w-full h-fit flex gap-1 bg-[#00000066] rounded-[48px] border border-solid border-[#ffffff1a] backdrop-blur-md backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(12px)_brightness(100%)] shadow-none"
            >
              <CardContent className="flex flex-col items-start p-5 gap-1 w-full">
                <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto] opacity-70">
                  <span className="flex items-center self-stretch [font-family:'Inter',Helvetica] font-normal text-[#657881] text-[10px] tracking-[1.00px] leading-[15px] relative mt-[-1.00px]">
                    {stat.label}
                  </span>
                </div>
                {stat.renderValue()}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Card */}
        <Card className="flex flex-col items-center gap-4 px-0 py-6 relative self-stretch w-full flex-[0_0_auto] bg-[#00000066] rounded-[48px] border border-solid border-[#ffffff1a] backdrop-blur-md backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(12px)_brightness(100%)] shadow-none">
          <CardContent className="flex flex-col items-center gap-4 p-0 w-full">
            <nav className="inline-flex items-start gap-6 relative flex-[0_0_auto]">
              {footerLinks.map((link) => (
                <div
                  key={link.label}
                  className="inline-flex flex-col items-start relative self-stretch flex-[0_0_auto]"
                >
                  <a
                    className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] tracking-[1.00px] leading-[15px] underline whitespace-nowrap"
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                </div>
              ))}
            </nav>
            <div className="inline-flex flex-col items-center gap-1 relative flex-[0_0_auto] opacity-60">
              <span className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center tracking-[0] leading-3 whitespace-nowrap">
                Copyright © 2026 MesoReef DAO.
              </span>
              <div className="inline-flex items-center gap-1.5 relative flex-[0_0_auto]">
                <span className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center tracking-[0] leading-3 whitespace-nowrap">
                  <span>Powered by </span>
                  <a href="https://bonfires.ai/" rel="noopener noreferrer" target="_blank">
                    <span className="underline">Bonfires.ai</span>
                  </a>
                </span>
                <div className="relative w-[43px] h-2.5 bg-[url(/figmaAssets/bonfires-ai-logo.png)] bg-cover bg-[50%_50%]" />
              </div>
              <span className="relative flex items-center justify-center w-fit [font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center tracking-[0] leading-3 whitespace-nowrap">
                All Rights Reserved.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
