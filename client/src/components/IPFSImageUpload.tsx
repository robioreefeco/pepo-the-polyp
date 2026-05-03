import { useState, useRef, useCallback } from "react";
import { uploadImageToIPFS, ipfsImageUrl, ipfsPublicUrl } from "@/lib/ipfs";
import { queryClient } from "@/lib/queryClient";

interface IPFSUploadResult {
  cid: string;
  url: string;
  localUrl: string;
  gateways: string[];
  size: number;
  mimeType: string;
}

interface IPFSImageUploadProps {
  onUpload?: (result: IPFSUploadResult) => void;
  currentCid?: string;
  label?: string;
  compact?: boolean;
  showMapPin?: boolean;
  privyToken?: string;
}

type PinState = "idle" | "asking" | "locating" | "manual" | "pinned" | "skipped" | "error";

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IPFSImageUpload({ onUpload, currentCid, label, compact, showMapPin, privyToken }: IPFSImageUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<IPFSUploadResult | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [pinState, setPinState] = useState<PinState>("idle");
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [pinTitle, setPinTitle] = useState("");
  const [pinAuthor, setPinAuthor] = useState("");
  const [pinDescription, setPinDescription] = useState("");
  const [pinError, setPinError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCid = result?.cid ?? currentCid ?? "";
  const previewSrc = preview || (activeCid ? ipfsImageUrl(activeCid) : "");

  async function submitPin(cid: string, lat: number, lon: number) {
    setPinError("");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (privyToken) headers["x-privy-token"] = privyToken;
    try {
      const res = await fetch("/api/reef-images", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          cid,
          latitude: lat,
          longitude: lon,
          title: pinTitle.trim(),
          author: pinAuthor.trim(),
          description: pinDescription.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: ["/api/reef-images"] });
      setPinState("pinned");
    } catch {
      setPinError("Couldn't pin to map. Try again.");
      setPinState("error");
    }
  }

  function requestGeolocation(cid: string) {
    setPinState("locating");
    if (!navigator.geolocation) {
      setPinState("manual");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => submitPin(cid, pos.coords.latitude, pos.coords.longitude),
      () => setPinState("manual"),
      { timeout: 10000 }
    );
  }

  function handleManualSubmit(cid: string) {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setPinError("Latitude must be between -90 and 90");
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setPinError("Longitude must be between -180 and 180");
      return;
    }
    submitPin(cid, lat, lon);
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB");
      return;
    }
    setError("");
    setPinState("idle");

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const r = await uploadImageToIPFS(file);
      setResult(r);
      onUpload?.(r);
      if (showMapPin) setPinState("asking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onUpload, showMapPin]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Map Pin UI ─────────────────────────────────────────────────────────────
  function MapPinSection({ cid }: { cid: string }) {
    if (pinState === "idle") return null;

    if (pinState === "asking") return (
      <div style={{
        background: "rgba(255,159,67,0.07)", border: "1px solid rgba(255,159,67,0.28)",
        borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 14 }}>🪸</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#ffb347" }}>
            Pin this image to the Regen Reef Network Map?
          </span>
        </div>
        <p style={{ fontSize: 10.5, color: "#d4e9f377", margin: 0, lineHeight: 1.5 }}>
          Your image will appear as a public marker on the map, visible to all visitors.
          Your precise location is only used to place the pin and is never shared beyond that.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            data-testid="pin-title-input"
            value={pinTitle}
            onChange={e => setPinTitle(e.target.value)}
            placeholder="Photo title (optional)"
            maxLength={120}
            style={{
              background: "rgba(0,19,28,0.6)", border: "1px solid rgba(131,238,240,0.2)",
              borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#d4e9f3",
              fontFamily: "Inter, sans-serif", outline: "none",
            }}
          />
          <input
            data-testid="pin-author-input"
            value={pinAuthor}
            onChange={e => setPinAuthor(e.target.value)}
            placeholder="Photographer / author credit (optional)"
            maxLength={120}
            style={{
              background: "rgba(0,19,28,0.6)", border: "1px solid rgba(131,238,240,0.2)",
              borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#d4e9f3",
              fontFamily: "Inter, sans-serif", outline: "none",
            }}
          />
          <textarea
            data-testid="pin-description-input"
            value={pinDescription}
            onChange={e => setPinDescription(e.target.value)}
            placeholder="Brief description: species, reef condition, depth, date… (optional)"
            maxLength={500}
            rows={3}
            style={{
              background: "rgba(0,19,28,0.6)", border: "1px solid rgba(131,238,240,0.2)",
              borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#d4e9f3",
              fontFamily: "Inter, sans-serif", outline: "none", resize: "vertical",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            data-testid="pin-use-location"
            onClick={() => requestGeolocation(cid)}
            style={{
              background: "rgba(255,159,67,0.18)", border: "1px solid rgba(255,159,67,0.45)",
              borderRadius: 8, padding: "7px 14px", cursor: "pointer",
              fontSize: 11, fontWeight: 700, color: "#ffb347",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            📍 Allow location access
          </button>
          <button
            data-testid="pin-enter-manual"
            onClick={() => setPinState("manual")}
            style={{
              background: "transparent", border: "1px solid rgba(131,238,240,0.2)",
              borderRadius: 8, padding: "7px 12px", cursor: "pointer",
              fontSize: 11, color: "#83eef088",
            }}
          >
            Enter coordinates manually
          </button>
          <button
            data-testid="pin-skip"
            onClick={() => setPinState("skipped")}
            style={{
              background: "transparent", border: "none",
              borderRadius: 8, padding: "7px 10px", cursor: "pointer",
              fontSize: 11, color: "#83eef044",
            }}
          >
            Skip
          </button>
        </div>
      </div>
    );

    if (pinState === "locating") return (
      <div style={{
        background: "rgba(255,159,67,0.07)", border: "1px solid rgba(255,159,67,0.28)",
        borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #ffb347", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "#ffb347" }}>Requesting location…</span>
      </div>
    );

    if (pinState === "manual") return (
      <div style={{
        background: "rgba(255,159,67,0.07)", border: "1px solid rgba(255,159,67,0.28)",
        borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 14 }}>🗺️</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#ffb347" }}>Enter reef coordinates</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            data-testid="pin-lat-input"
            value={manualLat}
            onChange={e => setManualLat(e.target.value)}
            placeholder="Latitude (e.g. 17.5)"
            style={{
              flex: 1, background: "rgba(0,19,28,0.6)", border: "1px solid rgba(131,238,240,0.2)",
              borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#d4e9f3",
              fontFamily: "Inter, sans-serif",
            }}
          />
          <input
            data-testid="pin-lon-input"
            value={manualLon}
            onChange={e => setManualLon(e.target.value)}
            placeholder="Longitude (e.g. -87.3)"
            style={{
              flex: 1, background: "rgba(0,19,28,0.6)", border: "1px solid rgba(131,238,240,0.2)",
              borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#d4e9f3",
              fontFamily: "Inter, sans-serif",
            }}
          />
        </div>
        <input
          data-testid="pin-title-input-manual"
          value={pinTitle}
          onChange={e => setPinTitle(e.target.value)}
          placeholder="Photo title (optional)"
          maxLength={120}
          style={{
            background: "rgba(0,19,28,0.6)", border: "1px solid rgba(131,238,240,0.2)",
            borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#d4e9f3",
            fontFamily: "Inter, sans-serif", outline: "none",
          }}
        />
        <input
          data-testid="pin-author-input-manual"
          value={pinAuthor}
          onChange={e => setPinAuthor(e.target.value)}
          placeholder="Photographer / author credit (optional)"
          maxLength={120}
          style={{
            background: "rgba(0,19,28,0.6)", border: "1px solid rgba(131,238,240,0.2)",
            borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#d4e9f3",
            fontFamily: "Inter, sans-serif", outline: "none",
          }}
        />
        <textarea
          data-testid="pin-description-input-manual"
          value={pinDescription}
          onChange={e => setPinDescription(e.target.value)}
          placeholder="Brief description: species, reef condition, depth, date… (optional)"
          maxLength={500}
          rows={3}
          style={{
            background: "rgba(0,19,28,0.6)", border: "1px solid rgba(131,238,240,0.2)",
            borderRadius: 7, padding: "6px 10px", fontSize: 11, color: "#d4e9f3",
            fontFamily: "Inter, sans-serif", outline: "none", resize: "vertical",
          }}
        />
        {pinError && <p style={{ fontSize: 10.5, color: "#ff8888", margin: 0 }}>{pinError}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            data-testid="pin-submit-manual"
            onClick={() => handleManualSubmit(cid)}
            style={{
              background: "rgba(255,159,67,0.18)", border: "1px solid rgba(255,159,67,0.45)",
              borderRadius: 8, padding: "7px 14px", cursor: "pointer",
              fontSize: 11, fontWeight: 700, color: "#ffb347",
            }}
          >
            Pin to map
          </button>
          <button
            onClick={() => setPinState("skipped")}
            style={{
              background: "transparent", border: "none",
              borderRadius: 8, padding: "7px 10px", cursor: "pointer",
              fontSize: 11, color: "#83eef044",
            }}
          >
            Skip
          </button>
        </div>
      </div>
    );

    if (pinState === "pinned") return (
      <div style={{
        background: "rgba(29,209,161,0.07)", border: "1px solid rgba(29,209,161,0.3)",
        borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 9,
      }}>
        <span style={{ fontSize: 14 }}>🌊</span>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1dd1a1" }}>
            Submitted for review!
          </span>
          <p style={{ fontSize: 10, color: "#83eef066", margin: "2px 0 0" }}>
            An ORCID-verified member will review your image before it appears on the map.
          </p>
        </div>
      </div>
    );

    if (pinState === "error") return (
      <div style={{
        background: "rgba(255,100,100,0.07)", border: "1px solid rgba(255,100,100,0.25)",
        borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 11, color: "#ff8888" }}>⚠ {pinError || "Failed to pin image."}</span>
        <button
          onClick={() => setPinState("asking")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#83eef066" }}
        >
          Retry
        </button>
      </div>
    );

    return null;
  }

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {label && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#d4e9f355", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {label}
          </span>
        )}

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          data-testid="ipfs-upload-zone"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px",
            background: dragging ? "rgba(131,238,240,0.1)" : "rgba(131,238,240,0.04)",
            border: `1px dashed ${dragging ? "#83eef0" : "rgba(131,238,240,0.25)"}`,
            borderRadius: 12, cursor: uploading ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="IPFS image"
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
              background: "rgba(131,238,240,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {uploading ? (
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #83eef0", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#83eef066" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: "#d4e9f3bb", fontWeight: 600 }}>
              {uploading ? "Uploading to IPFS…" : activeCid ? "Change image" : "Upload to IPFS"}
            </div>
            {activeCid ? (
              <div style={{ fontSize: 9.5, color: "#83eef077", fontFamily: "monospace", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeCid.slice(0, 20)}…
              </div>
            ) : (
              <div style={{ fontSize: 9.5, color: "#d4e9f344", marginTop: 2 }}>
                JPEG · PNG · GIF · WebP · max 10 MB
              </div>
            )}
          </div>
          {activeCid && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); copyToClipboard(activeCid); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#83eef077", padding: 4 }}
              title="Copy CID"
            >
              {copied ? <span style={{ fontSize: 9, color: "#83eef0" }}>Copied!</span> : <CopyIcon />}
            </button>
          )}
        </div>

        {error && <p style={{ fontSize: 10.5, color: "#ff7b7b", margin: 0 }}>{error}</p>}

        {activeCid && (
          <a
            href={ipfsPublicUrl(activeCid)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 9.5, color: "#83eef066", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ExternalLinkIcon /> View on IPFS gateway
          </a>
        )}

        {showMapPin && activeCid && <MapPinSection cid={activeCid} />}

        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} data-testid="ipfs-file-input"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="#83eef0" strokeWidth="1.8"/>
            <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="#83eef0" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#83eef0cc", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {label}
          </span>
          <span style={{ fontSize: 9, color: "#83eef044", fontFamily: "Inter,sans-serif" }}>
            powered by ipfs/helia
          </span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-testid="ipfs-upload-dropzone"
        style={{
          minHeight: previewSrc ? "auto" : 160,
          background: dragging ? "rgba(131,238,240,0.08)" : "rgba(131,238,240,0.03)",
          border: `2px dashed ${dragging ? "#83eef0" : uploading ? "#83eef055" : "rgba(131,238,240,0.2)"}`,
          borderRadius: 16, cursor: uploading ? "wait" : "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 12, padding: 20, transition: "all 0.15s", position: "relative", overflow: "hidden",
        }}
      >
        {previewSrc && (
          <img
            src={previewSrc}
            alt="IPFS preview"
            style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 10 }}
          />
        )}

        {!previewSrc && (
          <>
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #83eef0", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 13, color: "#83eef0bb" }}>Uploading to IPFS…</span>
              </div>
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: "rgba(131,238,240,0.08)", border: "1px solid rgba(131,238,240,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#d4e9f3bb", margin: "0 0 4px" }}>
                    Drop image here or click to browse
                  </p>
                  <p style={{ fontSize: 11, color: "#d4e9f344", margin: 0 }}>
                    JPEG · PNG · GIF · WebP, up to 10 MB
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {previewSrc && uploading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,8,12,0.7)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #83eef0", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}
      </div>

      {previewSrc && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          data-testid="ipfs-change-image"
          style={{
            alignSelf: "flex-start",
            background: "rgba(131,238,240,0.06)", border: "1px solid rgba(131,238,240,0.2)",
            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
            fontSize: 11, color: "#83eef0aa", fontFamily: "Inter,sans-serif",
          }}
        >
          Change image
        </button>
      )}

      {error && (
        <div style={{ background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.2)", borderRadius: 8, padding: "8px 12px" }}>
          <p style={{ fontSize: 11, color: "#ff8888", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* CID result panel */}
      {activeCid && (
        <div style={{
          background: "rgba(131,238,240,0.05)", border: "1px solid rgba(131,238,240,0.15)",
          borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="#1dd1a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#1dd1a1bb" }}>Stored on IPFS</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <code style={{ flex: 1, fontSize: 10, color: "#83eef0bb", fontFamily: "monospace", wordBreak: "break-all" }}>
              {activeCid}
            </code>
            <button
              type="button"
              data-testid="ipfs-copy-cid"
              onClick={() => copyToClipboard(activeCid)}
              style={{ background: "rgba(131,238,240,0.1)", border: "1px solid rgba(131,238,240,0.2)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#83eef0", fontSize: 9, display: "flex", alignItems: "center", gap: 4 }}
            >
              {copied ? "Copied!" : <><CopyIcon /> CID</>}
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "pinata", href: `https://teal-advisory-zebra-284.mypinata.cloud/ipfs/${activeCid}` },
              { label: "ipfs.io", href: `https://ipfs.io/ipfs/${activeCid}` },
              { label: "cloudflare", href: `https://cloudflare-ipfs.com/ipfs/${activeCid}` },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`ipfs-gateway-${label}`}
                style={{ fontSize: 9.5, color: "#83eef077", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, background: "rgba(131,238,240,0.05)", border: "1px solid rgba(131,238,240,0.12)", borderRadius: 6, padding: "3px 8px" }}
              >
                <ExternalLinkIcon /> {label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Map pin prompt — shown after successful upload */}
      {showMapPin && activeCid && <MapPinSection cid={activeCid} />}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        data-testid="ipfs-file-input-full"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
