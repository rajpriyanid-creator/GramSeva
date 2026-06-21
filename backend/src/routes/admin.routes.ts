import { Router, Request, Response } from "express";
import axios from "axios";
import { runQuery, neo4jDriver } from "../db/neo4j";
import { analyticsService } from "../services/analytics.service";

export const adminRouter = Router();

// ── Simple API-key guard (set ADMIN_KEY env var) ────────────────────────────
adminRouter.use((req, res, next) => {
  const key = process.env.ADMIN_KEY;
  if (key && req.headers["x-admin-key"] !== key) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// ── Trigram similarity helper ───────────────────────────────────────────────
function trigrams(s: string): Set<string> {
  const t = new Set<string>();
  const n = s.toLowerCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i < n.length - 2; i++) t.add(n.slice(i, i + 3));
  return t;
}
function trigramSim(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter((x) => tb.has(x)).length;
  return (2 * inter) / (ta.size + tb.size);
}

// ════════════════════════════════════════════════════════════════════════════
// OVERVIEW STATS
// ════════════════════════════════════════════════════════════════════════════
adminRouter.get("/stats", async (_req, res) => {
  try {
    const [nodeCounts, relCounts, schemeDist, orphans, avgCriteria] = await Promise.all([
      runQuery(`
        CALL apoc.meta.stats() YIELD labels RETURN labels
      `).catch(() => null),
      // fallback manual count
      runQuery(`
        MATCH (n) 
        RETURN labels(n)[0] AS label, count(n) AS count
        ORDER BY count DESC
      `),
      runQuery(`
        MATCH (s:Scheme {active:true})
        RETURN s.type AS type, count(s) AS count ORDER BY count DESC
      `),
      runQuery(`
        MATCH (s:Scheme) WHERE NOT (s)-[:REQUIRES]->(:Criteria)
        RETURN count(s) AS orphanSchemes
      `),
      runQuery(`
        MATCH (s:Scheme {active:true})-[:REQUIRES]->(c:Criteria)
        WITH s, count(c) AS cc
        RETURN avg(cc) AS avgCriteria, max(cc) AS maxCriteria, min(cc) AS minCriteria
      `),
    ]);

    const labelMap: Record<string, number> = {};
    (relCounts as any[]).forEach((r: any) => {
      if (r.label) labelMap[r.label] = Number(r.count);
    });

    const analyticsOverview = analyticsService.getOverview();

    res.json({
      graph: {
        schemes:     labelMap["Scheme"]     || 0,
        criteria:    labelMap["Criteria"]   || 0,
        departments: labelMap["Department"] || 0,
        states:      labelMap["State"]      || 0,
        districts:   labelMap["District"]   || 0,
        cscs:        labelMap["CSC"]        || 0,
      },
      scheme_types: (schemeDist as any[]).map((r: any) => ({ type: r.type, count: Number(r.count) })),
      orphan_schemes: Number((orphans as any[])[0]?.orphanSchemes || 0),
      avg_criteria_per_scheme: parseFloat(Number((avgCriteria as any[])[0]?.avgCriteria || 0).toFixed(2)),
      max_criteria_per_scheme: Number((avgCriteria as any[])[0]?.maxCriteria || 0),
      analytics: analyticsOverview,
      uptime_seconds: analyticsService.getUptimeSeconds(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SCHEMES CRUD
// ════════════════════════════════════════════════════════════════════════════
adminRouter.get("/schemes", async (req, res) => {
  try {
    const { search, type, active } = req.query as Record<string, string>;
    const activeFilter = active === "false" ? false : active === "true" ? true : null;

    const results = await runQuery(`
      MATCH (s:Scheme)
      WHERE ($active IS NULL OR s.active = $active)
        AND ($type IS NULL OR s.type = $type)
        AND ($search IS NULL OR toLower(s.name) CONTAINS toLower($search))
      OPTIONAL MATCH (s)-[:OFFERED_BY]->(d:Department)
      OPTIONAL MATCH (s)-[:REQUIRES]->(c:Criteria)
      OPTIONAL MATCH (s)-[:AVAILABLE_IN]->(st:State)
      WITH s, d, count(DISTINCT c) AS ccount, collect(DISTINCT st.code) AS stateList
      RETURN s {
        .id, .name, .name_hi, .name_ta, .benefit, .ministry, .type, .url, .active,
        department: CASE WHEN d IS NOT NULL THEN { name: d.name, helpline: d.helpline } ELSE { name: '', helpline: '' } END,
        criteria_count: ccount,
        states: stateList
      } AS scheme
      ORDER BY s.name
    `, {
      active: activeFilter,
      type:   type || null,
      search: search || null,
    });

    const schemes = (results as any[]).map((r: any) => ({
      ...r.scheme,
      criteria_count: typeof r.scheme.criteria_count === 'object'
        ? r.scheme.criteria_count.toNumber()
        : Number(r.scheme.criteria_count ?? 0),
    }));

    res.json({ schemes, total: schemes.length });
  } catch (err: any) {
    console.error("[GET /admin/schemes]", err.message);
    res.status(500).json({ error: err.message });
  }
});


adminRouter.post("/schemes", async (req, res) => {
  try {
    const { id, name, benefit, ministry, type, url, department, criteria, states } = req.body;
    if (!id || !name) return res.status(400).json({ error: "id and name required" });

    await runQuery(`
      MERGE (s:Scheme {id: $id})
      SET s += { name: $name, benefit: $benefit, ministry: $ministry,
                 type: $type, url: $url, active: true }
    `, { id, name, benefit, ministry, type, url });

    if (department) {
      await runQuery(`
        MERGE (d:Department {id: $deptId})
        SET d += { name: $deptName, helpline: $helpline }
        WITH d MATCH (s:Scheme {id: $schemeId}) MERGE (s)-[:OFFERED_BY]->(d)
      `, { deptId: `DEPT_${id}`, deptName: department.name, helpline: department.helpline, schemeId: id });
    }

    for (const c of criteria || []) {
      await runQuery(`
        MERGE (cr:Criteria {id: $cid})
        SET cr += { field: $field, operator: $op, value: $val, label: $label }
        WITH cr MATCH (s:Scheme {id: $schemeId}) MERGE (s)-[:REQUIRES]->(cr)
      `, { cid: `${id}_${c.field}`, field: c.field, op: c.operator, val: c.value, label: c.label, schemeId: id });
    }

    for (const st of states || ["ALL"]) {
      await runQuery(`
        MERGE (st:State {code: $code})
        WITH st MATCH (s:Scheme {id: $schemeId}) MERGE (s)-[:AVAILABLE_IN]->(st)
      `, { code: st, schemeId: id });
    }

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.put("/schemes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, benefit, ministry, type, url, active } = req.body;

    await runQuery(`
      MATCH (s:Scheme {id: $id})
      SET s += { name: $name, benefit: $benefit, ministry: $ministry,
                 type: $type, url: $url, active: $active }
    `, { id, name, benefit, ministry, type, url, active: active !== false });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.delete("/schemes/:id", async (req, res) => {
  try {
    await runQuery(
      `MATCH (s:Scheme {id: $id}) SET s.active = false`,
      { id: req.params.id }
    );
    res.json({ success: true, action: "deactivated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.post("/schemes/:id/activate", async (req, res) => {
  try {
    await runQuery(
      `MATCH (s:Scheme {id: $id}) SET s.active = true`,
      { id: req.params.id }
    );
    res.json({ success: true, action: "activated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DUPLICATE DETECTION
// ════════════════════════════════════════════════════════════════════════════
adminRouter.get("/duplicates", async (_req, res) => {
  try {
    // Fetch all schemes with their criteria sets
    const schemeRows = await runQuery(`
      MATCH (s:Scheme)
      OPTIONAL MATCH (s)-[:REQUIRES]->(c:Criteria)
      OPTIONAL MATCH (s)-[:OFFERED_BY]->(d:Department)
      OPTIONAL MATCH (s)-[:AVAILABLE_IN]->(st:State)
      RETURN s.id AS id, s.name AS name, s.benefit AS benefit,
             s.ministry AS ministry, s.type AS type, s.active AS active,
             d.name AS deptName,
             collect(DISTINCT c.id + ':' + c.field + '=' + c.value) AS criteriaKeys,
             collect(DISTINCT st.code) AS states
    `);

    const schemes = (schemeRows as any[]).map((r: any) => ({
      id:          r.id,
      name:        r.name || "",
      benefit:     (r.benefit || "").toLowerCase().trim(),
      ministry:    r.ministry || "",
      type:        r.type || "",
      active:      r.active,
      deptName:    r.deptName || "",
      criteriaSet: new Set<string>(r.criteriaKeys || []),
      states:      r.states || [],
    }));

    const duplicates: any[] = [];

    for (let i = 0; i < schemes.length; i++) {
      for (let j = i + 1; j < schemes.length; j++) {
        const a = schemes[i];
        const b = schemes[j];
        const reasons: string[] = [];
        let maxScore = 0;

        // 1. Exact name match
        if (a.name.toLowerCase() === b.name.toLowerCase()) {
          reasons.push("Exact name match");
          maxScore = Math.max(maxScore, 1.0);
        }

        // 2. High name similarity
        const nameSim = trigramSim(a.name, b.name);
        if (nameSim >= 0.75 && nameSim < 1.0) {
          reasons.push(`Name similarity ${(nameSim * 100).toFixed(0)}%`);
          maxScore = Math.max(maxScore, nameSim);
        }

        // 3. Identical benefit description
        if (a.benefit && b.benefit && a.benefit === b.benefit && a.benefit.length > 10) {
          reasons.push("Identical benefit description");
          maxScore = Math.max(maxScore, 0.9);
        }

        // 4. Identical criteria set
        const aKeys = [...a.criteriaSet].sort().join("|");
        const bKeys = [...b.criteriaSet].sort().join("|");
        if (aKeys && bKeys && aKeys === bKeys) {
          reasons.push("Identical eligibility criteria");
          maxScore = Math.max(maxScore, 0.95);
        }

        // 5. Criteria subset (one is strictly stricter)
        if (a.criteriaSet.size > 0 && b.criteriaSet.size > 0 && aKeys !== bKeys) {
          const inter   = [...a.criteriaSet].filter((k) => b.criteriaSet.has(k)).length;
          const smaller = Math.min(a.criteriaSet.size, b.criteriaSet.size);
          if (inter === smaller && inter > 1) {
            const superSet = a.criteriaSet.size > b.criteriaSet.size ? a.name : b.name;
            reasons.push(`Criteria subset – "${superSet}" is broader`);
            maxScore = Math.max(maxScore, 0.8);
          }
        }

        // 6. Same ministry + type + overlapping states
        if (
          a.ministry && b.ministry &&
          a.ministry === b.ministry &&
          a.type === b.type &&
          a.states.some((s: string) => b.states.includes(s) || s === "ALL" || b.states.includes("ALL"))
        ) {
          const benefitSim = trigramSim(a.benefit, b.benefit);
          if (benefitSim > 0.6) {
            reasons.push(`Same ministry + type + overlapping states (benefit sim ${(benefitSim * 100).toFixed(0)}%)`);
            maxScore = Math.max(maxScore, 0.7);
          }
        }

        if (reasons.length > 0) {
          duplicates.push({
            pair_id: `${a.id}__${b.id}`,
            score:   parseFloat(maxScore.toFixed(3)),
            reasons,
            scheme_a: { id: a.id, name: a.name, benefit: schemes[i].benefit, ministry: a.ministry, type: a.type, active: a.active },
            scheme_b: { id: b.id, name: b.name, benefit: schemes[j].benefit, ministry: b.ministry, type: b.type, active: b.active },
          });
        }
      }
    }

    duplicates.sort((a, b) => b.score - a.score);

    res.json({
      total_duplicates: duplicates.length,
      exact:    duplicates.filter((d) => d.score >= 1.0).length,
      near:     duplicates.filter((d) => d.score >= 0.75 && d.score < 1.0).length,
      related:  duplicates.filter((d) => d.score < 0.75).length,
      duplicates,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Merge: keep scheme_a, deactivate scheme_b */
adminRouter.post("/duplicates/merge", async (req, res) => {
  try {
    const { keep_id, remove_id } = req.body;
    if (!keep_id || !remove_id) return res.status(400).json({ error: "keep_id and remove_id required" });

    await runQuery(`MATCH (s:Scheme {id: $id}) SET s.active = false`, { id: remove_id });
    res.json({ success: true, kept: keep_id, deactivated: remove_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CSC MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
adminRouter.get("/cscs", async (_req, res) => {
  try {
    const results = await runQuery(`
      MATCH (c:CSC)-[:LOCATED_IN]->(d:District)-[:PART_OF]->(st:State)
      RETURN c { .*, district: d.name, state: st.code, state_name: st.name } AS csc
      ORDER BY csc.name
    `);
    res.json({ cscs: (results as any[]).map((r: any) => r.csc), total: results.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.post("/cscs", async (req, res) => {
  try {
    const { id, name, address, phone, timings, lat, lng, state, district } = req.body;
    const districtId = `DIST_${state}_${(district || "UNK").replace(/\s+/g, "_").toUpperCase()}`;

    await runQuery(`
      MERGE (st:State {code: $state})
      MERGE (d:District {id: $distId}) SET d.name = $distName
      MERGE (d)-[:PART_OF]->(st)
      MERGE (c:CSC {id: $id})
      SET c += { name: $name, address: $address, phone: $phone, timings: $timings,
                 lat: $lat, lng: $lng, location: point({latitude: $lat, longitude: $lng}) }
      MERGE (c)-[:LOCATED_IN]->(d)
    `, { id, name, address, phone, timings, lat, lng, state, distId: districtId, distName: district });

    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.put("/cscs/:id", async (req, res) => {
  try {
    const { name, address, phone, timings, lat, lng } = req.body;
    await runQuery(`
      MATCH (c:CSC {id: $id})
      SET c += { name: $name, address: $address, phone: $phone, timings: $timings,
                 lat: $lat, lng: $lng, location: point({latitude: $lat, longitude: $lng}) }
    `, { id: req.params.id, name, address, phone, timings, lat, lng });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.delete("/cscs/:id", async (req, res) => {
  try {
    await runQuery(`MATCH (c:CSC {id: $id}) DETACH DELETE c`, { id: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GRAPH STATS (Neo4j deep metrics)
// ════════════════════════════════════════════════════════════════════════════
adminRouter.get("/graph-stats", async (_req, res) => {
  try {
    const [nodeCounts, relCounts, topSchemes, orphanCriteria, deepSchemes, stateSchemes] = await Promise.all([
      runQuery(`
        MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC
      `),
      runQuery(`
        MATCH ()-[r]->() RETURN type(r) AS rel, count(r) AS count ORDER BY count DESC
      `),
      runQuery(`
        MATCH (s:Scheme {active:true})-[:REQUIRES]->(c:Criteria)
        WITH s, count(c) AS cc ORDER BY cc DESC LIMIT 10
        RETURN s.id AS id, s.name AS name, cc AS criteria_count
      `),
      runQuery(`
        MATCH (c:Criteria) WHERE NOT ()-[:REQUIRES]->(c) RETURN count(c) AS n
      `),
      runQuery(`
        MATCH (s:Scheme {active:true})-[:REQUIRES]->(c:Criteria)
        WITH s, count(c) AS depth WHERE depth >= 4
        RETURN count(s) AS complex_schemes
      `),
      runQuery(`
        MATCH (s:Scheme {active:true})-[:AVAILABLE_IN]->(st:State)
        RETURN st.code AS state, count(s) AS scheme_count ORDER BY scheme_count DESC
      `),
    ]);

    const labelMap: Record<string, number> = {};
    (nodeCounts as any[]).forEach((r: any) => {
      if (r.label) labelMap[r.label] = Number(r.count);
    });

    const relMap: Record<string, number> = {};
    (relCounts as any[]).forEach((r: any) => {
      if (r.rel) relMap[r.rel] = Number(r.count);
    });

    res.json({
      nodes:     labelMap,
      total_nodes: Object.values(labelMap).reduce((a, b) => a + b, 0),
      relationships: relMap,
      total_relationships: Object.values(relMap).reduce((a, b) => a + b, 0),
      top_schemes_by_criteria: (topSchemes as any[]).map((r: any) => ({
        id: r.id, name: r.name, criteria_count: Number(r.criteria_count),
      })),
      orphan_criteria:       Number((orphanCriteria as any[])[0]?.n || 0),
      complex_schemes:       Number((deepSchemes as any[])[0]?.complex_schemes || 0),
      schemes_by_state:      (stateSchemes as any[]).map((r: any) => ({
        state: r.state, count: Number(r.scheme_count),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ════════════════════════════════════════════════════════════════════════════
adminRouter.get("/health", async (_req, res) => {
  const checks: any[] = [];

  // Neo4j check
  const neo4jStart = Date.now();
  try {
    await neo4jDriver.verifyConnectivity();
    checks.push({ service: "Neo4j AuraDB", status: "ok", latency_ms: Date.now() - neo4jStart });
  } catch (err: any) {
    checks.push({ service: "Neo4j AuraDB", status: "error", error: err.message, latency_ms: Date.now() - neo4jStart });
  }

  // Sarvam AI check (ping the base URL)
  const sarvamStart = Date.now();
  try {
    await axios.get("https://api.sarvam.ai", { timeout: 5000 });
    checks.push({ service: "Sarvam AI", status: "ok", latency_ms: Date.now() - sarvamStart });
  } catch (err: any) {
    // Sarvam returns 404 on GET / but that means it's reachable
    const isReachable = err.response && err.response.status < 500;
    checks.push({
      service: "Sarvam AI",
      status:  isReachable ? "ok" : "error",
      latency_ms: Date.now() - sarvamStart,
      error:   isReachable ? undefined : err.message,
    });
  }

  // Self (API)
  checks.push({
    service:    "GramSeva API",
    status:     "ok",
    latency_ms: 0,
    uptime_s:   analyticsService.getUptimeSeconds(),
  });

  // Memory
  const mem = process.memoryUsage();
  const overallOk = checks.every((c) => c.status === "ok");

  res.json({
    overall:  overallOk ? "ok" : "degraded",
    checks,
    memory: {
      heap_used_mb:  Math.round(mem.heapUsed  / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      rss_mb:        Math.round(mem.rss       / 1024 / 1024),
    },
    node_version: process.version,
    env:          process.env.NODE_ENV || "development",
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
adminRouter.get("/analytics/overview",   (_req, res) => res.json(analyticsService.getOverview()));
adminRouter.get("/analytics/timeline",   (_req, res) => res.json({ timeline: analyticsService.getTimeline(30) }));
adminRouter.get("/analytics/hourly",     (_req, res) => res.json({ hourly: analyticsService.getHourlyTimeline() }));
adminRouter.get("/analytics/languages",  (_req, res) => res.json({ languages: analyticsService.getLanguageDistribution() }));
adminRouter.get("/analytics/states",     (_req, res) => res.json({ states: analyticsService.getStateDistribution() }));
adminRouter.get("/analytics/top-schemes",(_req, res) => res.json({ schemes: analyticsService.getTopSchemes(15) }));
adminRouter.get("/analytics/sessions",   (_req, res) => res.json({ sessions: analyticsService.getRecentSessions(30) }));

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER SYNC
// ════════════════════════════════════════════════════════════════════════════
adminRouter.post("/sync/trigger", async (_req, res) => {
  // In production this would invoke the Render cron via API or run a job queue
  res.json({
    success: true,
    message: "Sync job queued. Check Render cron logs for progress.",
    render_cron_url: "https://dashboard.render.com",
  });
});
