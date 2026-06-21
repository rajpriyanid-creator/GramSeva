import { Router, Request, Response } from "express";
import { runQuery } from "../db/neo4j";

export const schemesRouter = Router();

// ─── GET /api/schemes ─────────────────────────────────────────────────────
// Returns all active schemes with their department and criteria counts.
schemesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const results = await runQuery(`
      MATCH (s:Scheme {active: true})
      OPTIONAL MATCH (s)-[:OFFERED_BY]->(d:Department)
      OPTIONAL MATCH (s)-[:REQUIRES]->(c:Criteria)
      OPTIONAL MATCH (s)-[:AVAILABLE_IN]->(st:State)
      WITH s, d, count(DISTINCT c) AS ccount, collect(DISTINCT st.code) AS states
      RETURN s {
        .id, .name, .name_hi, .name_ta, .name_te, .name_kn,
        .name_mr, .name_bn, .benefit, .ministry, .type, .url,
        department: CASE WHEN d IS NOT NULL THEN { name: d.name, helpline: d.helpline, portal: d.portal } ELSE { name: '', helpline: '', portal: '' } END,
        criteria_count: ccount,
        states: states
      } AS scheme
      ORDER BY s.name
    `);

    res.json({
      schemes: (results as any[]).map((r: any) => ({
        ...r.scheme,
        criteria_count: typeof r.scheme.criteria_count === 'object'
          ? r.scheme.criteria_count.toNumber()
          : Number(r.scheme.criteria_count ?? 0)
      })),
      total: results.length,
    });
  } catch (err: any) {
    console.error("[GET /schemes]", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ─── GET /api/schemes/:id ─────────────────────────────────────────────────
// Returns full details for a single scheme including all criteria.
schemesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const results = await runQuery(
      `
      MATCH (s:Scheme {id: $id})
      OPTIONAL MATCH (s)-[:OFFERED_BY]->(d:Department)
      OPTIONAL MATCH (s)-[:REQUIRES]->(c:Criteria)
      OPTIONAL MATCH (s)-[:AVAILABLE_IN]->(st:State)
      RETURN s {
        .id, .name, .name_hi, .name_ta, .name_te, .name_kn,
        .name_mr, .name_bn, .benefit, .ministry, .type, .url,
        department: CASE WHEN d IS NOT NULL THEN d { .name, .helpline, .portal } ELSE null END,
        criteria: collect(DISTINCT c { .id, .field, .operator, .value, .label }),
        states:   collect(DISTINCT st.code)
      } AS scheme
      `,
      { id }
    );

    if (!results.length) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    res.json({ scheme: (results[0] as any).scheme });
  } catch (err: any) {
    console.error("[GET /schemes/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/schemes/by-type/:type ──────────────────────────────────────
// Filter schemes by type (Direct Benefit Transfer, Scholarship, etc.)
schemesRouter.get("/by-type/:type", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    const results = await runQuery(
      `
      MATCH (s:Scheme {active: true, type: $type})-[:OFFERED_BY]->(d:Department)
      RETURN s {
        .id, .name, .name_hi, .name_ta, .benefit, .ministry, .type, .url,
        department: d { .name, .helpline }
      } AS scheme
      ORDER BY scheme.name
      `,
      { type }
    );

    res.json({
      schemes: results.map((r: any) => r.scheme),
      total: results.length,
      type,
    });
  } catch (err: any) {
    console.error("[GET /schemes/by-type]", err.message);
    res.status(500).json({ error: err.message });
  }
});
