import React, { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";

interface Application {
  id: string;
  gramsevaId: string;
  userName: string;
  userPhone: string;
  userState: string;
  userDistrict: string;
  userAge: number;
  userGender: string;
  userCaste: string;
  userCommunity: string;
  userIncome: number;
  userBPL: boolean;
  userOccupation: string;
  userLandAcres: number;
  userLandType: string;
  userHouseType: string;
  userEducation: string;
  userMaritalStatus: string;
  userFamilySize: number;
  userAadhaar: string;
  userRationCard: string;
  userIncomeCert: string;
  userCommCert: string;
  userVoterId: string;
  userBank: string;
  userIFSC: string;
  userBankName: string;
  userDisability: boolean;
  userDisabilityPct: number;
  schemeName: string;
  schemeMinistry: string;
  schemeType: string;
  schemeBenefit: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  remarks?: string;
  additionalInfo?: string;
}

interface Summary { total: number; pending: number; approved: number; rejected: number; }

const STATUS_COLORS = { pending: "#F5C518", approved: "#4CAF50", rejected: "#F44336" };
const STATUS_BG = { pending: "#F5C51822", approved: "#4CAF5022", rejected: "#F4433622" };

export default function ApplicationsPage() {
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
  const [apps, setApps] = useState<Application[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("submittedAt");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy, sortDir,
        ...(filter !== "all" && { status: filter }),
        ...(search && { search }),
      });
      const res = await fetch(`${apiUrl}/api/applications?${params}`, {
        headers: { "x-admin-key": import.meta.env.VITE_ADMIN_KEY || "" }
      });
      const data = await res.json();
      setApps(data.applications || []);
      setSummary(data.summary || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, sortBy, sortDir]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const handleStatus = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/applications/${selected.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": import.meta.env.VITE_ADMIN_KEY || ""
        },
        body: JSON.stringify({ status, remarks })
      });
      setSelected(prev => prev ? { ...prev, status, remarks } : null);
      setApps(prev => prev.map(a => a.id === selected.id ? { ...a, status, remarks } : a));
      setSummary(prev => {
        const next = { ...prev };
        const old = selected.status;
        if (old !== status) {
          next[old] = Math.max(0, next[old] - 1);
          next[status]++;
        }
        return next;
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "ASC" ? "DESC" : "ASC");
    else { setSortBy(col); setSortDir("DESC"); }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortBy !== col ? <span style={{ opacity: 0.3 }}>↕</span> :
    sortDir === "ASC" ? <span>↑</span> : <span>↓</span>;

  const DetailRow = ({ label, value }: { label: string; value?: string | number | boolean | null }) => {
    if (!value && value !== 0 && value !== false) return null;
    return (
      <div style={D.detailRow}>
        <span style={D.detailLabel}>{label}</span>
        <span style={D.detailValue}>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</span>
      </div>
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={D.section}>
      <div style={D.sectionTitle}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={D.page}>
      <div style={D.header}>
        <div>
          <h1 style={D.h1}>Applications</h1>
          <p style={D.sub}>Review and process in-app scheme applications</p>
        </div>
        <button style={D.refreshBtn} onClick={load}>↻ Refresh</button>
      </div>

      {/* Summary Cards */}
      <div style={D.summaryRow}>
        {[
          { label: "Total", value: summary.total, color: "#A8D5B5", filter: "all" as const },
          { label: "Pending", value: summary.pending, color: "#F5C518", filter: "pending" as const },
          { label: "Approved", value: summary.approved, color: "#4CAF50", filter: "approved" as const },
          { label: "Rejected", value: summary.rejected, color: "#F44336", filter: "rejected" as const },
        ].map(c => (
          <div
            key={c.label} style={{ ...D.summaryCard, borderColor: filter === c.filter ? c.color : "var(--border)", cursor: "pointer" }}
            onClick={() => setFilter(c.filter)}
          >
            <span style={{ ...D.summaryNum, color: c.color }}>{c.value}</span>
            <span style={D.summaryLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form style={D.filterRow} onSubmit={handleSearch}>
        <input
          style={D.searchInput} placeholder="Search name, phone, GramSeva ID, Aadhaar…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <button style={D.searchBtn} type="submit">Search</button>
        <select style={D.select} value={filter} onChange={e => setFilter(e.target.value as any)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </form>

      {/* Two-pane layout */}
      <div style={D.pane}>
        {/* Left: Table */}
        <div style={D.tableWrap}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-2)" }}>Loading…</div>
          ) : apps.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No applications found.</div>
          ) : (
            <table style={D.table}>
              <thead>
                <tr>
                  {[
                    { key: "gramsevaId", label: "GramSeva ID" },
                    { key: "userName", label: "Applicant" },
                    { key: "schemeName", label: "Scheme" },
                    { key: "userState", label: "State" },
                    { key: "status", label: "Status" },
                    { key: "submittedAt", label: "Submitted" },
                  ].map(col => (
                    <th key={col.key} style={D.th} onClick={() => toggleSort(col.key)}>
                      {col.label} <SortIcon col={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map(app => (
                  <tr
                    key={app.id}
                    style={{ ...D.tr, ...(selected?.id === app.id ? D.trSelected : {}) }}
                    onClick={() => { setSelected(app); setRemarks(app.remarks || ""); }}
                  >
                    <td style={D.td}>
                      <span style={D.monoId}>{app.gramsevaId || "—"}</span>
                    </td>
                    <td style={D.td}>
                      <div style={D.name}>{app.userName}</div>
                      <div style={D.phone}>{app.userPhone}</div>
                    </td>
                    <td style={D.td}>
                      <div style={D.schemeName}>{app.schemeName}</div>
                      <div style={D.ministry}>{app.schemeType}</div>
                    </td>
                    <td style={D.td}>{app.userState} / {app.userDistrict}</td>
                    <td style={D.td}>
                      <span style={{ ...D.badge, background: STATUS_BG[app.status], color: STATUS_COLORS[app.status] }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={D.td}>{new Date(app.submittedAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Detail Panel */}
        {selected && (
          <div style={D.detail}>
            <div style={D.detailHeader}>
              <div>
                <div style={D.detailName}>{selected.userName}</div>
                <div style={D.detailGsId}>🆔 {selected.gramsevaId || selected.id}</div>
              </div>
              <span style={{ ...D.badge, background: STATUS_BG[selected.status], color: STATUS_COLORS[selected.status], fontSize: 13 }}>
                {selected.status.toUpperCase()}
              </span>
            </div>

            <Section title="📋 Scheme Applied">
              <DetailRow label="Scheme" value={selected.schemeName} />
              <DetailRow label="Ministry" value={selected.schemeMinistry} />
              <DetailRow label="Type" value={selected.schemeType} />
              <DetailRow label="Benefit" value={selected.schemeBenefit} />
              <DetailRow label="Submitted" value={selected.submittedAt ? new Date(selected.submittedAt).toLocaleString("en-IN") : ""} />
            </Section>

            <Section title="👤 Personal Info">
              <DetailRow label="Full Name" value={selected.userName} />
              <DetailRow label="Phone" value={selected.userPhone} />
              <DetailRow label="Age" value={selected.userAge} />
              <DetailRow label="Gender" value={selected.userGender} />
              <DetailRow label="Marital Status" value={selected.userMaritalStatus} />
              <DetailRow label="Family Size" value={selected.userFamilySize} />
              <DetailRow label="Education" value={selected.userEducation} />
              <DetailRow label="Disability" value={selected.userDisability} />
              {selected.userDisability && <DetailRow label="Disability %" value={selected.userDisabilityPct} />}
            </Section>

            <Section title="📍 Location & Housing">
              <DetailRow label="State" value={selected.userState} />
              <DetailRow label="District" value={selected.userDistrict} />
              <DetailRow label="House Type" value={selected.userHouseType} />
            </Section>

            <Section title="🏷️ Category & Economic">
              <DetailRow label="Caste Category" value={selected.userCaste} />
              <DetailRow label="Community" value={selected.userCommunity} />
              <DetailRow label="Annual Income" value={selected.userIncome ? `₹ ${selected.userIncome.toLocaleString("en-IN")}` : undefined} />
              <DetailRow label="BPL Card" value={selected.userBPL} />
              <DetailRow label="Occupation" value={selected.userOccupation} />
              <DetailRow label="Land (Acres)" value={selected.userLandAcres} />
              <DetailRow label="Land Type" value={selected.userLandType} />
            </Section>

            <Section title="📄 Government Documents">
              <DetailRow label="Aadhaar No." value={selected.userAadhaar} />
              <DetailRow label="Ration Card No." value={selected.userRationCard} />
              <DetailRow label="Income Cert No." value={selected.userIncomeCert} />
              <DetailRow label="Community Cert No." value={selected.userCommCert} />
              <DetailRow label="Voter ID" value={selected.userVoterId} />
            </Section>

            <Section title="🏦 Bank Details">
              <DetailRow label="Account No." value={selected.userBank} />
              <DetailRow label="IFSC Code" value={selected.userIFSC} />
              <DetailRow label="Bank Name" value={selected.userBankName} />
            </Section>

            {selected.additionalInfo && (
              <Section title="📝 Additional Info">
                <p style={{ color: "var(--text-1)", margin: 0, fontSize: 13 }}>{selected.additionalInfo}</p>
              </Section>
            )}

            {/* Decision Panel */}
            <div style={D.decision}>
              <div style={D.decisionTitle}>Admin Decision</div>
              <textarea
                style={D.remarksInput}
                placeholder="Remarks / reason (optional)"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
              />
              <div style={D.decisionBtns}>
                <button
                  style={{ ...D.actionBtn, background: "#4CAF5022", color: "#4CAF50", borderColor: "#4CAF5055" }}
                  onClick={() => handleStatus("approved")}
                  disabled={saving || selected.status === "approved"}
                >
                  {saving ? "…" : "✓ Approve"}
                </button>
                <button
                  style={{ ...D.actionBtn, background: "#F4433622", color: "#F44336", borderColor: "#F4433655" }}
                  onClick={() => handleStatus("rejected")}
                  disabled={saving || selected.status === "rejected"}
                >
                  {saving ? "…" : "✗ Reject"}
                </button>
              </div>
              {selected.reviewedAt && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                  Last reviewed: {new Date(selected.reviewedAt).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const D: Record<string, React.CSSProperties> = {
  page: { padding: "0 0 48px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  h1: { margin: "0 0 4px", color: "var(--text-1)", fontSize: 24, fontWeight: 700 },
  sub: { margin: 0, color: "var(--text-muted)", fontSize: 13 },
  refreshBtn: {
    background: "var(--bg-hover)", border: "1px solid var(--border)",
    color: "var(--text-2)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
  },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 },
  summaryCard: {
    background: "var(--bg-card)", border: "2px solid", borderRadius: 14, padding: "16px 20px",
    display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", transition: "border-color 0.2s",
  },
  summaryNum: { fontSize: 32, fontWeight: 800, lineHeight: 1 },
  summaryLabel: { fontSize: 12, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" },
  filterRow: { display: "flex", gap: 10, marginBottom: 16, alignItems: "center" },
  searchInput: {
    flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "8px 14px", color: "var(--text-1)", fontSize: 13,
  },
  searchBtn: {
    background: "var(--gold)", border: "none", borderRadius: 10,
    padding: "8px 18px", fontWeight: 700, color: "#0A3728", cursor: "pointer", fontSize: 13,
  },
  select: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "8px 12px", color: "var(--text-1)", fontSize: 13,
  },
  pane: { display: "flex", gap: 16, alignItems: "flex-start" },
  tableWrap: { flex: 1, overflowX: "auto", background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "12px 16px", background: "var(--bg-hover)", color: "var(--text-2)",
    fontWeight: 600, textAlign: "left", borderBottom: "1px solid var(--border)",
    cursor: "pointer", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px",
  },
  tr: { borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.15s" },
  trSelected: { background: "var(--bg-hover)" },
  td: { padding: "12px 16px", color: "var(--text-1)", verticalAlign: "top" },
  name: { fontWeight: 600, color: "var(--text-1)", marginBottom: 2 },
  phone: { fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" },
  schemeName: { fontWeight: 600, color: "var(--text-1)", marginBottom: 2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  ministry: { fontSize: 11, color: "var(--text-muted)" },
  monoId: { fontFamily: "monospace", fontSize: 12, color: "var(--gold)", fontWeight: 600 },
  badge: { padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11, display: "inline-block" },
  detail: {
    width: 360, flexShrink: 0, background: "var(--bg-card)", borderRadius: 16,
    border: "1px solid var(--border)", overflow: "hidden", maxHeight: "85vh", overflowY: "auto",
  },
  detailHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", background: "var(--bg-hover)", borderBottom: "1px solid var(--border)",
  },
  detailName: { fontWeight: 700, fontSize: 16, color: "var(--text-1)" },
  detailGsId: { fontSize: 12, color: "var(--gold)", fontFamily: "monospace", marginTop: 2 },
  section: { padding: "14px 20px", borderBottom: "1px solid var(--border)" },
  sectionTitle: { fontWeight: 700, color: "var(--text-2)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 },
  detailRow: { display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12 },
  detailLabel: { fontSize: 12, color: "var(--text-muted)", flexShrink: 0 },
  detailValue: { fontSize: 12, color: "var(--text-1)", fontWeight: 500, textAlign: "right", wordBreak: "break-all" },
  decision: { padding: "16px 20px" },
  decisionTitle: { fontWeight: 700, fontSize: 13, color: "var(--text-1)", marginBottom: 10 },
  remarksInput: {
    width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "8px 12px", color: "var(--text-1)", fontSize: 13,
    resize: "vertical", marginBottom: 12, boxSizing: "border-box",
  },
  decisionBtns: { display: "flex", gap: 10 },
  actionBtn: {
    flex: 1, padding: "10px", borderRadius: 10, fontWeight: 700, border: "1px solid",
    cursor: "pointer", fontSize: 13, transition: "opacity 0.15s",
  },
};
