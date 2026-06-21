import React, { useEffect, useState, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { api, type Scheme } from "../services/api";
import { useAdmin } from "../store/store";
import { PageHeader, Badge, Btn, Modal, FormRow, Card, Spinner, EmptyState } from "../components/ui";

const TYPES = ["All","Direct Benefit Transfer","Insurance","Health Insurance",
               "Employment Guarantee","Loan / Credit","Subsidy","Scholarship",
               "Savings Scheme","Skill Training"];

function typeKind(t: string): "ok"|"info"|"warn"|"purple"|"neutral" {
  if (t.includes("Transfer") || t.includes("Subsidy")) return "ok";
  if (t.includes("Insurance") || t.includes("Health"))  return "info";
  if (t.includes("Scholarship") || t.includes("Skill")) return "purple";
  if (t.includes("Employment"))                          return "warn";
  return "neutral";
}

const BLANK: Partial<Scheme & { criteria: any[]; states: string[] }> = {
  id: "", name: "", benefit: "", ministry: "", type: "Direct Benefit Transfer",
  url: "", active: true, criteria: [], states: ["ALL"],
};

export default function SchemesPage() {
  const { toast } = useAdmin();
  const [schemes, setSchemes]   = useState<Scheme[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState("");
  const [typeF,   setTypeF]     = useState("All");
  const [activeF, setActiveF]   = useState<"all"|"active"|"inactive">("active");
  const [sortBy,  setSortBy]    = useState<"name"|"type"|"criteria">("name");
  const [editItem, setEdit]     = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState<any>({ ...BLANK });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    api.getSchemes().then(d => setSchemes(d.schemes)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    return schemes
      .filter(s => activeF === "all" || (activeF === "active" ? s.active : !s.active))
      .filter(s => typeF === "All" || s.type === typeF)
      .filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.ministry || "").toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) =>
        sortBy === "name"     ? a.name.localeCompare(b.name)    :
        sortBy === "type"     ? a.type.localeCompare(b.type)    :
        (b.criteria_count ?? 0) - (a.criteria_count ?? 0)
      );
  }, [schemes, search, typeF, activeF, sortBy]);

  const openEdit = (s: Scheme) => { setForm({ ...s, criteria: [], states: s.states }); setEdit(s); };
  const openCreate = () => { setForm({ ...BLANK }); setCreating(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (creating) {
        await api.createScheme(form);
        toast("Scheme created ✓");
        setCreating(false);
      } else {
        await api.updateScheme(form.id, form);
        toast("Scheme updated ✓");
        setEdit(null);
      }
      load();
    } catch (e: any) {
      toast(e.message || "Save failed", "error");
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (s: Scheme) => {
    setDeleting(s.id);
    try {
      if (s.active) { await api.deleteScheme(s.id);   toast(`"${s.name}" deactivated`); }
      else          { await api.activateScheme(s.id);  toast(`"${s.name}" activated ✓`); }
      load();
    } catch { toast("Action failed", "error"); }
    finally   { setDeleting(null); }
  };

  return (
    <div className="page">
      <PageHeader
        title="Schemes"
        subtitle={`${filtered.length} of ${schemes.length} schemes`}
        actions={<Btn onClick={openCreate}><Plus size={14} /> New Scheme</Btn>}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input style={{ paddingLeft: 30, width: "100%" }} placeholder="Search by name, ministry, ID…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeF} onChange={e => setTypeF(e.target.value)} style={{ minWidth: 190 }}>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={activeF} onChange={e => setActiveF(e.target.value as any)} style={{ minWidth: 120 }}>
          <option value="active">Active only</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ minWidth: 140 }}>
          <option value="name">Sort: Name</option>
          <option value="type">Sort: Type</option>
          <option value="criteria">Sort: Criteria ↓</option>
        </select>
      </div>

      <Card>
        {loading ? <Spinner label="Loading schemes…" /> : filtered.length === 0 ? (
          <EmptyState icon="📋" title="No schemes found" sub="Try adjusting your search or filters." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                <th>ID</th><th>Name</th><th>Type</th><th>Ministry</th>
                <th style={{ textAlign:"center" }}>Criteria</th>
                <th>States</th><th>Status</th><th style={{ textAlign:"right" }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td><span className="mono" style={{ color: "var(--text-muted)" }}>{s.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, maxWidth: 260 }} className="truncate">{s.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, maxWidth: 260 }} className="truncate">
                        {s.benefit}
                      </div>
                    </td>
                    <td><Badge label={s.type} kind={typeKind(s.type)} /></td>
                    <td><span style={{ fontSize: 12, color: "var(--text-2)", maxWidth: 180 }} className="truncate">{s.ministry}</span></td>
                    <td style={{ textAlign:"center" }}>
                      <span style={{
                        background: "var(--bg)", borderRadius: 20, padding: "2px 10px",
                        fontSize: 12, fontWeight: 700, color: s.criteria_count > 0 ? "var(--gold)" : "var(--red)"
                      }}>{s.criteria_count}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(s.states || []).slice(0, 3).map(st => (
                          <span key={st} style={{ fontSize: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 6px", color: "var(--text-2)" }}>{st}</span>
                        ))}
                        {(s.states || []).length > 3 && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{s.states.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge label={s.active ? "Active" : "Inactive"} kind={s.active ? "ok" : "error"} dot />
                    </td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <a href={s.url} target="_blank" rel="noreferrer">
                          <Btn variant="ghost" size="sm" style={{ padding: "4px 6px" }} title="Open scheme URL">
                            <ExternalLink size={13} />
                          </Btn>
                        </a>
                        <Btn variant="ghost" size="sm" style={{ padding: "4px 6px" }} onClick={() => openEdit(s)}>
                          <Edit2 size={13} />
                        </Btn>
                        <Btn
                          variant={s.active ? "danger" : "outline"}
                          size="sm" style={{ padding: "4px 6px" }}
                          loading={deleting === s.id}
                          onClick={() => handleToggleActive(s)}
                          title={s.active ? "Deactivate" : "Activate"}
                        >
                          {s.active ? <XCircle size={13} /> : <CheckCircle size={13} />}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit / Create Modal */}
      {(editItem || creating) && (
        <Modal title={creating ? "New Scheme" : `Edit — ${form.id}`} onClose={() => { setEdit(null); setCreating(false); }} width={640}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            {creating && (
              <FormRow label="ID (unique, no spaces)">
                <input style={{ width: "100%" }} value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })} placeholder="PM_KISAN" />
              </FormRow>
            )}
            <FormRow label="Name (English)">
              <input style={{ width: "100%" }} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
            </FormRow>
            <FormRow label="Name (Hindi)">
              <input style={{ width: "100%" }} value={form.name_hi || ""} onChange={e => setForm({ ...form, name_hi: e.target.value })} />
            </FormRow>
          </div>
          <FormRow label="Benefit Description">
            <input style={{ width: "100%" }} value={form.benefit || ""} onChange={e => setForm({ ...form, benefit: e.target.value })} placeholder="₹6,000/year directly into bank account" />
          </FormRow>
          <FormRow label="Ministry">
            <input style={{ width: "100%" }} value={form.ministry || ""} onChange={e => setForm({ ...form, ministry: e.target.value })} />
          </FormRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormRow label="Type">
              <select style={{ width: "100%" }} value={form.type || ""} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.slice(1).map(t => <option key={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Apply URL">
              <input style={{ width: "100%" }} value={form.url || ""} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </FormRow>
          </div>
          <FormRow label="Department Helpline">
            <input style={{ width: "100%" }} value={form.department?.helpline || ""}
              onChange={e => setForm({ ...form, department: { ...(form.department||{}), helpline: e.target.value } })}
              placeholder="1800-180-1551" />
          </FormRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormRow label="Scheme Level">
              <select
                style={{ width: "100%" }}
                value={form.states?.includes("ALL") ? "central" : "state"}
                onChange={e => {
                  if (e.target.value === "central") {
                    setForm({ ...form, states: ["ALL"] });
                  } else {
                    setForm({ ...form, states: ["TN"] });
                  }
                }}
              >
                <option value="central">Central Government</option>
                <option value="state">State Government</option>
              </select>
            </FormRow>
            {!form.states?.includes("ALL") && (
              <FormRow label="State Jurisdiction">
                <select
                  style={{ width: "100%" }}
                  value={form.states?.[0] || "TN"}
                  onChange={e => setForm({ ...form, states: [e.target.value] })}
                >
                  <option value="TN">Tamil Nadu (TN)</option>
                  <option value="UP">Uttar Pradesh (UP)</option>
                  <option value="MH">Maharashtra (MH)</option>
                  <option value="AP">Andhra Pradesh (AP)</option>
                  <option value="TS">Telangana (TS)</option>
                  <option value="KA">Karnataka (KA)</option>
                  <option value="KL">Kerala (KL)</option>
                  <option value="WB">West Bengal (WB)</option>
                  <option value="RJ">Rajasthan (RJ)</option>
                  <option value="GJ">Gujarat (GJ)</option>
                  <option value="MP">Madhya Pradesh (MP)</option>
                  <option value="BR">Bihar (BR)</option>
                  <option value="OD">Odisha (OD)</option>
                  <option value="PB">Punjab (PB)</option>
                </select>
              </FormRow>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <Btn variant="outline" onClick={() => { setEdit(null); setCreating(false); }}>Cancel</Btn>
            <Btn loading={saving} onClick={handleSave}>Save Scheme</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
