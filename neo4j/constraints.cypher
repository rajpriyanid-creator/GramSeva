// ═══════════════════════════════════════════════════════════════════════════
// GramSeva Neo4j AuraDB — Constraints
// Run this file FIRST on a fresh AuraDB instance before seeding.
// cypher-shell -u neo4j -p <password> --address <host> -f neo4j/constraints.cypher
// ═══════════════════════════════════════════════════════════════════════════

// ── Scheme ──────────────────────────────────────────────────────────────────
CREATE CONSTRAINT scheme_id_unique IF NOT EXISTS
  FOR (s:Scheme) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT scheme_id_not_null IF NOT EXISTS
  FOR (s:Scheme) REQUIRE s.id IS NOT NULL;

// ── Department ──────────────────────────────────────────────────────────────
CREATE CONSTRAINT dept_id_unique IF NOT EXISTS
  FOR (d:Department) REQUIRE d.id IS UNIQUE;

// ── Criteria ────────────────────────────────────────────────────────────────
CREATE CONSTRAINT criteria_id_unique IF NOT EXISTS
  FOR (c:Criteria) REQUIRE c.id IS UNIQUE;

// ── State ────────────────────────────────────────────────────────────────────
CREATE CONSTRAINT state_code_unique IF NOT EXISTS
  FOR (st:State) REQUIRE st.code IS UNIQUE;

// ── District ─────────────────────────────────────────────────────────────────
CREATE CONSTRAINT district_id_unique IF NOT EXISTS
  FOR (d:District) REQUIRE d.id IS UNIQUE;

// ── CSC ──────────────────────────────────────────────────────────────────────
CREATE CONSTRAINT csc_id_unique IF NOT EXISTS
  FOR (c:CSC) REQUIRE c.id IS UNIQUE;
