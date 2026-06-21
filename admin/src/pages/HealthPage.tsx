import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Server, Database, Cpu, Clock } from "lucide-react";
import { api } from "../services/api";
import { PageHeader, StatCard, Card, CardHeader, Badge, Btn, Spinner } from "../components/ui";

const ENDPOINTS = [
  { label: "Health",            path: "/health",                      method: "GET"  },
  { label: "All Schemes",       path: "/api/schemes",                 method: "GET"  },
  { label: "CSC Nearby",        path: "/api/csc/nearby?lat=13&lng=80&state=TN", method: "GET" },
  { label: "Admin Stats",       path: "/api/admin/stats",             method: "GET"  },
  { label: "Admin Graph Stats", path: "/api/admin/graph-stats",       method: "GET"  },
  { label: "Admin Health",      path: "/api/admin/health",            method: "GET"  },
];

interface PingResult {
  label: string; path: string; status: "ok"|"error"|"pending";
  latency_ms: number | null; statusCode: number | null; error?: string;
}

interface LatencyPoint { time: string; [key: string]: number | string; }

function statusKind(s: "ok"|"error"|"pending"): "ok"|"error"|"warn" {
  if (s === "ok")      return "ok";
  if (s === "error")   return "error";
  return "warn";
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
const BASE = rawBase.replace(/\/api\/?$/, "");

export default function HealthPage() {
  const [health,    setHealth]   = useState<any>(null);
  const [pings,     setPings]    = useState<PingResult[]>(
    ENDPOINTS.map(e => ({ label: e.label, path: e.path, status: "pending", latency_ms: null, statusCode: null }))
  );
  const [history,   setHistory]  = useState<LatencyPoint[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [checking,  setChecking] = useState(false);
  const [autoRefresh, setAuto]   = useState(false);

  const loadHealth = useCallback(async () => {
    try { setHealth(await api.health()); }
    catch (e: any) { setHealth({ overall: "error", checks: [], memory: null, error: e.message }); }
    finally { setLoading(false); }
  }, []);

  const pingEndpoints = useCallback(async () => {
    setChecking(true);
    const results: PingResult[] = [];
    const point: LatencyPoint = { time: new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" }) };

    for (const ep of ENDPOINTS) {
      const start = performance.now();
      try {
        const headers: Record<string, string> = {};
        const key = import.meta.env.VITE_ADMIN_KEY || "";
        if (key) {
          headers["x-admin-key"] = key;
        }
        const res = await fetch(`${BASE}${ep.path}`, { method: ep.method, headers });
        const ms  = Math.round(performance.now() - start);
        results.push({ label: ep.label, path: ep.path, status: res.ok ? "ok" : "error", latency_ms: ms, statusCode: res.status });
        point[ep.label] = ms;
      } catch (err: any) {
        const ms = Math.round(performance.now() - start);
        results.push({ label: ep.label, path: ep.path, status: "error", latency_ms: ms, statusCode: null, error: err.message });
        point[ep.label] = ms;
      }
    }

    setPings(results);
    setHistory(prev => [...prev.slice(-29), point]);
    setChecking(false);
  }, []);

  useEffect(() => {
    loadHealth();
    pingEndpoints();
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { loadHealth(); pingEndpoints(); }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, loadHealth, pingEndpoints]);

  const handleRefresh = async () => { await Promise.all([loadHealth(), pingEndpoints()]); };

  const okCount  = pings.filter(p => p.status === "ok").length;
  const errCount = pings.filter(p => p.status === "error").length;
  const avgMs    = pings.filter(p => p.latency_ms !== null).reduce((a, b) => a + (b.latency_ms||0), 0) / (pings.filter(p=>p.latency_ms!==null).length || 1);

  if (loading) return <Spinner label="Running health checks…" />;

  return (
    <div className="page">
      <PageHeader
        title="System Health"
        subtitle="Live service status, latency monitoring, memory usage"
        actions={
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--text-2)", cursor:"pointer" }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAuto(e.target.checked)}
                style={{ width:14, height:14, accentColor:"var(--gold)" }} />
              Auto (30s)
            </label>
            <Btn variant="outline" size="sm" loading={checking} onClick={handleRefresh}>
              <RefreshCw size={13} /> Refresh
            </Btn>
          </div>
        }
      />

      {/* Overall status banner */}
      <div style={{
        display:"flex", alignItems:"center", gap:14, padding:"14px 20px",
        background: health?.overall === "ok" ? "#1b3d1c" : health?.overall === "degraded" ? "#3d2e1b" : "#3d1b1b",
        border:`1px solid ${health?.overall === "ok" ? "var(--green)" : health?.overall === "degraded" ? "var(--orange)" : "var(--red)"}`,
        borderRadius:"var(--radius)", marginBottom:24,
      }}>
        {health?.overall === "ok"
          ? <CheckCircle size={22} color="var(--green)" />
          : <XCircle size={22} color={health?.overall === "degraded" ? "var(--orange)" : "var(--red)"} />
        }
        <div>
          <div style={{ fontWeight:700, fontSize:16, color:"var(--text)" }}>
            {health?.overall === "ok" ? "All Systems Operational" : health?.overall === "degraded" ? "Degraded — Some services unavailable" : "Outage Detected"}
          </div>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
            {health?.env || "production"} • Node {health?.node_version || "—"} • Uptime {fmtUptime(health?.checks?.find((c:any) => c.service === "GramSeva API")?.uptime_s || 0)}
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:12 }}>
          <Badge label={`${okCount}/${ENDPOINTS.length} endpoints OK`} kind={okCount === ENDPOINTS.length ? "ok" : errCount > 0 ? "error" : "warn"} dot />
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:14, marginBottom:24 }}>
        <StatCard label="Endpoints OK"   value={`${okCount}/${ENDPOINTS.length}`} accent={okCount===ENDPOINTS.length?"var(--green)":"var(--red)"} icon={<Server size={18}/>} />
        <StatCard label="Avg Latency"    value={`${Math.round(avgMs)}ms`}          accent={avgMs<300?"var(--green)":avgMs<800?"var(--orange)":"var(--red)"} icon={<Clock size={18}/>} />
        <StatCard label="Heap Used"      value={`${health?.memory?.heap_used_mb||0} MB`} accent="var(--blue)" icon={<Cpu size={18}/>} />
        <StatCard label="Heap Total"     value={`${health?.memory?.heap_total_mb||0} MB`} accent="var(--purple)" />
        <StatCard label="RSS Memory"     value={`${health?.memory?.rss_mb||0} MB`} accent="var(--orange)" />
      </div>

      {/* Row 1: Service checks + Endpoint table */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* External service checks */}
        <Card>
          <CardHeader title="External Services" />
          <div style={{ padding:"6px 0" }}>
            {(health?.checks || []).map((c: any) => (
              <div key={c.service} style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 18px",
                borderBottom:"1px solid var(--border)",
              }}>
                <div style={{
                  width:10, height:10, borderRadius:"50%", flexShrink:0,
                  background: c.status === "ok" ? "var(--green)" : "var(--red)",
                  boxShadow: c.status === "ok" ? "0 0 6px var(--green)" : "0 0 6px var(--red)",
                }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>{c.service}</div>
                  {c.error && <div style={{ fontSize:11, color:"var(--red)", marginTop:2 }}>{c.error}</div>}
                  {c.uptime_s && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>Uptime: {fmtUptime(c.uptime_s)}</div>}
                </div>
                <Badge label={c.status === "ok" ? "Operational" : "Down"} kind={c.status === "ok" ? "ok" : "error"} dot />
                {c.latency_ms !== null && (
                  <span style={{ fontSize:12, color: c.latency_ms < 200 ? "var(--green)" : c.latency_ms < 600 ? "var(--orange)" : "var(--red)", fontWeight:600, minWidth:55, textAlign:"right" }}>
                    {c.latency_ms}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Endpoint ping results */}
        <Card>
          <CardHeader title="Endpoint Latency" />
          <div style={{ overflowX:"auto" }}>
            <table>
              <thead><tr><th>Endpoint</th><th>Status</th><th style={{ textAlign:"right" }}>Latency</th><th style={{ textAlign:"right" }}>HTTP</th></tr></thead>
              <tbody>
                {pings.map(p => (
                  <tr key={p.path}>
                    <td>
                      <div style={{ fontWeight:600, fontSize:12 }}>{p.label}</div>
                      <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"monospace" }}>{p.path.slice(0,40)}</div>
                    </td>
                    <td>
                      {p.status === "pending"
                        ? <span className="spinner" style={{ width:12, height:12, borderWidth:2 }} />
                        : <Badge label={p.status === "ok" ? "OK" : "Error"} kind={statusKind(p.status)} dot />
                      }
                    </td>
                    <td style={{ textAlign:"right" }}>
                      {p.latency_ms !== null ? (
                        <span style={{ fontWeight:700, fontSize:13,
                          color: p.latency_ms < 200 ? "var(--green)" : p.latency_ms < 800 ? "var(--orange)" : "var(--red)" }}>
                          {p.latency_ms}ms
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign:"right" }}>
                      {p.statusCode ? (
                        <span style={{ fontSize:12, fontFamily:"monospace",
                          color: p.statusCode < 400 ? "var(--green)" : "var(--red)" }}>
                          {p.statusCode}
                        </span>
                      ) : <span style={{ color:"var(--red)", fontSize:11 }}>ERR</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Latency history chart */}
      {history.length > 1 && (
        <Card style={{ marginBottom:16 }}>
          <CardHeader title="Endpoint Latency History (Last 30 Pings)" />
          <div style={{ padding:"12px 8px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history} margin={{ right:24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize:9, fill:"var(--text-muted)" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize:9, fill:"var(--text-muted)" }} unit="ms" />
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:11 }} />
                {ENDPOINTS.map((ep, i) => (
                  <Line key={ep.label} type="monotone" dataKey={ep.label}
                    stroke={["#F5C518","#4CAF50","#29B6F6","#FF9800","#AB47BC","#EF5350"][i % 6]}
                    strokeWidth={1.5} dot={false} name={ep.label} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:6, flexWrap:"wrap" }}>
              {ENDPOINTS.map((ep, i) => (
                <div key={ep.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:20, height:2, background:["#F5C518","#4CAF50","#29B6F6","#FF9800","#AB47BC","#EF5350"][i%6] }} />
                  <span style={{ fontSize:10, color:"var(--text-muted)" }}>{ep.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Threshold guide */}
      <Card>
        <CardHeader title="Latency Thresholds" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", padding:"16px 20px", gap:12 }}>
          {[
            { label:"Fast",    range:"< 200ms",  color:"var(--green)",  desc:"Ideal — Neo4j index hit, no Sarvam call" },
            { label:"Normal",  range:"200–800ms", color:"var(--orange)", desc:"Acceptable — includes Neo4j traversal" },
            { label:"Slow",    range:"> 800ms",   color:"var(--red)",    desc:"Investigate — Sarvam timeout or N+1 query" },
          ].map(({ label, range, color, desc }) => (
            <div key={label} style={{ background:"var(--bg)", borderRadius:"var(--radius-sm)", padding:"12px 14px", borderLeft:`3px solid ${color}` }}>
              <div style={{ fontWeight:700, color, fontSize:14 }}>{label} — {range}</div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
