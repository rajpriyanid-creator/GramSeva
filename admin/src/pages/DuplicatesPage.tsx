import React, { useEffect, useState } from "react";
import { AlertTriangle, Merge, EyeOff, RefreshCw } from "lucide-react";
import { api, type DuplicatePair } from "../services/api";
import { useAdmin } from "../store/store";
import { PageHeader, Badge, Btn, Card, CardHeader, Spinner, EmptyState, StatCard } from "../components/ui";

const scoreKind = (s: number) => s >= 1 ? "error" : s >= 0.8 ? "warn" : "info";
const scoreLabel = (s: number) => s >= 1 ? "Exact" : s >= 0.8 ? "Near" : "Related";

function SchemeBox({ scheme, highlight }: { scheme: any; highlight?: boolean }) {
  return (
    <div style={{
      background: "var(--bg)", border: `1px solid ${highlight ? "var(--red)" : "var(--border)"}`,
      borderRadius: "var(--radius-sm)", padding: 14, flex: 1,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--text)" }}>{scheme.name}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }} className="mono">{scheme.id}</div>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>{scheme.benefit}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Badge label={scheme.type} kind="neutral" />
        <Badge label={scheme.active ? "Active" : "Inactive"} kind={scheme.active ? "ok" : "error"} dot />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{scheme.ministry}</div>
    </div>
  );
}

export default function DuplicatesPage() {
  const { toast } = useAdmin();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter]     = useState<"all"|"exact"|"near"|"related">("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [merging, setMerging]   = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    try { setData(await api.getDuplicates()); }
    catch { toast("Failed to load duplicates", "error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const scan = async () => {
    setScanning(true);
    await load();
    setScanning(false);
    toast("Duplicate scan complete ✓");
  };

  const handleMerge = async (pair: DuplicatePair, keepId: string) => {
    const removeId = keepId === pair.scheme_a.id ? pair.scheme_b.id : pair.scheme_a.id;
    setMerging(pair.pair_id);
    try {
      await api.mergeDuplicate(keepId, removeId);
      toast(`Merged: kept "${keepId}", deactivated "${removeId}" ✓`);
      setDismissed(prev => new Set([...prev, pair.pair_id]));
    } catch { toast("Merge failed", "error"); }
    finally { setMerging(null); }
  };

  const handleDismiss = (pairId: string) => {
    setDismissed(prev => new Set([...prev, pairId]));
    toast("Dismissed (marked as intentional)");
  };

  const visible = (data?.duplicates || [])
    .filter((p: DuplicatePair) => !dismissed.has(p.pair_id))
    .filter((p: DuplicatePair) => {
      if (filter === "exact")   return p.score >= 1.0;
      if (filter === "near")    return p.score >= 0.8 && p.score < 1.0;
      if (filter === "related") return p.score < 0.8;
      return true;
    });

  if (loading) return <Spinner label="Running duplicate analysis…" />;

  return (
    <div className="page">
      <PageHeader
        title="Duplicate Detector"
        subtitle="Finds exact, near-duplicate, and semantically overlapping schemes"
        actions={
          <Btn variant="outline" loading={scanning} onClick={scan}>
            <RefreshCw size={14} /> Re-scan
          </Btn>
        }
      />

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Pairs Found" value={data?.total_duplicates - dismissed.size || 0} accent="var(--red)" icon={<AlertTriangle size={18}/>} />
        <StatCard label="Exact Duplicates"  value={data?.exact   || 0} accent="var(--red)"    />
        <StatCard label="Near Duplicates"   value={data?.near    || 0} accent="var(--orange)"  />
        <StatCard label="Related / Overlap" value={data?.related || 0} accent="var(--blue)"    />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {(["all","exact","near","related"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: filter === f ? "var(--gold)" : "var(--bg-card)",
            color: filter === f ? "#0b1a10" : "var(--text-2)",
            border: `1px solid ${filter === f ? "var(--gold)" : "var(--border)"}`,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>
          {visible.length} pair{visible.length !== 1 ? "s" : ""} shown
          {dismissed.size > 0 && ` • ${dismissed.size} dismissed`}
        </span>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon="✅" title="No duplicates found" sub={
            dismissed.size > 0 ? `${dismissed.size} pairs dismissed this session.` :
            "Your scheme graph looks clean!"
          } />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visible.map((pair: DuplicatePair) => (
            <Card key={pair.pair_id}>
              {/* Header row */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <Badge label={scoreLabel(pair.score)} kind={scoreKind(pair.score)} dot />
                <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>
                  Similarity: {(pair.score * 100).toFixed(0)}%
                </span>
                <div style={{ display: "flex", gap: 6, marginLeft: 8, flexWrap: "wrap" }}>
                  {pair.reasons.map(r => (
                    <span key={r} style={{ fontSize: 11, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 8px", color: "var(--text-2)" }}>
                      {r}
                    </span>
                  ))}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <Btn variant="outline" size="sm" onClick={() => handleDismiss(pair.pair_id)}>
                    <EyeOff size={12} /> Dismiss
                  </Btn>
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <SchemeBox scheme={pair.scheme_a} />

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>VS</span>
                  <Btn
                    size="sm" variant="outline"
                    loading={merging === pair.pair_id}
                    onClick={() => handleMerge(pair, pair.scheme_a.id)}
                    title={`Keep ${pair.scheme_a.id}, deactivate ${pair.scheme_b.id}`}
                    style={{ fontSize: 10, padding: "4px 8px" }}
                  >
                    <Merge size={11} /> Keep A
                  </Btn>
                  <Btn
                    size="sm" variant="outline"
                    loading={merging === pair.pair_id}
                    onClick={() => handleMerge(pair, pair.scheme_b.id)}
                    title={`Keep ${pair.scheme_b.id}, deactivate ${pair.scheme_a.id}`}
                    style={{ fontSize: 10, padding: "4px 8px" }}
                  >
                    <Merge size={11} /> Keep B
                  </Btn>
                </div>

                <SchemeBox scheme={pair.scheme_b} />
              </div>

              {/* Pair ID footer */}
              <div style={{ padding: "6px 16px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-muted)" }}>
                Pair ID: <span className="mono">{pair.pair_id}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
