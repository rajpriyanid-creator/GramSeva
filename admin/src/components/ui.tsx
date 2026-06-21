import React, { useEffect } from "react";

// ── StatCard ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
  trend?: number; // positive = up, negative = down
}
export function StatCard({ label, value, sub, accent = "var(--gold)", icon, trend }: StatCardProps) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 6,
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
          {label}
        </span>
        {icon && <span style={{ color: accent, opacity: 0.7 }}>{icon}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text)" }}>{value.toLocaleString()}</span>
        {trend !== undefined && (
          <span style={{ fontSize: 12, color: trend >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────
type BadgeKind = "ok"|"error"|"warn"|"info"|"neutral"|"purple";
const BADGE_COLORS: Record<BadgeKind, { bg: string; color: string }> = {
  ok:      { bg: "#1b3d1c", color: "var(--green)" },
  error:   { bg: "#3d1b1b", color: "var(--red)" },
  warn:    { bg: "#3d2e1b", color: "var(--orange)" },
  info:    { bg: "#1b2f3d", color: "var(--blue)" },
  neutral: { bg: "var(--bg-hover)", color: "var(--text-2)" },
  purple:  { bg: "#2e1b3d", color: "var(--purple)" },
};
interface BadgeProps { label: string; kind?: BadgeKind; dot?: boolean; }
export function Badge({ label, kind = "neutral", dot }: BadgeProps) {
  const { bg, color } = BADGE_COLORS[kind];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: bg, color, borderRadius: 20,
      padding: "2px 10px", fontSize: 11, fontWeight: 600,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />}
      {label}
    </span>
  );
}

// ── PageHeader ──────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 24, flexWrap: "wrap", gap: 12,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

// ── Btn ─────────────────────────────────────────────────────────────────────
type BtnVariant = "primary"|"danger"|"ghost"|"outline";
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: "sm"|"md"; loading?: boolean;
}
const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: "var(--gold)", color: "#0a1410", fontWeight: 700 },
  danger:  { background: "var(--red)",  color: "#fff",    fontWeight: 600 },
  ghost:   { background: "transparent", color: "var(--text-2)", border: "none" },
  outline: { background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)" },
};
export function Btn({ variant = "primary", size = "md", loading, children, style, disabled, ...props }: BtnProps) {
  const sizeStyle: React.CSSProperties = size === "sm"
    ? { padding: "5px 12px", fontSize: 12, borderRadius: "var(--radius-sm)" }
    : { padding: "8px 18px", fontSize: 13, borderRadius: "var(--radius-sm)" };
  return (
    <button
      style={{ display: "inline-flex", alignItems: "center", gap: 6, transition: "opacity 0.15s",
        cursor: disabled || loading ? "not-allowed" : "pointer", opacity: disabled || loading ? 0.6 : 1,
        ...BTN_STYLES[variant], ...sizeStyle, ...style }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />}
      {children}
    </button>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { title: string; onClose: () => void; children: React.ReactNode; width?: number; }
export function Modal({ title, onClose, children, width = 560 }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", width: "100%", maxWidth: width,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", color: "var(--text-muted)", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── FormRow ──────────────────────────────────────────────────────────────────
export function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-2)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub }: { icon?: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 32px", gap: 12, color: "var(--text-muted)" }}>
      {icon && <div style={{ fontSize: 40, opacity: 0.5 }}>{icon}</div>}
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-2)" }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 60, color: "var(--text-muted)" }}>
      <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
    </div>
  );
}

// ── SectionCard ──────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", overflow: "hidden", ...style,
    }}>
      {children}
    </div>
  );
}
export function CardHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px", borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</span>
      {actions}
    </div>
  );
}
