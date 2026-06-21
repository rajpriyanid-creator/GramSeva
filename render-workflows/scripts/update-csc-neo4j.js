#!/usr/bin/env node
/**
 * update-csc-neo4j.js
 * Reads /tmp/csc-raw.json and upserts CSC nodes with Point properties
 * so that the csc.routes.ts geo-distance query works.
 */

const fs     = require("fs");
const neo4j  = require("neo4j-driver");

const IN_FILE = "/tmp/csc-raw.json";

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
  { maxConnectionPoolSize: 5 }
);

const STATE_CODE_TO_NAME = {
  TN:"Tamil Nadu", UP:"Uttar Pradesh", MH:"Maharashtra",
  AP:"Andhra Pradesh", TS:"Telangana", KA:"Karnataka",
  KL:"Kerala", WB:"West Bengal", RJ:"Rajasthan", GJ:"Gujarat",
  MP:"Madhya Pradesh", BR:"Bihar", OD:"Odisha", PB:"Punjab",
  HR:"Haryana", DL:"Delhi", CG:"Chhattisgarh", JH:"Jharkhand",
};

async function upsertCSC(session, csc) {
  // 1 – Ensure State node exists
  const stateName = STATE_CODE_TO_NAME[csc.state] || csc.state;
  await session.run(
    `MERGE (st:State {code: $code}) SET st.name = $name`,
    { code: csc.state, name: stateName }
  );

  // 2 – Ensure District node exists and is linked to State
  const districtId = `DIST_${csc.state}_${(csc.district || "UNKNOWN").replace(/\s+/g, "_").toUpperCase()}`;
  await session.run(
    `MERGE (d:District {id: $id})
     SET d.name = $name
     WITH d
     MATCH (st:State {code: $stateCode})
     MERGE (d)-[:PART_OF]->(st)`,
    { id: districtId, name: csc.district || "Unknown", stateCode: csc.state }
  );

  // 3 – Upsert CSC node with Point for geospatial queries
  await session.run(
    `MERGE (c:CSC {id: $id})
     SET c += {
       name:     $name,
       address:  $address,
       phone:    $phone,
       timings:  $timings,
       lat:      $lat,
       lng:      $lng,
       location: point({latitude: $lat, longitude: $lng})
     }
     WITH c
     MATCH (d:District {id: $districtId})
     MERGE (c)-[:LOCATED_IN]->(d)`,
    {
      id:         csc.id,
      name:       csc.name,
      address:    csc.address || "",
      phone:      csc.phone   || "",
      timings:    csc.timings || "Mon–Sat 9am–5pm",
      lat:        csc.lat,
      lng:        csc.lng,
      districtId,
    }
  );
}

async function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`❌  ${IN_FILE} not found. Run fetch-csc.js first.`);
    process.exit(1);
  }

  const cscs = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));
  console.log(`📦  Loading ${cscs.length} CSCs into Neo4j…`);

  try {
    await driver.verifyConnectivity();
    console.log("✅  Neo4j connected");
  } catch (err) {
    console.error("❌  Neo4j connection failed:", err.message);
    process.exit(1);
  }

  const session = driver.session({ database: "neo4j" });
  let ok = 0, failed = 0;

  for (const csc of cscs) {
    try {
      await upsertCSC(session, csc);
      ok++;
    } catch (err) {
      console.warn(`  ⚠️  Failed CSC ${csc.id}: ${err.message}`);
      failed++;
    }
  }

  await session.close();
  await driver.close();
  console.log(`\n✅  Upserted ${ok} CSCs. Failures: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌  update-csc-neo4j failed:", err);
  process.exit(1);
});
