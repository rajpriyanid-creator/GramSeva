import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { GitBranch, Link, AlertTriangle, CheckCircle } from "lucide-react";
import { api } from "../services/api";
import { PageHeader, StatCard, Card, CardHeader, Badge, Spinner } from "../components/ui";

const NODE_COLORS: Record<string,string> = {
  Scheme: "#F5C518", Criteria: "#4CAF50", Department: "#29B6F6",
  State: "#FF9800", District: "#AB47BC", CSC: "#EF5350",
};
const REL_COLORS: Record<string,string> = {
  REQUIRES: "#F5C518", OFFERED_BY: "#29B6F6", AVAILABLE_IN: "#FF9800",
  LOCATED_IN: "#4CAF50", PART_OF: "#AB47BC",
};

export default function GraphPage() {
  const [data, setData]   = useState<any>(null);
  const [loading, setLoad]= useState(true);

  useEffect(() => {
    api.graphStats().then(setData).finally(() => setLoad(false));
  }, []);

  if (loading) return <Spinner label="Querying Neo4j graph…" />;
  if (!data)   return <div style={{ color:"var(--red)", padding:32 }}>Failed to load graph stats.</div>;

  const nodeRows = Object.entries(data.nodes || {}).map(([label, count]) => ({
    label, count: count as number, color: NODE_COLORS[label] || "var(--text-muted)",
  }));

  const relRows = Object.entries(data.relationships || {}).map(([rel, count]) => ({
    rel, count: count as number, color: REL_COLORS[rel] || "var(--text-muted)",
  }));

  const stateData = (data.schemes_by_state || []).slice(0, 15);
  const topCrit   = data.top_schemes_by_criteria || [];

  // Radar data for node balance
  const radarData = nodeRows.map(r => ({ subject: r.label, count: r.count }));

  const healthChecks = [
    { label: "No orphan criteria",     ok: data.orphan_criteria === 0,           detail: `${data.orphan_criteria} orphaned` },
    { label: "Complex schemes (≥4 criteria)", ok: data.complex_schemes > 0,      detail: `${data.complex_schemes} complex` },
    { label: "All states covered",     ok: (data.nodes?.State || 0) >= 10,       detail: `${data.nodes?.State || 0} states` },
    { label: "CSCs geo-indexed",       ok: (data.nodes?.CSC || 0) >= 5,          detail: `${data.nodes?.CSC || 0} CSCs` },
    { label: "Departments linked",     ok: (data.nodes?.Department || 0) > 0,    detail: `${data.nodes?.Department || 0} depts` },
    { label: "Relationships exist",    ok: data.total_relationships > 0,          detail: `${(data.total_relationships||0).toLocaleString()} rels` },
  ];

  return (
    <div className="page">
      <PageHeader title="Graph Explorer" subtitle="Neo4j AuraDB node & relationship statistics" />

      {/* Top KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
        <StatCard label="Total Nodes"         value={(data.total_nodes||0).toLocaleString()} accent="var(--gold)"   icon={<GitBranch size={18}/>} />
        <StatCard label="Total Relationships" value={(data.total_relationships||0).toLocaleString()} accent="var(--green)"  icon={<Link size={18}/>} />
        <StatCard label="Orphan Criteria"     value={data.orphan_criteria||0}                accent={data.orphan_criteria>0?"var(--red)":"var(--green)"} icon={<AlertTriangle size={18}/>} />
        <StatCard label="Complex Schemes"     value={data.complex_schemes||0}                accent="var(--blue)"   icon={<CheckCircle size={18}/>} />
      </div>

      {/* Row 1: Node counts + Relationship counts */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card>
          <CardHeader title="Nodes by Label" />
          <div style={{ padding:"12px 16px" }}>
            {nodeRows.map(({ label, count, color }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:color, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:13, color:"var(--text-2)" }}>{label}</span>
                <div style={{ flex:3, background:"var(--bg)", borderRadius:3, height:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(100,(count/(data.total_nodes||1))*100)}%`, background:color, borderRadius:3 }} />
                </div>
                <span style={{ fontWeight:700, color:"var(--text)", fontSize:14, minWidth:50, textAlign:"right" }}>{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Relationships by Type" />
          <div style={{ padding:"12px 16px" }}>
            {relRows.map(({ rel, count, color }) => (
              <div key={rel} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:color, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:12, color:"var(--text-2)", fontFamily:"monospace" }}>{rel}</span>
                <div style={{ flex:3, background:"var(--bg)", borderRadius:3, height:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(100,(count/(data.total_relationships||1))*100)}%`, background:color, borderRadius:3 }} />
                </div>
                <span style={{ fontWeight:700, color:"var(--text)", fontSize:14, minWidth:50, textAlign:"right" }}>{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Schemes by state bar + Top schemes by criteria */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card>
          <CardHeader title="Schemes Available by State" />
          <div style={{ padding:"12px 8px" }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={stateData} margin={{ right:16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="state" tick={{ fontSize:10, fill:"var(--text-muted)" }} />
                <YAxis tick={{ fontSize:10, fill:"var(--text-muted)" }} />
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:11 }} />
                <Bar dataKey="count" fill="var(--orange)" radius={[3,3,0,0]} name="Schemes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Top Schemes by Criteria Depth" />
          <div style={{ padding:"12px 8px" }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topCrit} layout="vertical" margin={{ left:8, right:24 }}>
                <XAxis type="number" tick={{ fontSize:9, fill:"var(--text-muted)" }} />
                <YAxis type="category" dataKey="id" tick={{ fontSize:9, fill:"var(--text-muted)" }} width={90} />
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:11 }}
                  formatter={(v:any, _:any, p:any) => [v, p.payload.name || p.payload.id]} />
                <Bar dataKey="criteria_count" fill="var(--purple)" radius={[0,3,3,0]} name="Criteria" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3: Graph radar + Health checks */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card>
          <CardHeader title="Node Distribution Radar" />
          <div style={{ padding:"12px 8px" }}>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={90}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:"var(--text-2)" }} />
                <PolarRadiusAxis angle={90} tick={{ fontSize:9, fill:"var(--text-muted)" }} />
                <Radar name="Nodes" dataKey="count" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.25} />
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Graph Health Checks" />
          <div style={{ padding:"18px 20px" }}>
            {healthChecks.map(({ label, ok, detail }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background: ok ? "#1b3d1c" : "#3d1b1b",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {ok ? <CheckCircle size={13} color="var(--green)" /> : <AlertTriangle size={12} color="var(--red)" />}
                </div>
                <span style={{ flex:1, fontSize:13, color:"var(--text-2)" }}>{label}</span>
                <span style={{ fontSize:12, color: ok ? "var(--green)" : "var(--red)", fontWeight:600 }}>{detail}</span>
              </div>
            ))}
            <div style={{ marginTop:12, padding:"10px 12px", background:"var(--bg)", borderRadius:"var(--radius-sm)", fontSize:12, color:"var(--text-muted)" }}>
              Graph integrity: {healthChecks.filter(h=>h.ok).length}/{healthChecks.length} checks passing
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
