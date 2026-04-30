import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { ipfsImageUrl, ipfsPublicUrl } from "@/lib/ipfs";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import type { ReefImage } from "@shared/schema";

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ImageCard({
  image,
  onDecide,
  deciding,
}: {
  image: ReefImage;
  onDecide: (id: string, decision: "approved" | "rejected", note: string) => void;
  deciding: string | null;
}) {
  const isPending = deciding === image.id;
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid={`card-curation-${image.id}`}
      className="flex flex-col rounded-2xl overflow-hidden border border-[#ffffff0d] bg-[#ffffff06] backdrop-blur-sm"
    >
      {/* Image */}
      <div className="relative w-full aspect-video bg-[#00080c] overflow-hidden cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <img
          src={ipfsImageUrl(image.cid)}
          alt={image.title || "Reef image"}
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.02]"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <a
            href={ipfsPublicUrl(image.cid)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00080cb2] border border-[#ffffff15] text-[#83eef0aa] hover:text-[#83eef0] transition-colors text-[9px] font-mono no-underline"
            title="View on IPFS"
          >
            {image.cid.slice(0, 10)}…
          </a>
        </div>
        {/* Expand hint */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#00080c80] text-[#d4e9f366] text-[9px] [font-family:'Inter',Helvetica]">
          {expanded ? "click to collapse" : "click to expand"}
        </div>
      </div>

      {/* Full-size expand */}
      {expanded && (
        <div className="w-full bg-[#00080c] border-t border-[#ffffff08]">
          <img
            src={ipfsPublicUrl(image.cid)}
            alt={image.title || "Reef image"}
            className="w-full object-contain max-h-[480px]"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {/* Details */}
      <div className="flex flex-col gap-2 px-4 pt-4 pb-2">
        {image.title && (
          <h3 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm leading-snug m-0">
            {image.title}
          </h3>
        )}
        {image.description && (
          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f3aa] text-[11px] leading-relaxed m-0">
            {image.description}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-0.5">
          {image.author && (
            <span className="[font-family:'Inter',Helvetica] text-[#83eef0aa] text-[10px] flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {image.author}
            </span>
          )}
          <span className="[font-family:'Inter',Helvetica] text-[#83eef066] text-[10px] flex items-center gap-1">
            <PinIcon />
            {image.latitude.toFixed(3)}, {image.longitude.toFixed(3)}
          </span>
          <span className="[font-family:'Inter',Helvetica] text-[#83eef066] text-[10px]">
            {formatDate(image.createdAt)}
          </span>
        </div>
      </div>

      {/* Curator note */}
      <div className="px-4 pb-3">
        <label className="block [font-family:'Inter',Helvetica] text-[#d4e9f366] text-[10px] uppercase tracking-widest mb-1.5">
          Curator note <span className="normal-case text-[#d4e9f344]">(optional — visible to submitter)</span>
        </label>
        <textarea
          data-testid={`textarea-note-${image.id}`}
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Add feedback, context, or a reason for your decision…"
          className="w-full rounded-xl px-3 py-2.5 bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f3] text-[11px] [font-family:'Inter',Helvetica] leading-relaxed placeholder:text-[#d4e9f333] resize-none focus:outline-none focus:border-[#83eef033] focus:bg-[#ffffff0c] transition-colors"
        />
        {note.length > 400 && (
          <p className="text-right text-[9px] text-[#d4e9f344] mt-0.5 [font-family:'Inter',Helvetica]">{note.length}/500</p>
        )}
      </div>

      {/* Approve / Reject — two distinct panels */}
      <div className="flex border-t border-[#ffffff0d]">
        {/* Approve */}
        <button
          data-testid={`button-approve-${image.id}`}
          onClick={() => onDecide(image.id, "approved", note)}
          disabled={isPending}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 bg-[#1dd1a108] hover:bg-[#1dd1a118] border-r border-[#ffffff0d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isPending ? (
            <div className="w-4 h-4 rounded-full border-2 border-[#1dd1a1] border-t-transparent animate-spin" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1dd1a115] border border-[#1dd1a130] flex items-center justify-center group-hover:bg-[#1dd1a125] group-hover:border-[#1dd1a150] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#1dd1a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <span className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#1dd1a1]">Approve</span>
          <span className="[font-family:'Inter',Helvetica] text-[9px] text-[#1dd1a166]">+5 pts · publish to map</span>
        </button>

        {/* Reject */}
        <button
          data-testid={`button-reject-${image.id}`}
          onClick={() => onDecide(image.id, "rejected", note)}
          disabled={isPending}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 bg-[#ff666608] hover:bg-[#ff666618] transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isPending ? (
            <div className="w-4 h-4 rounded-full border-2 border-[#ff8888] border-t-transparent animate-spin" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#ff666615] border border-[#ff666630] flex items-center justify-center group-hover:bg-[#ff666625] group-hover:border-[#ff666650] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#ff8888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <span className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#ff8888]">Reject</span>
          <span className="[font-family:'Inter',Helvetica] text-[9px] text-[#ff888866]">+5 pts · remove from queue</span>
        </button>
      </div>
    </div>
  );
}

export function CurationPage() {
  const { authenticated: privyAuthenticated, user, getAccessToken } = usePrivy();
  const { orcidAuthenticated, orcidId: orcidSessionId } = useOrcidAuth();

  const isAuthenticated = privyAuthenticated || orcidAuthenticated;

  // Resolve ORCID iD from either auth path
  const privyOrcidAccount = (user as any)?.linkedAccounts?.find?.((a: any) => a.type === "orcid");
  const resolvedOrcidId: string | null =
    orcidSessionId ||
    privyOrcidAccount?.subject ||
    privyOrcidAccount?.orcidId ||
    null;
  const resolvedOrcidName: string | null =
    privyOrcidAccount?.name || null;

  const hasOrcid = !!resolvedOrcidId;

  async function authHeaders(): Promise<Record<string, string>> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (privyAuthenticated) {
      const tok = await getAccessToken();
      if (tok) h["x-privy-token"] = tok;
    }
    return h;
  }

  const { data: queue, isLoading, error } = useQuery<ReefImage[]>({
    queryKey: ["/api/curation/queue"],
    queryFn: async () => {
      const h = await authHeaders();
      const res = await fetch("/api/curation/queue", { headers: h, credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const [decidingId, setDecidingId] = useState<string | null>(null);

  const { mutate: decide } = useMutation({
    mutationFn: async ({ id, decision, note }: { id: string; decision: "approved" | "rejected"; note: string }) => {
      setDecidingId(id);
      const h = await authHeaders();
      const res = await fetch(`/api/curation/${id}`, {
        method: "POST",
        headers: h,
        credentials: "include",
        body: JSON.stringify({ decision, curatorNote: note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      setDecidingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/curation/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reef-images"] });
    },
    onError: () => setDecidingId(null),
  });

  return (
    <div className="flex flex-col items-start relative bg-[#00080c] min-h-screen w-full">
      <img className="absolute w-full h-full top-0 left-0 object-cover pointer-events-none opacity-30" alt="" src="/figmaAssets/coral-microbiome-bg.jpg" />
      <div className="absolute w-full h-full top-0 left-0 pointer-events-none bg-[#00080c]/70" />

      <div className="relative z-10 w-full flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[#ffffff0d] backdrop-blur-md bg-[#00080c50]">
          <Link href="/" data-testid="link-back-home" className="flex items-center gap-2 text-[#83eef0b2] hover:text-[#83eef0] transition-colors no-underline">
            <BackIcon />
            <span className="[font-family:'Inter',Helvetica] text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-base">
              Reef Image Curation
            </span>
          </div>
          <div className="w-16" />
        </div>

        {/* Content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-2xl m-0">
                Image Review Queue
              </h1>
              {queue && queue.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffb34720] border border-[#ffb34740] text-[#ffb347] [font-family:'Inter',Helvetica] text-xs font-semibold">
                  {queue.length} pending
                </span>
              )}
            </div>
            <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-sm m-0">
              Review reef images submitted by community members. Approved images appear on the public map. You earn 5 points per decision. Leave a note to give the submitter feedback.
            </p>

            {/* Curator identity badge — only shown when ORCID-verified */}
            {isAuthenticated && hasOrcid && resolvedOrcidId && (
              <div
                data-testid="badge-curator-orcid"
                className="flex items-center gap-2.5 self-start px-3 py-2 rounded-xl bg-[#a6ce3910] border border-[#a6ce3930] mt-1"
              >
                {/* ORCID logo */}
                <svg width="18" height="18" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="128" cy="128" r="128" fill="#A6CE39"/>
                  <path d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 153 93h-28.7v79.4zM88.7 56.8c0 5.5-4.5 10.1-10.1 10.1s-10.1-4.6-10.1-10.1c0-5.6 4.5-10.1 10.1-10.1s10.1 4.5 10.1 10.1z" fill="white"/>
                </svg>
                <div className="flex flex-col">
                  <span className="[font-family:'Inter',Helvetica] text-[9px] uppercase tracking-widest text-[#a6ce3988] leading-none mb-0.5">
                    Curating as verified researcher
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://orcid.org/${resolvedOrcidId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-curator-orcid"
                      className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#a6ce39] no-underline hover:text-[#c5e85a] transition-colors"
                    >
                      orcid.org/{resolvedOrcidId}
                    </a>
                    {resolvedOrcidName && (
                      <span className="[font-family:'Inter',Helvetica] text-[11px] text-[#d4e9f366]">· {resolvedOrcidName}</span>
                    )}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#a6ce39" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#1dd1a1]" />
                <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f366]">Approve — publishes to map</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff8888]" />
                <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f366]">Reject — removes from queue</span>
              </div>
            </div>
          </div>

          {/* Access gate — not logged in */}
          {!isAuthenticated && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#83eef010] border border-[#83eef020] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#83eef0" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#83eef0" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-sm">
                Sign in to access the curation queue.
              </p>
              <Link href="/profile" data-testid="link-sign-in" className="px-5 py-2.5 rounded-xl bg-[#83eef015] border border-[#83eef033] text-[#83eef0] [font-family:'Inter',Helvetica] text-sm font-medium no-underline hover:bg-[#83eef025] transition-colors">
                Go to profile
              </Link>
            </div>
          )}

          {/* Access gate — no ORCID */}
          {isAuthenticated && !hasOrcid && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#a6ce3910] border border-[#a6ce3920] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm-1-7h2v2h-2v-2zm0-8h2v6h-2V7z" fill="#a6ce39" fillOpacity=".6"/></svg>
              </div>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-sm max-w-xs">
                Curation is reserved for ORCID-verified researchers. Link your ORCID iD in your profile to unlock this.
              </p>
              <Link href="/profile" data-testid="link-link-orcid" className="px-5 py-2.5 rounded-xl bg-[#a6ce3915] border border-[#a6ce3933] text-[#a6ce39] [font-family:'Inter',Helvetica] text-sm font-medium no-underline hover:bg-[#a6ce3925] transition-colors">
                Link ORCID iD →
              </Link>
            </div>
          )}

          {/* Queue */}
          {isAuthenticated && hasOrcid && (
            <>
              {isLoading && (
                <div className="flex items-center justify-center py-16 gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
                  <span className="[font-family:'Inter',Helvetica] text-[#83eef0aa] text-sm">Loading queue…</span>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <span className="[font-family:'Inter',Helvetica] text-red-400 text-sm">{(error as Error).message}</span>
                </div>
              )}

              {!isLoading && !error && queue?.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#1dd1a110] border border-[#1dd1a120] flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#1dd1a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-sm">
                    Queue is empty — all images have been reviewed.
                  </p>
                </div>
              )}

              {!isLoading && !error && queue && queue.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {queue.map(img => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      onDecide={(id, decision, note) => decide({ id, decision, note })}
                      deciding={decidingId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
