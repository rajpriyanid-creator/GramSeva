import { runQuery } from "./src/db/neo4j";

async function test() {
  try {
    console.log("Testing schemes query...");
    const results = await runQuery(`
      MATCH (s:Scheme)
      OPTIONAL MATCH (s)-[:OFFERED_BY]->(d:Department)
      OPTIONAL MATCH (s)-[:REQUIRES]->(c:Criteria)
      OPTIONAL MATCH (s)-[:AVAILABLE_IN]->(st:State)
      WITH s, d, count(DISTINCT c) AS ccount, collect(DISTINCT st.code) AS stateList
      RETURN {
        id: s.id, name: s.name, name_hi: s.name_hi, name_ta: s.name_ta,
        benefit: s.benefit, ministry: s.ministry, type: s.type,
        url: s.url, active: s.active,
        department: CASE WHEN d IS NOT NULL THEN { name: d.name, helpline: d.helpline } ELSE { name: '', helpline: '' } END,
        criteria_count: ccount,
        states: stateList
      } AS scheme
      ORDER BY scheme.name
    `);
    console.log("Success! Results count:", results.length);
    if (results.length > 0) {
      console.log("First result:", JSON.stringify(results[0], null, 2));
    }
  } catch (err: any) {
    console.error("Query failed:", err);
  }
}

test().then(() => process.exit(0));
