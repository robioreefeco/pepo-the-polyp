import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

interface GraphNode {
  uuid: string;
  name: string;
  node_type: string;
  labels?: string[];
  summary?: string;
}

interface GraphEdge {
  uuid: string;
  name?: string;
  source_node_uuid: string;
  target_node_uuid: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
  radius: number;
  color: string;
}

const REPULSION = 3200;
const SPRING_K  = 0.028;
const REST_LEN  = 95;
const DAMPING   = 0.82;
const GRAVITY   = 0.006;

function nodeColor(n: GraphNode): string {
  if (n.node_type === "episode") return "#3b82f6";
  const lab = (n.labels ?? []).join(" ").toLowerCase();
  if (lab.includes("person") || lab.includes("human")) return "#f97316";
  return "#22c55e";
}

function nodeRadius(degree: number, type: string): number {
  const base = type === "episode" ? 7 : 5;
  return base + Math.min(degree * 2.5, 14);
}

export function KnowledgeGraphCanvas({ className }: { className?: string }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const animRef     = useRef<number>(0);
  const simNodes    = useRef<SimNode[]>([]);
  const simEdges    = useRef<GraphEdge[]>([]);
  const nodeMap     = useRef<Map<string, SimNode>>(new Map());
  const transform   = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef     = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);
  const initialized = useRef(false);

  const [hovered,    setHovered]    = useState<SimNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { data, isLoading, isError } = useQuery<GraphData>({
    queryKey: ["/api/graph/data"],
  });

  // Build simulation nodes once data arrives
  useEffect(() => {
    if (!data || !canvasRef.current || initialized.current) return;
    initialized.current = true;

    const canvas = canvasRef.current;
    const w = canvas.offsetWidth  || 600;
    const h = canvas.offsetHeight || 400;

    const degrees = new Map<string, number>();
    data.edges.forEach(e => {
      degrees.set(e.source_node_uuid, (degrees.get(e.source_node_uuid) ?? 0) + 1);
      degrees.set(e.target_node_uuid, (degrees.get(e.target_node_uuid) ?? 0) + 1);
    });

    const total = data.nodes.length;
    const nodes: SimNode[] = data.nodes.map((node, i) => {
      const angle = (i / total) * Math.PI * 2;
      const deg   = degrees.get(node.uuid) ?? 0;
      return {
        ...node,
        x:      w / 2 + Math.cos(angle) * 180,
        y:      h / 2 + Math.sin(angle) * 180,
        vx:     (Math.random() - 0.5) * 2,
        vy:     (Math.random() - 0.5) * 2,
        degree: deg,
        radius: nodeRadius(deg, node.node_type),
        color:  nodeColor(node),
      };
    });

    simNodes.current = nodes;
    simEdges.current = data.edges;
    const map = new Map<string, SimNode>();
    nodes.forEach(n => map.set(n.uuid, n));
    nodeMap.current = map;
  }, [data]);

  // Animation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cvs = canvas; // captured non-null reference for closure
    const ctx = cvs.getContext("2d")!;

    function tick() {
      const nodes = simNodes.current;
      const edges = simEdges.current;
      const nmap  = nodeMap.current;

      if (nodes.length) {
        const cx = cvs.width  / 2;
        const cy = cvs.height / 2;

        // Repulsion O(n²) — fine for ~60–120 nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const ni = nodes[i], nj = nodes[j];
            const dx = nj.x - ni.x;
            const dy = nj.y - ni.y;
            const d2 = dx * dx + dy * dy + 1;
            const d  = Math.sqrt(d2);
            const f  = REPULSION / d2;
            const fx = f * dx / d, fy = f * dy / d;
            ni.vx -= fx; ni.vy -= fy;
            nj.vx += fx; nj.vy += fy;
          }
        }

        // Spring attraction along edges
        for (const e of edges) {
          const s = nmap.get(e.source_node_uuid);
          const t = nmap.get(e.target_node_uuid);
          if (!s || !t) continue;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const d  = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const f  = (d - REST_LEN) * SPRING_K;
          s.vx += f * dx / d; s.vy += f * dy / d;
          t.vx -= f * dx / d; t.vy -= f * dy / d;
        }

        // Gravity toward center + damping + integrate
        for (const n of nodes) {
          n.vx += (cx - n.x) * GRAVITY;
          n.vy += (cy - n.y) * GRAVITY;
          n.vx *= DAMPING; n.vy *= DAMPING;
          n.x  += n.vx;   n.y  += n.vy;
        }
      }

      // Draw
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      const tr = transform.current;
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.scale(tr.scale, tr.scale);

      // Edges
      ctx.strokeStyle = "rgba(131,238,240,0.14)";
      ctx.lineWidth   = 1;
      for (const e of simEdges.current) {
        const s = nodeMap.current.get(e.source_node_uuid);
        const t = nodeMap.current.get(e.target_node_uuid);
        if (!s || !t) continue;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      }

      // Nodes + labels
      for (const n of simNodes.current) {
        const r = n.radius;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle   = n.color + "bb";
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        if (r >= 7) {
          const maxCh = Math.floor(r * 2);
          const label = n.name.length > maxCh ? n.name.slice(0, maxCh) + "…" : n.name;
          const fs    = Math.max(8, Math.min(10, r * 0.9));
          ctx.font      = `${fs}px Inter, sans-serif`;
          ctx.fillStyle = "rgba(212,233,243,0.82)";
          ctx.textAlign = "center";
          ctx.fillText(label, n.x, n.y + r + fs + 1);
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Keep canvas pixel size matched to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        canvas.width  = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
      }
    });
    ro.observe(parent);
    canvas.width  = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
    return () => ro.disconnect();
  }, []);

  // ── Mouse handlers ───────────────────────────────────────────────────────────
  const screenToGraph = useCallback((mx: number, my: number) => {
    const tr = transform.current;
    return { gx: (mx - tr.x) / tr.scale, gy: (my - tr.y) / tr.scale };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    if (dragRef.current) {
      transform.current.x = dragRef.current.tx + (mx - dragRef.current.sx);
      transform.current.y = dragRef.current.ty + (my - dragRef.current.sy);
      return;
    }

    const { gx, gy } = screenToGraph(mx, my);
    const hit = simNodes.current.find(n => {
      const dx = n.x - gx, dy = n.y - gy;
      return dx * dx + dy * dy <= n.radius * n.radius;
    }) ?? null;
    setHovered(hit);
    if (hit) setTooltipPos({ x: mx, y: my });
  }, [screenToGraph]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragRef.current = {
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
      tx: transform.current.x,
      ty: transform.current.y,
    };
  }, []);

  const handleMouseUp   = useCallback(() => { dragRef.current = null; }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    const rect   = canvas.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;
    const tr     = transform.current;
    tr.x     = mx - (mx - tr.x) * factor;
    tr.y     = my - (my - tr.y) * factor;
    tr.scale = Math.max(0.25, Math.min(4, tr.scale * factor));
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-[#00080c]`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#83eef0] border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-[#83eef066] [font-family:'Inter',Helvetica]">Loading graph…</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-[#00080c]`}>
        <span className="text-[11px] text-[#d4e9f333] [font-family:'Inter',Helvetica]">Graph unavailable</span>
      </div>
    );
  }

  return (
    <div
      className={`${className ?? ""} relative select-none`}
      style={{ cursor: dragRef.current ? "grabbing" : "grab", background: "#00080c" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 max-w-[200px] rounded-xl border border-[#83eef020] px-3 py-2 shadow-lg"
          style={{
            left: tooltipPos.x + 14,
            top:  tooltipPos.y - 24,
            background:     "rgba(0,10,18,0.96)",
            backdropFilter: "blur(10px)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div className="font-semibold text-[11px] text-[#83eef0] mb-0.5 leading-tight">{hovered.name}</div>
          <div className="text-[8px] uppercase tracking-widest text-[#d4e9f344] mb-1">{hovered.node_type}</div>
          {hovered.summary && (
            <div
              className="text-[9px] text-[#d4e9f399] leading-relaxed"
              style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {hovered.summary}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-2.5 left-3 flex items-center gap-3">
        {([["#3b82f6", "Episode"], ["#22c55e", "Entity"], ["#f97316", "Person"]] as const).map(([c, l]) => (
          <div key={l} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
            <span className="text-[8px] text-[#d4e9f344] [font-family:'Inter',Helvetica]">{l}</span>
          </div>
        ))}
      </div>

      {/* Interaction hint */}
      <div className="pointer-events-none absolute bottom-2.5 right-3 text-[8px] text-[#d4e9f322] [font-family:'Inter',Helvetica]">
        scroll to zoom · drag to pan · hover for details
      </div>

      {/* Node count */}
      <div className="pointer-events-none absolute top-2 right-3 text-[8px] text-[#83eef033] [font-family:'Inter',Helvetica] tabular-nums">
        {data.nodes.length} nodes · {data.edges.length} edges
      </div>
    </div>
  );
}
