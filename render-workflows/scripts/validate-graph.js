#!/usr/bin/env node
/**
 * validate-graph.js
 * Runs sanity checks on the Neo4j graph after each sync.
 * Exits non-zero if any critical check fails.
 */

const neo4j = require("neo4j-driver");

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

const CHECKS = [
  {
    name: "At least 15 active schemes exist",
    query: "MATCH (s:Scheme {active:true}) RETURN count(s) AS n",
    validate: (r) => r[0]?.n?.toInt?.() >= 15 || r[0]?.n >= 15,
  },
  {
    name: "All schemes have an OFFERED_BY department",
    query: `MATCH (s:Scheme {active:true})
            WHERE NOT (s)-[:OFFERED_BY]->(:Department)
            RETURN count(s) AS n`,
    validate: (r) => (r[0]?.n?.toInt?.() ?? r[0]?.n ?? 0) === 0,
  },
  {
    name: "All schemes have at least one AVAILABLE_IN state",
    query: `MATCH (s:Scheme {active:true})
            WHERE NOT (s)-[:AVAILABLE_IN]->(:State)
            RETURN count(s) AS n`,
    validate: (r) => (r[0]?.n?.toInt?.() ?? r[0]?.n ?? 0) === 0,
  },
  {
    name: "At least 5 CSC nodes with valid lat/lng",
    query: `MATCH (c:CSC) WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL RETURN count(c) AS n`,
    validate: (r) => (r[0]?.n?.toInt?.() ?? r[0]?.n ?? 0) >= 5,
  },
  {
    name: "CSC nodes have LOCATED_IN district links",
    query: `MATCH (c:CSC) WHERE NOT (c)-[:LOCATED_IN]->(:District) RETURN count(c) AS n`,
    validate: (r) => (r[0]?.n?.toInt?.() ?? r[0]?.n ?? 0) === 0,
  },
  {
    name: "PM-KISAN scheme exists",
    query: `MATCH (s:Scheme {id:'PM_KISAN'}) RETURN count(s) AS n`,
    validate: (r) => (r[0]?.n?.toInt?.() ?? r[0]?.n ?? 0) >= 1,
  },
  {
    name: "Criteria nodes have required fields",
    query: `MATCH (c:Criteria)
            WHERE c.field IS NULL OR c.value IS NULL
            RETURN count(c) AS n`,
    validate: (r) => (r[0]?.n?.toInt?.() ?? r[0]?.n ?? 0) === 0,
  },
];

async function main() {
  console.log("🔍  Validating GramSeva graph…\n");

  try {
    await driver.verifyConnectivity();
  } catch (err) {
    console.error("❌  Neo4j connection failed:", err.message);
    process.exit(1);
  }

  const session = driver.session({ database: "neo4j" });
  let pass = 0, fail = 0;

  for (const check of CHECKS) {
    try {
      const result  = await session.run(check.query);
      const records = result.records.map((r) => r.toObject());
      const ok      = check.validate(records);
      if (ok) {
        console.log(`  ✅  ${check.name}`);
        pass++;
      } else {
        console.error(`  ❌  FAIL: ${check.name}`);
        console.error(`       Got:`, JSON.stringify(records));
        fail++;
      }
    } catch (err) {
      console.error(`  ❌  ERROR: ${check.name} — ${err.message}`);
      fail++;
    }
  }

  await session.close();
  await driver.close();

  console.log(`\n${pass}/${CHECKS.length} checks passed.`);
  if (fail > 0) {
    console.error(`❌  ${fail} validation(s) failed – sync pipeline flagged.`);
    process.exit(1);
  }
  console.log("✅  Graph validation complete.");
}

main().catch((err) => {
  console.error("❌  validate-graph crashed:", err);
  process.exit(1);
});
