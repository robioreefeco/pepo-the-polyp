import { useState } from "react";
import { ApplicationHeaderSection } from "./sections/ApplicationHeaderSection";
import { ExplorerNavigationSidebarSection } from "./sections/ExplorerNavigationSidebarSection";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useTranslation } from "react-i18next";

function GraphLoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#00080c] z-10 gap-4">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="animate-pulse">
        <circle cx="5" cy="12" r="2.5" fill="#83eef0" />
        <circle cx="12" cy="5" r="2.5" fill="#83eef066" />
        <circle cx="19" cy="12" r="2.5" fill="#83eef0" />
        <circle cx="12" cy="19" r="2.5" fill="#83eef066" />
        <line x1="5" y1="12" x2="12" y2="5" stroke="#83eef040" strokeWidth="1.2"/>
        <line x1="12" y1="5" x2="19" y2="12" stroke="#83eef040" strokeWidth="1.2"/>
        <line x1="5" y1="12" x2="12" y2="19" stroke="#83eef040" strokeWidth="1.2"/>
        <line x1="12" y1="19" x2="19" y2="12" stroke="#83eef040" strokeWidth="1.2"/>
        <line x1="5" y1="12" x2="19" y2="12" stroke="#83eef030" strokeWidth="1.2"/>
        <line x1="12" y1="5" x2="12" y2="19" stroke="#83eef030" strokeWidth="1.2"/>
      </svg>
      <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-sm opacity-70">
        Loading Knowledge Graph…
      </span>
    </div>
  );
}

export function GraphPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-start relative bg-[#00080c] min-h-screen">
      <img
        className="absolute w-full h-full top-0 left-0 object-cover pointer-events-none"
        alt="Background"
        src="/figmaAssets/coral-microbiome-bg.jpg"
      />
      <div className="absolute w-full h-full top-0 left-0 pointer-events-none bg-[#00080c]/70" />

      <ApplicationHeaderSection />

      <div className="flex flex-row items-start relative self-stretch w-full flex-1 overflow-hidden">
        <div className="hidden md:block">
          <ExplorerNavigationSidebarSection />
        </div>

        <div className="flex flex-col flex-1 self-stretch overflow-hidden relative">
          {/* Title bar */}
          <div className="px-4 pt-4 pb-2 flex items-center gap-3 relative z-10 shrink-0">
            <img className="w-5 h-5 flex-shrink-0" alt="Graph" src="/figmaAssets/container-1.svg" />
            <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-lg tracking-tight">
              {t("nav.knowledgeGraph")}
            </h1>
            <span className="text-[10px] [font-family:'Inter',Helvetica] px-2 py-0.5 rounded-full bg-[#83eef018] border border-[#83eef033] text-[#83eef0cc]">
              Bonfires.ai
            </span>
            <a
              href="https://pepo.app.bonfires.ai/graph"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-graph-external"
              className="ml-auto flex items-center gap-1.5 text-[10px] [font-family:'Inter',Helvetica] text-[#d4e9f350] hover:text-[#83eef0] transition-colors no-underline"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Open full site
            </a>
          </div>

          {/* Full-screen graph iframe */}
          <div
            className="relative flex-1 mx-4 mb-4 rounded-[16px] overflow-hidden border border-[#83eef015]"
            style={{ minHeight: "calc(100vh - 160px)" }}
          >
            <GraphLoadingOverlay visible={loading} />
            <iframe
              src="/api/graph-embed"
              className="w-full h-full border-0"
              style={{ minHeight: "calc(100vh - 160px)" }}
              title="Reef Knowledge Graph — Bonfires.ai"
              data-testid="iframe-knowledge-graph-page"
              onLoad={() => setLoading(false)}
              allow="clipboard-write; clipboard-read; pointer-lock"
            />
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
