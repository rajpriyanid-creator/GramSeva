import axios from "axios";

const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
const BASE = rawBase.replace(/\/api\/?$/, "");
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";

const http = axios.create({
  baseURL: BASE,
  headers: { "x-admin-key": ADMIN_KEY },
  timeout: 20000,
});

// ── Types ──────────────────────────────────────────────────────────────────
export interface Scheme {
  id: string; name: string; name_hi?: string; name_ta?: string;
  benefit: string; ministry: string; type: string; url: string; active: boolean;
  criteria_count: number; states: string[];
  department: { name: string; helpline: string };
}
export interface CSC {
  id: string; name: string; address: string; phone: string;
  timings: string; lat: number; lng: number;
  district: string; state: string; state_name: string;
}
export interface DuplicatePair {
  pair_id: string; score: number; reasons: string[];
  scheme_a: Pick<Scheme,"id"|"name"|"benefit"|"ministry"|"type"|"active">;
  scheme_b: Pick<Scheme,"id"|"name"|"benefit"|"ministry"|"type"|"active">;
}
export interface HealthCheck {
  service: string; status: "ok"|"error"|"warn"; latency_ms: number;
  uptime_s?: number; error?: string;
}
export interface OverviewStats {
  graph: Record<string,number>;
  scheme_types: { type: string; count: number }[];
  orphan_schemes: number;
  avg_criteria_per_scheme: number;
  max_criteria_per_scheme: number;
  analytics: {
    total_queries_alltime: number; total_completions_alltime: number;
    total_matches_alltime: number; queries_today: number;
    queries_this_week: number; avg_schemes_per_session: number;
    completion_rate: number; active_sessions_last_hour: number;
  };
  uptime_seconds: number;
}

// ── Stats ──────────────────────────────────────────────────────────────────
export const api = {
  stats:         () => http.get<OverviewStats>("/api/admin/stats").then(r => r.data),

  // Schemes
  getSchemes:    (p?: any) => http.get<{schemes:Scheme[];total:number}>("/api/admin/schemes", { params: p }).then(r => r.data),
  createScheme:  (d: any)  => http.post("/api/admin/schemes", d).then(r => r.data),
  updateScheme:  (id: string, d: any) => http.put(`/api/admin/schemes/${id}`, d).then(r => r.data),
  deleteScheme:  (id: string)         => http.delete(`/api/admin/schemes/${id}`).then(r => r.data),
  activateScheme:(id: string)         => http.post(`/api/admin/schemes/${id}/activate`).then(r => r.data),

  // Duplicates
  getDuplicates: () => http.get<{
    total_duplicates:number; exact:number; near:number; related:number;
    duplicates:DuplicatePair[]
  }>("/api/admin/duplicates").then(r => r.data),
  mergeDuplicate:(keep_id:string, remove_id:string) =>
    http.post("/api/admin/duplicates/merge", { keep_id, remove_id }).then(r => r.data),

  // CSC
  getCSCs:       () => http.get<{cscs:CSC[];total:number}>("/api/admin/cscs").then(r => r.data),
  createCSC:     (d: any)  => http.post("/api/admin/cscs", d).then(r => r.data),
  updateCSC:     (id: string, d: any) => http.put(`/api/admin/cscs/${id}`, d).then(r => r.data),
  deleteCSC:     (id: string)         => http.delete(`/api/admin/cscs/${id}`).then(r => r.data),

  // Graph stats
  graphStats:    () => http.get("/api/admin/graph-stats").then(r => r.data),

  // Health
  health:        () => http.get<{overall:string;checks:HealthCheck[];memory:any;node_version:string;env:string}>("/api/admin/health").then(r => r.data),

  // Analytics
  analyticsOverview:  () => http.get("/api/admin/analytics/overview").then(r => r.data),
  analyticsTimeline:  () => http.get<{timeline:any[]}>("/api/admin/analytics/timeline").then(r => r.data),
  analyticsHourly:    () => http.get<{hourly:any[]}>("/api/admin/analytics/hourly").then(r => r.data),
  analyticsLanguages: () => http.get<{languages:any[]}>("/api/admin/analytics/languages").then(r => r.data),
  analyticsStates:    () => http.get<{states:any[]}>("/api/admin/analytics/states").then(r => r.data),
  analyticsTopSchemes:() => http.get<{schemes:any[]}>("/api/admin/analytics/top-schemes").then(r => r.data),
  analyticsSessions:  () => http.get<{sessions:any[]}>("/api/admin/analytics/sessions").then(r => r.data),

  // Sync
  triggerSync:   () => http.post("/api/admin/sync/trigger").then(r => r.data),
};
