import React, { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, Map } from "lucide-react";
import { api, type CSC } from "../services/api";
import { useAdmin } from "../store/store";
import { PageHeader, Badge, Btn, Modal, FormRow, Card, Spinner, EmptyState } from "../components/ui";

const STATES = ["TN","UP","MH","AP","TS","KA","KL","WB","RJ","GJ","MP","BR","OD","PB","HR","DL","CG","JH","UK","HP"];

const BLANK_CSC = { id:"", name:"", address:"", phone:"", timings:"Mon–Sat 9am–5pm", lat:0, lng:0, state:"TN", district:"" };

export default function CSCPage() {
  const { toast } = useAdmin();
  const [cscs,    setCSCs]    = useState<CSC[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [stateF,  setStateF]  = useState("All");
  const [editItem, setEdit]   = useState<any>(null);
  const [creating, setCreate] = useState(false);
  const [form,     setForm]   = useState<any>({ ...BLANK_CSC });
  const [saving,   setSaving] = useState(false);
  const [removing, setRemove] = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    api.getCSCs().then(d => setCSCs(d.cscs)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = cscs
    .filter(c => stateF === "All" || c.state === stateF)
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase()) ||
      c.district.toLowerCase().includes(search.toLowerCase())
    );

  const openEdit = (c: CSC) => { setForm({ ...c }); setEdit(c); };
  const openCreate = () => { setForm({ ...BLANK_CSC }); setCreate(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (creating) { await api.createCSC(form);              toast("CSC added ✓"); setCreate(false); }
      else          { await api.updateCSC(form.id, form);     toast("CSC updated ✓"); setEdit(null); }
      load();
    } catch (e: any) { toast(e.message || "Save failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: CSC) => {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    setRemove(c.id);
    try { await api.deleteCSC(c.id); toast(`"${c.name}" deleted`); load(); }
    catch { toast("Delete failed", "error"); }
    finally { setRemove(null); }
  };

  return (
    <div className="page">
      <PageHeader
        title="CSC Manager"
        subtitle={`${filtered.length} of ${cscs.length} Common Service Centres`}
        actions={<Btn onClick={openCreate}><Plus size={14} /> Add CSC</Btn>}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)" }} />
          <input style={{ paddingLeft: 30, width: "100%" }} placeholder="Search name, address, district…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={stateF} onChange={e => setStateF(e.target.value)} style={{ minWidth: 120 }}>
          <option value="All">All States</option>
          {STATES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Card>
        {loading ? <Spinner label="Loading CSCs…" /> : filtered.length === 0 ? (
          <EmptyState icon="📍" title="No CSCs found" sub="Add a CSC or broaden your search." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                <th>Name</th><th>District</th><th>State</th>
                <th>Phone</th><th>Timings</th><th>Coordinates</th>
                <th style={{ textAlign:"right" }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 220 }} className="truncate">{c.address}</div>
                    </td>
                    <td style={{ color: "var(--text-2)" }}>{c.district}</td>
                    <td><Badge label={c.state} kind="info" /></td>
                    <td>
                      <a href={`tel:${c.phone}`} style={{ color: "var(--gold)", fontSize: 12 }}>{c.phone || "—"}</a>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-2)", whiteSpace:"nowrap" }}>{c.timings}</td>
                    <td>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {c.lat?.toFixed(4)}, {c.lng?.toFixed(4)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:"flex", justifyContent:"flex-end", gap:6 }}>
                        <a href={`https://maps.google.com/?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer">
                          <Btn variant="ghost" size="sm" style={{ padding:"4px 6px" }} title="Open in Google Maps">
                            <Map size={13} />
                          </Btn>
                        </a>
                        <Btn variant="ghost" size="sm" style={{ padding:"4px 6px" }} onClick={() => openEdit(c)}>
                          <Edit2 size={13} />
                        </Btn>
                        <Btn variant="danger" size="sm" style={{ padding:"4px 6px" }}
                          loading={removing === c.id} onClick={() => handleDelete(c)}>
                          <Trash2 size={13} />
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

      {(editItem || creating) && (
        <Modal title={creating ? "Add New CSC" : `Edit — ${form.name}`} onClose={() => { setEdit(null); setCreate(false); }} width={600}>
          {creating && (
            <FormRow label="ID (unique)">
              <input style={{ width:"100%" }} value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })} placeholder="CSC_TN_099" />
            </FormRow>
          )}
          <FormRow label="Centre Name">
            <input style={{ width:"100%" }} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          </FormRow>
          <FormRow label="Full Address">
            <input style={{ width:"100%" }} value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} />
          </FormRow>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            <FormRow label="Phone">
              <input style={{ width:"100%" }} value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="044-12345678" />
            </FormRow>
            <FormRow label="Timings">
              <input style={{ width:"100%" }} value={form.timings || ""} onChange={e => setForm({ ...form, timings: e.target.value })} />
            </FormRow>
            <FormRow label="State">
              <select style={{ width:"100%" }} value={form.state || "TN"} onChange={e => setForm({ ...form, state: e.target.value })}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormRow>
            <FormRow label="District">
              <input style={{ width:"100%" }} value={form.district || ""} onChange={e => setForm({ ...form, district: e.target.value })} />
            </FormRow>
            <FormRow label="Latitude">
              <input type="number" step="0.0001" style={{ width:"100%" }} value={form.lat || ""} onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) })} />
            </FormRow>
            <FormRow label="Longitude">
              <input type="number" step="0.0001" style={{ width:"100%" }} value={form.lng || ""} onChange={e => setForm({ ...form, lng: parseFloat(e.target.value) })} />
            </FormRow>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8, paddingTop:16, borderTop:"1px solid var(--border)" }}>
            <Btn variant="outline" onClick={() => { setEdit(null); setCreate(false); }}>Cancel</Btn>
            <Btn loading={saving} onClick={handleSave}>Save CSC</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
