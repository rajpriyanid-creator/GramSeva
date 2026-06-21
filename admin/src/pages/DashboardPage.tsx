import React, { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import {
  Database, Users, MapPin, Languages, Layers, TrendingUp, CheckCircle, Clock
} from "lucide-react";
import { api, type OverviewStats } from "../services/api";
import { StatCard, PageHeader, Card, CardHeader, Badge, Spinner } from "../components/ui";

const CHART_COLORS = ["#F5C518","#4CAF50","#29B6F6","#FF9800","#AB47BC","#EF5350","#26C6DA","#8D6E63","#66BB6A","#42A5F5"];

const LANG_LABELS: Record<string,string> = {
  "hi-IN":"Hindi","ta-IN":"Tamil","te-IN":"Telugu","kn-IN":"Kannada",
  "mr-IN":"Marathi","bn-IN":"Bengali","gu-IN":"Gujarati","ml-IN":"Malayalam",
  "or-IN":"Odia","pa-IN":"Punjabi",
};

export default function DashboardPage() {
  const [stats, setStats]   = useState<OverviewStats | null>(null);
  const [timeline, setTL]   = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [langs, setLangs]   = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [topSchemes, setTop]= useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stats(),
      api.analyticsTimeline(),
      api.analyticsHourly(),
      api.analyticsLanguages(),
      api.analyticsStates(),
      api.analyticsTopSchemes(),
    ]).then(([s, tl, hr, la, st, ts]) => {
      setStats(s);
      setTL(tl.timeline.map((b: any) => ({
        day: b.day.slice(5),
        queries: b.queries,
        completions: b.completions,
        matches: b.total_matches,
      })));
      setHourly(hr.hourly.map((b: any) => ({
        hour: b.hour.slice(11) + ":00",
        queries: b.queries,
      })));
      setLangs(la.languages.map((l: any) => ({
        name: LANG_LABELS[l.language] || l.language,
        value: l.count,
        pct: l.pct,
      })));
      setStates(st.states.slice(0, 10));
      setTop(ts.schemes.slice(0, 8));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (!stats)  return <div style={{ color: "var(--red)", padding: 32 }}>Failed to load stats. Is the API running?</div>;

  const a = stats.analytics;

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle={`GramSeva Admin • ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`}
      />

      {/* ── KPI Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Active Schemes"    value={stats.graph.schemes || 0}  accent="var(--gold)"   icon={<Layers size={18}/>}   />
        <StatCard label="Criteria Nodes"    value={stats.graph.criteria|| 0}  accent="var(--green)"  icon={<Database size={18}/>} />
        <StatCard label="CSC Centres"       value={stats.graph.cscs    || 0}  accent="var(--blue)"   icon={<MapPin size={18}/>}   />
        <StatCard label="Languages"         value={10}                         accent="var(--purple)" icon={<Languages size={18}/>}/>
        <StatCard label="Queries Today"     value={a.queries_today}            accent="var(--gold)"   icon={<TrendingUp size={18}/>}/>
        <StatCard label="This Week"         value={a.queries_this_week}        accent="var(--orange)" icon={<Clock size={18}/>}    />
        <StatCard label="Completion Rate"   value={`${a.completion_rate}%`}    accent="var(--green)"  icon={<CheckCircle size={18}/>}/>
        <StatCard label="Avg Schemes/Match" value={a.avg_schemes_per_session}  accent="var(--blue)"   icon={<Users size={18}/>}   />
      </div>

      {/* ── Row 1: 30-day timeline + Hourly ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Queries — Last 30 Days" />
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeline} margin={{ right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-muted)" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="queries"     stroke="var(--gold)"   strokeWidth={2} dot={false} name="Queries" />
                <Line type="monotone" dataKey="completions" stroke="var(--green)"  strokeWidth={2} dot={false} name="Completions" />
                <Line type="monotone" dataKey="matches"     stroke="var(--blue)"   strokeWidth={1} dot={false} strokeDasharray="4 2" name="Matches" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Queries by Hour (Today)" />
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourly} margin={{ right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "var(--text-muted)" }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="queries" fill="var(--gold)" radius={[3, 3, 0, 0]} name="Queries" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Row 2: Lang donut + State bar + Scheme types ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Language Distribution" />
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={langs} dataKey="value" cx="50%" cy="50%" outerRadius={72} paddingAngle={2}>
                  {langs.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                  formatter={(v: any, _: any, props: any) => [`${v} (${props.payload.pct}%)`, props.payload.name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Queries by State" />
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={states} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={28} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--blue)" radius={[0, 3, 3, 0]} name="Queries" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Scheme Types" />
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.scheme_types} dataKey="count" cx="50%" cy="50%"
                  outerRadius={72} paddingAngle={2} nameKey="type">
                  {stats.scheme_types.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Row 3: Top matched schemes + mini stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <Card>
          <CardHeader title="Top Matched Schemes" />
          <div style={{ padding: "12px 8px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topSchemes} layout="vertical" margin={{ left: 4, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="scheme_id" tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={80} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="match_count" fill="var(--green)" radius={[0, 3, 3, 0]} name="Matches" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Graph Health" />
          <div style={{ padding: "18px" }}>
            {[
              { label: "Orphan Schemes",          val: stats.orphan_schemes,           ok: stats.orphan_schemes === 0 },
              { label: "Avg Criteria / Scheme",   val: stats.avg_criteria_per_scheme,   ok: stats.avg_criteria_per_scheme >= 1 },
              { label: "Max Criteria on 1 Scheme",val: stats.max_criteria_per_scheme,   ok: true },
              { label: "Departments",             val: stats.graph.departments || 0,    ok: (stats.graph.departments || 0) > 0 },
              { label: "States Covered",          val: stats.graph.states      || 0,    ok: (stats.graph.states      || 0) >= 10 },
              { label: "Districts",               val: stats.graph.districts   || 0,    ok: true },
            ].map(({ label, val, ok }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{typeof val === "number" ? val.toLocaleString() : val}</span>
                  <Badge label={ok ? "OK" : "WARN"} kind={ok ? "ok" : "warn"} dot />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
