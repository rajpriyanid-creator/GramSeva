import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, List, Copy, MapPin, BarChart2,
  GitBranch, Activity, RefreshCw, ChevronLeft, ChevronRight, Leaf, FileCheck
} from "lucide-react";
import { useAdmin } from "../store/store";
import { api } from "../services/api";

const NAV = [
  { to: "/",              icon: LayoutDashboard,  label: "Dashboard"     },
  { to: "/schemes",       icon: List,             label: "Schemes"       },
  { to: "/applications",  icon: FileCheck,        label: "Applications"  },
  { to: "/duplicates",    icon: Copy,             label: "Duplicates"    },
  { to: "/csc",           icon: MapPin,           label: "CSC Manager"   },
  { to: "/analytics",     icon: BarChart2,        label: "Analytics"     },
  { to: "/graph",         icon: GitBranch,        label: "Graph Explorer"},
  { to: "/health",        icon: Activity,         label: "System Health" },
];

const S: Record<string, React.CSSProperties> = {
  sidebar: {
    display: "flex", flexDirection: "column",
    width: "var(--sidebar-w)", minHeight: "100vh",
    background: "var(--bg-sidebar)",
    borderRight: "1px solid var(--border)",
    transition: "width 0.2s ease", flexShrink: 0,
  },
  collapsed: { width: 56 },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "16px 14px", borderBottom: "1px solid var(--border)",
    minHeight: "var(--header-h)",
  },
  logoText: { color: "var(--gold)", fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden" },
  nav: { flex: 1, padding: "8px 0" },
  link: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "9px 14px", color: "var(--text-2)",
    transition: "background 0.15s, color 0.15s",
    borderRadius: 0, fontSize: 13, fontWeight: 500,
    whiteSpace: "nowrap", overflow: "hidden",
  },
  activeLink: { background: "var(--bg-hover)", color: "var(--gold)", borderLeft: "2px solid var(--gold)" },
  footer: { padding: "12px 14px", borderTop: "1px solid var(--border)" },
  syncBtn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "none", color: "var(--text-muted)",
    padding: "8px 0", width: "100%", fontSize: 12,
    transition: "color 0.15s",
    whiteSpace: "nowrap", overflow: "hidden",
  },
  collapseBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "none", color: "var(--text-muted)",
    padding: "8px", width: "100%",
    borderTop: "1px solid var(--border)", transition: "color 0.15s",
  },
};

export default function Sidebar() {
  const { collapsed, toggleSidebar, toast, syncing, setSyncing } = useAdmin();

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.triggerSync();
      toast("Sync job queued on Render ✓");
    } catch {
      toast("Sync trigger failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const sidebarStyle = { ...S.sidebar, ...(collapsed ? S.collapsed : {}) };

  return (
    <aside style={sidebarStyle}>
      <div style={S.logo}>
        <Leaf size={20} color="var(--gold)" style={{ flexShrink: 0 }} />
        {!collapsed && <span style={S.logoText}>GramSeva Admin</span>}
      </div>

      <nav style={S.nav}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            style={({ isActive }) => ({ ...S.link, ...(isActive ? S.activeLink : {}) })}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      <div style={S.footer}>
        {!collapsed && (
          <button
            style={{ ...S.syncBtn, color: syncing ? "var(--gold)" : "var(--text-muted)" }}
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={14} style={{ flexShrink: 0, animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? "Syncing…" : "Trigger Sync"}
          </button>
        )}
        <button style={S.collapseBtn} onClick={toggleSidebar} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
