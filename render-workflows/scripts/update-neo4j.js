#!/usr/bin/env node
/**
 * update-neo4j.js
 * Reads /tmp/schemes-parsed.json and upserts every scheme,
 * its Department, Criteria, and State relationships into AuraDB.
 *
 * Uses MERGE so re-runs are fully idempotent.
 */

const fs  = require("fs");
const neo4j = require("neo4j-driver");

const IN_FILE = "/tmp/schemes-parsed.json";

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
  { maxConnectionPoolSize: 5 }
);

async function run(session, cypher, params = {}) {
  const result = await session.run(cypher, params);
  return result;
}

async function upsertScheme(session, scheme) {
  // 1 – Scheme node
  await run(session,
    `MERGE (s:Scheme {id: $id})
     SET s += {
       name: $name, name_hi: $name_hi, name_ta: $name_ta, name_te: $name_te,
       name_kn: $name_kn, name_mr: $name_mr, name_bn: $name_bn,
       benefit: $benefit, ministry: $ministry, type: $type,
       url: $url, active: $active
     }`,
    {
      id:      scheme.id,
      name:    scheme.name,
      name_hi: scheme.name_hi,
      name_ta: scheme.name_ta,
      name_te: scheme.name_te,
      name_kn: scheme.name_kn,
      name_mr: scheme.name_mr,
      name_bn: scheme.name_bn,
      benefit:  scheme.benefit,
      ministry: scheme.ministry,
      type:     scheme.type,
      url:      scheme.url,
      active:   scheme.active !== false,
    }
  );

  // 2 – Department node + relationship
  const dept = scheme.department;
  if (dept) {
    await run(session,
      `MERGE (d:Department {id: $deptId})
       SET d += { name: $name, helpline: $helpline, portal: $portal }
       WITH d
       MATCH (s:Scheme {id: $schemeId})
       MERGE (s)-[:OFFERED_BY]->(d)`,
      {
        deptId:   dept.id   || `DEPT_${scheme.id}`,
        name:     dept.name || "Government Department",
        helpline: dept.helpline || "1800-11-4000",
        portal:   dept.portal   || scheme.url,
        schemeId: scheme.id,
      }
    );
  }

  // 3 – Criteria nodes + relationships
  for (const c of scheme.criteria || []) {
    await run(session,
      `MERGE (c:Criteria {id: $id})
       SET c += { field: $field, operator: $operator, value: $value, label: $label }
       WITH c
       MATCH (s:Scheme {id: $schemeId})
       MERGE (s)-[:REQUIRES]->(c)`,
      {
        id:       c.id,
        field:    c.field,
        operator: c.operator,
        value:    c.value,
        label:    c.label,
        schemeId: scheme.id,
      }
    );
  }

  // 4 – State availability relationships
  for (const stateCode of scheme.states || ["ALL"]) {
    await run(session,
      `MERGE (st:State {code: $code})
       WITH st
       MATCH (s:Scheme {id: $schemeId})
       MERGE (s)-[:AVAILABLE_IN]->(st)`,
      { code: stateCode, schemeId: scheme.id }
    );
  }
}

async function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`❌  ${IN_FILE} not found. Run parse-scheme-pdfs.js first.`);
    process.exit(1);
  }

  const schemes = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));
  console.log(`📦  Loading ${schemes.length} schemes into Neo4j…`);

  // Verify connectivity
  try {
    await driver.verifyConnectivity();
    console.log("✅  Neo4j connected");
  } catch (err) {
    console.error("❌  Neo4j connection failed:", err.message);
    process.exit(1);
  }

  const session = driver.session({ database: "neo4j" });
  let ok = 0, failed = 0;

  for (const scheme of schemes) {
    try {
      await upsertScheme(session, scheme);
      ok++;
      if (ok % 50 === 0) console.log(`  ↳ ${ok}/${schemes.length} done…`);
    } catch (err) {
      console.warn(`  ⚠️  Failed scheme ${scheme.id}: ${err.message}`);
      failed++;
    }
  }

  await session.close();
  await driver.close();

  console.log(`\n✅  Upserted ${ok} schemes. Failures: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌  update-neo4j failed:", err);
  process.exit(1);
});
