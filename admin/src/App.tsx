import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { useAdmin } from "./store/store";
import DashboardPage  from "./pages/DashboardPage";
import SchemesPage    from "./pages/SchemesPage";
import DuplicatesPage from "./pages/DuplicatesPage";
import CSCPage        from "./pages/CSCPage";
import AnalyticsPage  from "./pages/AnalyticsPage";
import GraphPage      from "./pages/GraphPage";
import HealthPage        from "./pages/HealthPage";
import ApplicationsPage from "./pages/ApplicationsPage";

export default function App() {
  const { toasts, dismissToast } = useAdmin();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px", minWidth: 0 }}>
        <Routes>
          <Route path="/"           element={<DashboardPage  />} />
          <Route path="/schemes"    element={<SchemesPage    />} />
          <Route path="/duplicates" element={<DuplicatesPage />} />
          <Route path="/csc"        element={<CSCPage        />} />
          <Route path="/analytics"  element={<AnalyticsPage  />} />
          <Route path="/graph"      element={<GraphPage      />} />
          <Route path="/health"        element={<HealthPage        />} />
          <Route path="/applications" element={<ApplicationsPage />} />
        </Routes>
      </main>

      {/* Toast stack */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast ${t.kind === "error" ? "error" : t.kind === "warn" ? "warn" : ""}`}
            onClick={() => dismissToast(t.id)}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
