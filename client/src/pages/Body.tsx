import { ApplicationHeaderSection } from "./sections/ApplicationHeaderSection";
import { ExplorerNavigationSidebarSection } from "./sections/ExplorerNavigationSidebarSection";
import { ReefInsightDashboardSection } from "./sections/ReefInsightDashboardSection";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { JourneySection } from "@/components/JourneySection";

export const Body = (): JSX.Element => {
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
        {/* Sidebar: hidden on mobile */}
        <div className="hidden md:block">
          <ExplorerNavigationSidebarSection />
        </div>

        {/* Main content column */}
        <div className="flex flex-col flex-1 self-stretch overflow-hidden">
          {/* Profile journey progress — only shown when profile is incomplete */}
          <JourneySection />
          <ReefInsightDashboardSection />
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
};
