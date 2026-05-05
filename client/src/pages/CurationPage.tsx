import { useState, useRef, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { ipfsImageUrl, ipfsPublicUrl, isIpfsCid, uploadImageToIPFS } from "@/lib/ipfs";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import type { ReefImage, Profile } from "@shared/schema";

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

function OrcidLogo({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none">
      <circle cx="128" cy="128" r="128" fill="#A6CE39"/>
      <path d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 153 93h-28.7v79.4zM88.7 56.8c0 5.5-4.5 10.1-10.1 10.1s-10.1-4.6-10.1-10.1c0-5.6 4.5-10.1 10.1-10.1s10.1 4.5 10.1 10.1z" fill="white"/>
    </svg>
  );
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Submitter profile mini-card ─────────────────────────────────────────────
function SubmitterPill({ profileId, authorFallback }: { profileId: string | null | undefined; authorFallback: string }) {
  const { data } = useQuery<{ profile: Profile }>({
    queryKey: ["/api/profiles", profileId],
    queryFn: () =>
      fetch(`/api/profiles/${encodeURIComponent(profileId!)}`).then(r => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }),
    enabled: !!profileId,
    staleTime: 60_000,
    retry: false,
  });

  const profile = data?.profile;
  const name = profile?.displayName || authorFallback || "Unknown";
  const avatarUrl = profile?.avatarUrl;
  const orcidId = profile?.orcidId;
  const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const inner = (
    <div className="flex items-center gap-2 px-2.5 py-1.5">
      {/* Avatar */}
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-6 h-6 rounded-full object-cover border border-[#83eef025] flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-[#0a293380] border border-[#83eef025] flex items-center justify-center flex-shrink-0">
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-[9px]">{initials}</span>
        </div>
      )}
      {/* Name */}
      <span className="[font-family:'Inter',Helvetica] text-[11px] text-[#d4e9f3cc] leading-none">{name}</span>
      {/* ORCID badge */}
      {orcidId && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#a6ce3920] border border-[#a6ce3940]">
          <OrcidLogo size={9} />
          <span className="[font-family:'Inter',Helvetica] text-[8px] font-semibold text-[#a6ce39]">Verified</span>
        </span>
      )}
      {/* Arrow if clickable */}
      {profileId && (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="ml-auto text-[#d4e9f344]">
          <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );

  if (profileId) {
    return (
      <Link
        href={`/members/${encodeURIComponent(profileId)}`}
        data-testid={`link-submitter-profile-${profileId}`}
        className="flex flex-col rounded-xl bg-[#ffffff06] border border-[#ffffff10] hover:bg-[#ffffff0d] hover:border-[#83eef025] transition-colors no-underline"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="flex flex-col rounded-xl bg-[#ffffff06] border border-[#ffffff10]">
      {inner}
    </div>
  );
}

// ─── Submit Panel ─────────────────────────────────────────────────────────────
type SubmitMode = "upload" | "cid";
type CoordMode = "idle" | "locating" | "manual" | "done";
type SubmitState = "idle" | "uploading" | "submitting" | "success" | "error";

function SubmitPanel({
  authHeaders,
  displayName,
}: {
  authHeaders: () => Promise<Record<string, string>>;
  displayName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SubmitMode>("upload");

  // IPFS state
  const [cid, setCid] = useState("");
  const [cidInput, setCidInput] = useState("");
  const [cidError, setCidError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState(displayName || "");

  // Coordinates
  const [coordMode, setCoordMode] = useState<CoordMode>("idle");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [coordError, setCoordError] = useState("");

  // Submit state
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");

  const activeCid = cid || (mode === "cid" && isIpfsCid(cidInput.trim()) ? cidInput.trim() : "");

  function reset() {
    setCid(""); setCidInput(""); setCidError(""); setPreviewUrl("");
    setTitle(""); setDescription(""); setAuthor(displayName || "");
    setCoordMode("idle"); setLat(""); setLon(""); setCoordError("");
    setSubmitState("idle"); setSubmitError("");
  }

  // ── File upload handler
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setCidError("Only image files are supported"); return; }
    if (file.size > 10 * 1024 * 1024) { setCidError("File must be under 10 MB"); return; }
    setCidError(""); setSubmitState("uploading");
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const result = await uploadImageToIPFS(file);
      setCid(result.cid);
      setSubmitState("idle");
    } catch (e: any) {
      setCidError(e?.message || "Upload failed");
      setSubmitState("idle");
    }
  }, []);

  // ── CID paste handler
  function handleCidBlur() {
    const v = cidInput.trim();
    if (!v) { setCidError(""); setPreviewUrl(""); return; }
    if (!isIpfsCid(v)) { setCidError("That doesn't look like a valid IPFS CID (should start with bafy, Qm, or bafk)"); return; }
    setCidError("");
    setPreviewUrl(ipfsImageUrl(v));
  }

  // ── Geolocation
  function requestLocation() {
    setCoordMode("locating"); setCoordError("");
    if (!navigator.geolocation) { setCoordMode("manual"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
        setCoordMode("done");
      },
      () => setCoordMode("manual"),
      { timeout: 10000 }
    );
  }

  // ── Final submit
  async function handleSubmit() {
    const finalCid = activeCid;
    if (!finalCid) { setSubmitError("Please provide an IPFS CID or upload an image first"); return; }
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) { setCoordError("Latitude must be between −90 and 90"); return; }
    if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) { setCoordError("Longitude must be between −180 and 180"); return; }
    setSubmitState("submitting"); setSubmitError("");
    try {
      const h = await authHeaders();
      const res = await fetch("/api/reef-images", {
        method: "POST",
        headers: h,
        credentials: "include",
        body: JSON.stringify({
          cid: finalCid,
          latitude: latNum,
          longitude: lonNum,
          title: title.trim(),
          author: author.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/reef-images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/curation/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reef-images/mine"] });
      setSubmitState("success");
    } catch (e: any) {
      setSubmitError(e?.message || "Submission failed");
      setSubmitState("idle");
    }
  }

  const inputCls = "w-full rounded-xl px-3 py-2.5 bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f3] text-[11px] [font-family:'Inter',Helvetica] placeholder:text-[#d4e9f333] focus:outline-none focus:border-[#83eef033] transition-colors";
  const canSubmit = !!activeCid && (coordMode === "done" || (lat && lon));

  return (
    <div className="rounded-2xl border border-[#83eef020] bg-[#ffffff06] backdrop-blur-sm overflow-hidden">
      {/* Toggle header */}
      <button
        data-testid="button-toggle-submit-panel"
        onClick={() => { setOpen(o => !o); if (!open) reset(); }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#ffffff06] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#83eef015] border border-[#83eef030] flex items-center justify-center group-hover:bg-[#83eef022] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-left">
            <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">
              Submit a Reef Image
            </div>
            <div className="[font-family:'Inter',Helvetica] text-[#d4e9f355] text-[10px] mt-0.5">
              Upload a file or paste an IPFS CID. Your image enters the review queue
            </div>
          </div>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          className={`text-[#d4e9f344] transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-[#ffffff08] px-5 py-5 flex flex-col gap-5">

          {submitState === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#1dd1a115] border border-[#1dd1a130] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#1dd1a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#1dd1a1] text-sm">Image submitted for review!</p>
                <p className="[font-family:'Inter',Helvetica] text-[#d4e9f355] text-[11px] mt-1">
                  An ORCID-verified curator will review it before it appears on the public map.
                </p>
              </div>
              <button
                data-testid="button-submit-another"
                onClick={() => { reset(); }}
                className="px-4 py-2 rounded-xl bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f3aa] [font-family:'Inter',Helvetica] text-xs hover:bg-[#ffffff10] transition-colors"
              >
                Submit another
              </button>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-[#ffffff08] self-start">
                {(["upload", "cid"] as const).map((m) => (
                  <button
                    key={m}
                    data-testid={`tab-submit-${m}`}
                    onClick={() => { setMode(m); setCid(""); setCidInput(""); setCidError(""); setPreviewUrl(""); }}
                    className={`px-4 py-1.5 rounded-lg text-xs [font-family:'Inter',Helvetica] font-medium transition-colors ${
                      mode === m
                        ? "bg-[#83eef020] border border-[#83eef040] text-[#83eef0]"
                        : "text-[#d4e9f355] hover:text-[#d4e9f3aa]"
                    }`}
                  >
                    {m === "upload" ? "Upload file" : "Paste CID"}
                  </button>
                ))}
              </div>

              {/* Upload mode */}
              {mode === "upload" && (
                <div className="flex flex-col gap-3">
                  <div
                    data-testid="submit-drop-zone"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    className="flex flex-col items-center justify-center gap-3 min-h-[120px] rounded-xl border-2 border-dashed border-[#83eef025] bg-[#83eef006] hover:bg-[#83eef00d] hover:border-[#83eef045] transition-colors cursor-pointer"
                  >
                    {submitState === "uploading" ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
                        <span className="[font-family:'Inter',Helvetica] text-[#83eef0aa] text-xs">Pinning to IPFS…</span>
                      </div>
                    ) : cid ? (
                      <div className="flex flex-col items-center gap-2 w-full px-4">
                        <img src={previewUrl} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                        <span className="[font-family:'Inter',Helvetica] text-[9px] font-mono text-[#83eef066] break-all text-center">{cid}</span>
                        <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f355]">Click to replace</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-[#83eef010] border border-[#83eef025] flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f3aa] text-xs font-medium">Drop image or click to browse</p>
                          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-[10px] mt-0.5">JPEG · PNG · WebP · max 10 MB</p>
                          <p className="[font-family:'Inter',Helvetica] text-[#83eef055] text-[9px] mt-1">Pinned to IPFS via Pinata</p>
                        </div>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="submit-file-input"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                  {cidError && <p className="[font-family:'Inter',Helvetica] text-red-400 text-[10px]">{cidError}</p>}
                </div>
              )}

              {/* CID mode */}
              {mode === "cid" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-[10px] uppercase tracking-widest">IPFS CID</label>
                    <input
                      data-testid="input-cid"
                      type="text"
                      value={cidInput}
                      onChange={e => { setCidInput(e.target.value); setCidError(""); }}
                      onBlur={handleCidBlur}
                      placeholder="bafybeig… or Qm…"
                      className={inputCls}
                    />
                    {cidError && <p className="[font-family:'Inter',Helvetica] text-red-400 text-[10px]">{cidError}</p>}
                  </div>
                  {previewUrl && (
                    <div className="rounded-xl overflow-hidden border border-[#ffffff12] bg-[#00080c]">
                      <img src={previewUrl} alt="IPFS preview" className="w-full max-h-48 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="px-3 py-2 flex items-center gap-2">
                        <a href={ipfsPublicUrl(cidInput.trim())} target="_blank" rel="noopener noreferrer"
                          className="[font-family:'Inter',Helvetica] text-[9px] font-mono text-[#83eef066] hover:text-[#83eef0] transition-colors no-underline truncate">
                          {cidInput.trim()}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              {(cid || (mode === "cid" && isIpfsCid(cidInput.trim()))) && (
                <div className="flex flex-col gap-3 pt-1 border-t border-[#ffffff08]">
                  <p className="[font-family:'Inter',Helvetica] text-[#d4e9f355] text-[10px] uppercase tracking-widest">Image details (optional)</p>

                  <input
                    data-testid="submit-input-title"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Title, e.g. Staghorn coral at 8m, Belize"
                    maxLength={120}
                    className={inputCls}
                  />

                  <input
                    data-testid="submit-input-author"
                    type="text"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    placeholder="Photographer / author credit"
                    maxLength={120}
                    className={inputCls}
                  />

                  <textarea
                    data-testid="submit-input-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description: species, reef condition, depth, date…"
                    maxLength={500}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              )}

              {/* Coordinates */}
              {(cid || (mode === "cid" && isIpfsCid(cidInput.trim()))) && (
                <div className="flex flex-col gap-3 pt-1 border-t border-[#ffffff08]">
                  <div className="flex items-center justify-between">
                    <p className="[font-family:'Inter',Helvetica] text-[#d4e9f355] text-[10px] uppercase tracking-widest">
                      Reef coordinates <span className="normal-case text-red-400 ml-1">required</span>
                    </p>
                    {coordMode === "done" && (
                      <span className="flex items-center gap-1 [font-family:'Inter',Helvetica] text-[10px] text-[#1dd1a1]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Location set
                      </span>
                    )}
                  </div>

                  {coordMode === "idle" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        data-testid="button-use-gps"
                        onClick={requestLocation}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#83eef015] border border-[#83eef030] text-[#83eef0] [font-family:'Inter',Helvetica] text-xs font-medium hover:bg-[#83eef022] transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg>
                        Use my location
                      </button>
                      <button
                        data-testid="button-enter-coords"
                        onClick={() => setCoordMode("manual")}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f3aa] [font-family:'Inter',Helvetica] text-xs hover:bg-[#ffffff10] transition-colors"
                      >
                        Enter manually
                      </button>
                    </div>
                  )}

                  {coordMode === "locating" && (
                    <div className="flex items-center gap-2 text-[#83eef0aa]">
                      <div className="w-4 h-4 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
                      <span className="[font-family:'Inter',Helvetica] text-xs">Requesting location…</span>
                    </div>
                  )}

                  {(coordMode === "manual" || coordMode === "done") && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-[10px]">Latitude</label>
                          <input
                            data-testid="submit-input-lat"
                            type="number"
                            step="any"
                            value={lat}
                            onChange={e => { setLat(e.target.value); setCoordError(""); if (lon) setCoordMode("done"); }}
                            placeholder="e.g. 16.75"
                            className={inputCls}
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-[10px]">Longitude</label>
                          <input
                            data-testid="submit-input-lon"
                            type="number"
                            step="any"
                            value={lon}
                            onChange={e => { setLon(e.target.value); setCoordError(""); if (lat) setCoordMode("done"); }}
                            placeholder="e.g. −87.30"
                            className={inputCls}
                          />
                        </div>
                      </div>
                      {coordError && <p className="[font-family:'Inter',Helvetica] text-red-400 text-[10px]">{coordError}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              {(cid || (mode === "cid" && isIpfsCid(cidInput.trim()))) && (
                <div className="flex flex-col gap-2 pt-1 border-t border-[#ffffff08]">
                  {submitError && <p className="[font-family:'Inter',Helvetica] text-red-400 text-[11px]">{submitError}</p>}
                  <button
                    data-testid="button-submit-image"
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitState === "submitting"}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[linear-gradient(135deg,rgba(131,238,240,0.18)_0%,rgba(63,176,179,0.18)_100%)] border border-[#83eef040] text-[#83eef0] [font-family:'Plus_Jakarta_Sans',Helvetica] text-sm font-semibold hover:bg-[rgba(131,238,240,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {submitState === "submitting" ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Submit for curation
                      </>
                    )}
                  </button>
                  {!canSubmit && (
                    <p className="[font-family:'Inter',Helvetica] text-[#d4e9f333] text-[10px] text-center">
                      {!activeCid ? "Provide a CID or upload an image" : "Set reef coordinates to continue"}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Image card ───────────────────────────────────────────────────────────────
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

        {/* Submitter profile — linked to /members/:profileId */}
        <div className="mt-1">
          <span className="[font-family:'Inter',Helvetica] text-[9px] uppercase tracking-widest text-[#d4e9f344] mb-1 block">
            Submitted by
          </span>
          <SubmitterPill profileId={image.profileId} authorFallback={image.author} />
        </div>

        <div className="flex flex-wrap gap-3 mt-1">
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
          Curator note <span className="normal-case text-[#d4e9f344]">(optional, visible to submitter)</span>
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

// ─── My Submissions panel ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1dd1a115] border border-[#1dd1a130] text-[#1dd1a1] [font-family:'Inter',Helvetica] text-[9px] font-semibold uppercase tracking-wide">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff666615] border border-[#ff666630] text-[#ff8888] [font-family:'Inter',Helvetica] text-[9px] font-semibold uppercase tracking-wide">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Rejected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffb34718] border border-[#ffb34735] text-[#ffb347] [font-family:'Inter',Helvetica] text-[9px] font-semibold uppercase tracking-wide">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5"/></svg>
      Pending
    </span>
  );
}

function MySubmissionsPanel({ submissions, isLoading }: { submissions: ReefImage[]; isLoading: boolean }) {
  const [open, setOpen] = useState(false);

  if (!isLoading && submissions.length === 0) return null;

  const pending = submissions.filter(s => s.status === "pending").length;
  const approved = submissions.filter(s => s.status === "approved").length;
  const rejected = submissions.filter(s => s.status === "rejected").length;

  return (
    <div className="rounded-2xl border border-[#ffffff10] bg-[#ffffff06] backdrop-blur-sm overflow-hidden">
      <button
        data-testid="button-toggle-my-submissions"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#ffffff06] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#d4e9f308] border border-[#d4e9f318] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#d4e9f3aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#d4e9f3aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-left">
            <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">
              My Submissions
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isLoading ? (
                <span className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-[10px]">Loading…</span>
              ) : (
                <>
                  {approved > 0 && <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#1dd1a1]">{approved} approved</span>}
                  {pending > 0 && <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#ffb347]">{pending} pending</span>}
                  {rejected > 0 && <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#ff8888]">{rejected} rejected</span>}
                  {submissions.length === 0 && <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f344]">No submissions yet</span>}
                </>
              )}
            </div>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          className={`text-[#d4e9f344] transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-[#ffffff08] px-5 py-4 flex flex-col gap-3">
          {isLoading && (
            <div className="flex items-center gap-2 py-4 justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
              <span className="[font-family:'Inter',Helvetica] text-[#83eef0aa] text-xs">Loading submissions…</span>
            </div>
          )}
          {!isLoading && submissions.map(img => (
            <div
              key={img.id}
              data-testid={`card-submission-${img.id}`}
              className="flex gap-3 p-3 rounded-xl bg-[#ffffff06] border border-[#ffffff0d]"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#00080c] flex-shrink-0 border border-[#ffffff0d]">
                <img
                  src={ipfsImageUrl(img.cid)}
                  alt={img.title || "Reef image"}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              {/* Details */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-xs leading-snug truncate">
                    {img.title || <span className="text-[#d4e9f344] italic">Untitled</span>}
                  </span>
                  <StatusBadge status={img.status} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="[font-family:'Inter',Helvetica] text-[9px] text-[#83eef066] flex items-center gap-1">
                    <PinIcon />
                    {img.latitude.toFixed(3)}, {img.longitude.toFixed(3)}
                  </span>
                  <span className="[font-family:'Inter',Helvetica] text-[9px] text-[#d4e9f333]">
                    {formatDate(img.createdAt)}
                  </span>
                  <a
                    href={ipfsPublicUrl(img.cid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="[font-family:'Inter',Helvetica] text-[9px] font-mono text-[#83eef044] hover:text-[#83eef0] transition-colors no-underline"
                  >
                    {img.cid.slice(0, 8)}…
                  </a>
                </div>
                {/* Curator note (shown when rejected/approved with a note) */}
                {img.curatorNote && (
                  <div className="mt-0.5 px-2.5 py-1.5 rounded-lg bg-[#ffffff06] border border-[#ffffff0d]">
                    <span className="[font-family:'Inter',Helvetica] text-[9px] uppercase tracking-widest text-[#d4e9f344] block mb-0.5">
                      Curator note
                    </span>
                    <p className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f3aa] leading-relaxed m-0">
                      {img.curatorNote}
                    </p>
                  </div>
                )}
                {img.status === "pending" && (
                  <p className="[font-family:'Inter',Helvetica] text-[9px] text-[#d4e9f333] italic">
                    Awaiting review by an ORCID-verified curator…
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CurationPage() {
  const { authenticated: privyAuthenticated, user, getAccessToken } = usePrivy();
  const { orcidAuthenticated, orcidId: orcidSessionId, profileId: orcidProfileId } = useOrcidAuth();

  const isAuthenticated = privyAuthenticated || orcidAuthenticated;

  // Active profile ID — same pattern as dashboard
  const activeProfileId = orcidAuthenticated && !privyAuthenticated
    ? orcidProfileId
    : user?.id;

  async function authHeaders(): Promise<Record<string, string>> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (privyAuthenticated) {
      const tok = await getAccessToken();
      if (tok) h["x-privy-token"] = tok;
    }
    return h;
  }

  // Load user's own profile from DB — source of truth for orcidId
  const { data: savedProfile } = useQuery<any>({
    queryKey: ["/api/profiles", activeProfileId],
    enabled: isAuthenticated && !!activeProfileId,
    staleTime: 60_000,
  });
  const dbProfile = savedProfile?.profile;

  // Resolve ORCID iD — DB profile.orcidId is the source of truth for Privy users
  // who linked ORCID via the app's own linking flow (not via Privy's native OAuth)
  const privyOrcidAccount = (user as any)?.linkedAccounts?.find?.((a: any) => a.type === "orcid");
  const resolvedOrcidId: string | null =
    orcidSessionId ||
    dbProfile?.orcidId ||
    privyOrcidAccount?.subject ||
    privyOrcidAccount?.orcidId ||
    null;
  const resolvedOrcidName: string | null =
    dbProfile?.orcidName || privyOrcidAccount?.name || null;

  const hasOrcid = !!resolvedOrcidId;

  // Fetch pending curation queue (requires ORCID)
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
    enabled: isAuthenticated && hasOrcid,
    refetchInterval: 30000,
  });

  // Fetch the user's own submissions (all statuses)
  const { data: mySubmissions = [], isLoading: submissionsLoading } = useQuery<ReefImage[]>({
    queryKey: ["/api/reef-images/mine"],
    queryFn: async () => {
      const h = await authHeaders();
      const res = await fetch("/api/reef-images/mine", { headers: h, credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
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
          {/* Community link */}
          <Link
            href="/community"
            data-testid="link-to-community"
            className="flex items-center gap-1.5 text-[#83eef066] hover:text-[#83eef0] transition-colors no-underline text-xs [font-family:'Inter',Helvetica]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden md:inline">Members</span>
          </Link>
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
              Review reef images submitted by community members. Click a submitter's name to view their profile. Approved images appear on the public map. You earn 5 points per decision.
            </p>

            {/* Curator identity badge — only shown when ORCID-verified */}
            {isAuthenticated && hasOrcid && resolvedOrcidId && (
              <div
                data-testid="badge-curator-orcid"
                className="flex items-center gap-2.5 self-start px-3 py-2 rounded-xl bg-[#a6ce3910] border border-[#a6ce3930] mt-1"
              >
                <OrcidLogo size={18} />
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
                <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f366]">Approve: publishes to map</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff8888]" />
                <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f366]">Reject: removes from queue</span>
              </div>
            </div>
          </div>

          {/* Submit panel — any authenticated user can submit */}
          {isAuthenticated && (
            <SubmitPanel
              authHeaders={authHeaders}
              displayName={resolvedOrcidName || undefined}
            />
          )}

          {/* My Submissions — shows status of the user's own submitted images */}
          {isAuthenticated && (
            <MySubmissionsPanel
              submissions={mySubmissions}
              isLoading={submissionsLoading}
            />
          )}

          {/* Access gate — not logged in */}
          {!isAuthenticated && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#83eef010] border border-[#83eef020] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#83eef0" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#83eef0" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-sm">
                Sign in to submit images or access the curation queue.
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
                    Queue is empty. All images have been reviewed.
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
