import { Router, Request, Response } from "express";
import { runQuery } from "../db/neo4j";

export const cscRouter = Router();

// ─── GET /api/csc/nearby?lat=&lng=&state= ─────────────────────────────────
// Returns 3 nearest CSCs using Neo4j point.distance().
// Falls back to state-level listing if lat/lng not provided.
cscRouter.get("/nearby", async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const state = (req.query.state as string) || "TN";

    if (!isNaN(lat) && !isNaN(lng)) {
      // Precise location search with distance calculation
      const results = await runQuery(
        `
        MATCH (csc:CSC)-[:LOCATED_IN]->(dist:District)-[:PART_OF]->(st:State)
        WHERE st.code = $state OR $state = 'ALL'
        WITH csc, dist, st,
             point.distance(
               point({latitude: csc.lat, longitude: csc.lng}),
               point({latitude: $user_lat, longitude: $user_lng})
             ) AS distance_m
        ORDER BY distance_m ASC
        LIMIT 5
        RETURN csc {
          .*,
          district: dist.name,
          state: st.name,
          distance_km: round(distance_m / 1000.0, 2)
        } AS csc
        `,
        { user_lat: lat, user_lng: lng, state }
      );

      return res.json({ cscs: results.map((r: any) => r.csc), state });
    }

    // Fallback: return all CSCs in the state
    const results = await runQuery(
      `
      MATCH (csc:CSC)-[:LOCATED_IN]->(dist:District)-[:PART_OF]->(st:State {code: $state})
      RETURN csc {
        .*,
        district: dist.name,
        state: st.name,
        distance_km: null
      } AS csc
      ORDER BY csc.name
      LIMIT 10
      `,
      { state }
    );

    res.json({ cscs: results.map((r: any) => r.csc), state });
  } catch (err: any) {
    console.error("[GET /csc/nearby]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/csc/:id ─────────────────────────────────────────────────────
// Returns full details for one CSC.
cscRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const results = await runQuery(
      `
      MATCH (csc:CSC {id: $id})-[:LOCATED_IN]->(dist:District)-[:PART_OF]->(st:State)
      RETURN csc { .*, district: dist.name, state: st.name } AS csc
      `,
      { id }
    );

    if (!results.length) {
      return res.status(404).json({ error: "CSC not found" });
    }

    res.json({ csc: (results[0] as any).csc });
  } catch (err: any) {
    console.error("[GET /csc/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
});
