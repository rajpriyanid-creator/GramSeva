import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { api } from "../services/api";
import { PageHeader, StatCard, Card, CardHeader, Badge, Spinner } from "../components/ui";

const COLORS = ["#F5C518","#4CAF50","#29B6F6","#FF9800","#AB47BC","#EF5350","#26C6DA","#8D6E63","#66BB6A","#42A5F5"];

const LANG_MAP: Record<string,string> = {
  "hi-IN":"Hindi","ta-IN":"Tamil","te-IN":"Telugu","kn-IN":"Kannada",
  "mr-IN":"Marathi","bn-IN":"Bengali","gu-IN":"Gujarati","ml-IN":"Malayalam",
  "or-IN":"Odia","pa-IN":"Punjabi",
};

export default function AnalyticsPage() {
  const [overview, setOV]   = useState<any>(null);
  const [timeline, setTL]   = useState<any[]>([]);
  const [hourly,   setHL]   = useState<any[]>([]);
  const [langs,    setLang] = useState<any[]>([]);
  const [states,   setSt]   = useState<any[]>([]);
  const [topS,     setTopS] = useState<any[]>([]);
  const [sessions, setSess] = useState<any[]>([]);
  const [loading,  setLoad] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analyticsOverview(),
      api.analyticsTimeline(),
      api.analyticsHourly(),
      api.analyticsLanguages(),
      api.analyticsStates(),
      api.analyticsTopSchemes(),
      api.analyticsSessions(),
    ]).then(([ov, tl, hl, la, st, ts, se]) => {
      setOV(ov);
      setTL(tl.timeline.map((b: any) => ({ ...b, day: b.day.slice(5) })));
      setHL(hl.hourly.map((b: any) => ({ ...b, hour: b.hour.slice(11) + "h" })));
      setLang(la.languages.map((l: any) => ({ name: LANG_MAP[l.language] || l.language, value: l.count, pct: l.pct })));
      setSt(st.states.slice(0, 12));
      setTopS(ts.schemes.slice(0, 12));
      setSess(se.sessions);
    }).finally(() => setLoad(false));
  }, []);

  if (loading) return <Spinner label="Loading analytics…" />;
  if (!overview) return null;

  // Funnel data
  const funnel = [
    { name: "Started",   value: overview.total_queries_alltime,     fill: "var(--blue)"  },
    { name: "Completed", value: overview.total_completions_alltime, fill: "var(--gold)"  },
    { name: "Matched",   value: overview.total_matches_alltime,     fill: "var(--green)" },
  ];

  return (
    <div className="page">
      <PageHeader title="Analytics" subtitle="Session activity, language & geographic distribution, scheme performance" />

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:24 }}>
        <StatCard label="All-Time Queries"     value={overview.total_queries_alltime}     accent="var(--gold)"  />
        <StatCard label="Completions"          value={overview.total_completions_alltime} accent="var(--green)" />
        <StatCard label="Total Matches"        value={overview.total_matches_alltime}     accent="var(--blue)"  />
        <StatCard label="Completion Rate"      value={`${overview.completion_rate}%`}     accent="var(--orange)"/>
        <StatCard label="Avg Matches/Session"  value={overview.avg_schemes_per_session}   accent="var(--purple)"/>
        <StatCard label="Active (Last Hour)"   value={overview.active_sessions_last_hour} accent="var(--gold)"  />
      </div>

      {/* Row 1: 30-day area + funnel */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
        <Card>
          <CardHeader title="30-Day Session Volume" />
          <div style={{ padding:"16px 8px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline} margin={{ right:16 }}>
                <defs>
                  <linearGradient id="gq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5C518" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F5C518" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4CAF50" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize:10, fill:"var(--text-muted)" }} interval={4} />
                <YAxis tick={{ fontSize:10, fill:"var(--text-muted)" }} />
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Area type="monotone" dataKey="queries"     stroke="#F5C518" fill="url(#gq)" strokeWidth={2} name="Queries" />
                <Area type="monotone" dataKey="completions" stroke="#4CAF50" fill="url(#gc)" strokeWidth={2} name="Completions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Conversion Funnel" />
          <div style={{ padding:"16px 8px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <FunnelChart>
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:12 }} />
                <Funnel dataKey="value" data={funnel} isAnimationActive>
                  {funnel.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  <LabelList position="center" fill="#fff" style={{ fontSize:11, fontWeight:600 }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", justifyContent:"space-around", marginTop:8 }}>
              {funnel.map(f => (
                <div key={f.name} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:11, color:"var(--text-muted)" }}>{f.name}</div>
                  <div style={{ fontWeight:700, color:"var(--text)", fontSize:15 }}>{f.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Hourly bar + Language donut + State bar */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:16 }}>
        <Card>
          <CardHeader title="Queries by Hour (Today)" />
          <div style={{ padding:"12px 4px" }}>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={hourly} margin={{ right:4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" tick={{ fontSize:9, fill:"var(--text-muted)" }} interval={3} />
                <YAxis tick={{ fontSize:9, fill:"var(--text-muted)" }} />
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:11 }} />
                <Bar dataKey="queries" fill="var(--gold)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Language Split" />
          <div style={{ padding:"12px 4px" }}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={langs} dataKey="value" cx="50%" cy="50%" outerRadius={68} paddingAngle={2}>
                  {langs.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:11 }}
                  formatter={(v:any, _:any, p:any) => [`${v} (${p.payload.pct}%)`, p.payload.name]} />
                <Legend wrapperStyle={{ fontSize:10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Top States" />
          <div style={{ padding:"12px 4px" }}>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={states} layout="vertical" margin={{ left:4, right:16 }}>
                <XAxis type="number" tick={{ fontSize:9, fill:"var(--text-muted)" }} />
                <YAxis type="category" dataKey="state" tick={{ fontSize:10, fill:"var(--text-muted)" }} width={24} />
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:11 }} />
                <Bar dataKey="count" fill="var(--blue)" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3: Top schemes bar + Recent sessions */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card>
          <CardHeader title="Most Matched Schemes" />
          <div style={{ padding:"12px 4px" }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topS} layout="vertical" margin={{ left:8, right:24 }}>
                <XAxis type="number" tick={{ fontSize:9, fill:"var(--text-muted)" }} />
                <YAxis type="category" dataKey="scheme_id" tick={{ fontSize:9, fill:"var(--text-muted)" }} width={90} />
                <Tooltip contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:11 }} />
                <Bar dataKey="match_count" fill="var(--green)" radius={[0,3,3,0]} name="Times Matched" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent Sessions" />
          <div style={{ maxHeight:290, overflowY:"auto" }}>
            {sessions.length === 0 ? (
              <div style={{ padding:24, textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>No sessions yet this process uptime.</div>
            ) : (
              <table>
                <thead><tr><th>Session</th><th>Lang</th><th>State</th><th>Q</th><th>Schemes</th><th>Status</th></tr></thead>
                <tbody>
                  {sessions.map((s: any) => (
                    <tr key={s.session_id}>
                      <td><span className="mono" style={{ fontSize:10, color:"var(--text-muted)" }}>{s.session_id.slice(0,8)}…</span></td>
                      <td><span style={{ fontSize:11 }}>{LANG_MAP[s.language_code] || s.language_code}</span></td>
                      <td><Badge label={s.state} kind="info" /></td>
                      <td style={{ textAlign:"center", fontWeight:600 }}>{s.questions_answered}</td>
                      <td style={{ textAlign:"center", fontWeight:700, color:s.schemes_matched>0?"var(--green)":"var(--text-muted)" }}>{s.schemes_matched}</td>
                      <td><Badge label={s.completed?"Done":"Partial"} kind={s.completed?"ok":"warn"} dot /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
