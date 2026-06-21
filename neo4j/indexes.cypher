// ═══════════════════════════════════════════════════════════════════════════
// GramSeva Neo4j AuraDB — Indexes
// Run AFTER constraints.cypher
// ═══════════════════════════════════════════════════════════════════════════

// ── Scheme property indexes ──────────────────────────────────────────────────
CREATE INDEX scheme_type IF NOT EXISTS
  FOR (s:Scheme) ON (s.type);

CREATE INDEX scheme_active IF NOT EXISTS
  FOR (s:Scheme) ON (s.active);

CREATE INDEX scheme_ministry IF NOT EXISTS
  FOR (s:Scheme) ON (s.ministry);

// ── Full-text search on scheme names (all 10 languages) ─────────────────────
CREATE FULLTEXT INDEX scheme_name_fulltext IF NOT EXISTS
  FOR (s:Scheme)
  ON EACH [
    s.name,
    s.name_hi,
    s.name_ta,
    s.name_te,
    s.name_kn,
    s.name_mr,
    s.name_bn,
    s.name_gu,
    s.name_ml,
    s.name_or,
    s.name_pa
  ];

// ── Criteria index for eligibility traversal ────────────────────────────────
CREATE INDEX criteria_field IF NOT EXISTS
  FOR (c:Criteria) ON (c.field);

// ── State code index ─────────────────────────────────────────────────────────
CREATE INDEX state_code_idx IF NOT EXISTS
  FOR (st:State) ON (st.code);

// ── CSC geospatial (point) index ─────────────────────────────────────────────
CREATE POINT INDEX csc_location IF NOT EXISTS
  FOR (c:CSC) ON (c.location);

// ── Department helpline ───────────────────────────────────────────────────────
CREATE INDEX dept_helpline IF NOT EXISTS
  FOR (d:Department) ON (d.helpline);
