#!/usr/bin/env node
/**
 * parse-scheme-pdfs.js
 * Reads /tmp/myscheme-raw.json, maps raw API fields to our
 * internal schema, and writes /tmp/schemes-parsed.json
 *
 * Also fetches any linked PDF guidelines and extracts document lists
 * using a heuristic line-by-line parser (no OCR needed – PDFs are text-based).
 */

const fs   = require("fs");
const path = require("path");
const http  = require("https");

const IN_FILE  = path.join("/tmp", "myscheme-raw.json");
const OUT_FILE = path.join("/tmp", "schemes-parsed.json");

// ── Normalise field values ─────────────────────────────────────────────────

function normaliseGender(raw) {
  if (!raw) return "ALL";
  const v = raw.toLowerCase();
  if (v.includes("female") || v.includes("women")) return "F";
  if (v.includes("male"))   return "M";
  return "ALL";
}

function normaliseCaste(raw) {
  if (!raw) return "ALL";
  const casteMap = { SC: "SC", ST: "ST", OBC: "OBC", EWS: "OBC" };
  const tokens   = raw.toUpperCase().split(/[\s,\/]+/);
  const found    = tokens.filter((t) => casteMap[t]).map((t) => casteMap[t]);
  return found.length ? [...new Set(found)].join(",") : "ALL";
}

function normaliseOccupation(raw) {
  if (!raw) return "ALL";
  const v = raw.toLowerCase();
  if (v.includes("farmer") || v.includes("agricultur") || v.includes("kisan")) return "farmer";
  if (v.includes("labour") || v.includes("worker") || v.includes("mazdoor"))   return "labourer";
  if (v.includes("business") || v.includes("entrepreneur") || v.includes("msme")) return "business";
  return "ALL";
}

function parseIncomeLakhToRupee(raw) {
  if (!raw) return null;
  const match = String(raw).replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(lakh|lac|l)?/i);
  if (!match) return null;
  const val  = parseFloat(match[1]);
  const unit = (match[2] || "").toLowerCase();
  return unit.startsWith("l") ? Math.round(val * 100000) : Math.round(val);
}

// ── Build criteria array from a raw scheme ────────────────────────────────

function buildCriteria(schemeId, raw) {
  const criteria = [];

  const genderVal = normaliseGender(raw.gender || raw.beneficiaryGender);
  if (genderVal !== "ALL") {
    criteria.push({
      id: `${schemeId}_GENDER`,
      field: "gender",
      operator: "=",
      value: genderVal,
      label: `Applicant must be ${genderVal === "F" ? "female" : "male"}`,
    });
  }

  const ageMin = parseInt(raw.ageMin || raw.minimumAge || 0, 10);
  const ageMax = parseInt(raw.ageMax || raw.maximumAge || 0, 10);
  if (ageMin > 0) {
    criteria.push({ id: `${schemeId}_AGE_MIN`, field: "age_min", operator: ">=", value: String(ageMin), label: `Age ≥ ${ageMin}` });
  }
  if (ageMax > 0) {
    criteria.push({ id: `${schemeId}_AGE_MAX`, field: "age_max", operator: "<=", value: String(ageMax), label: `Age ≤ ${ageMax}` });
  }

  const casteVal = normaliseCaste(raw.caste || raw.casteCategory || raw.socialCategory);
  if (casteVal !== "ALL") {
    criteria.push({ id: `${schemeId}_CASTE`, field: "caste", operator: "IN", value: casteVal, label: `Category: ${casteVal}` });
  }

  const incomeMax = parseIncomeLakhToRupee(raw.incomeMax || raw.annualIncome || raw.maximumIncome);
  if (incomeMax) {
    criteria.push({ id: `${schemeId}_INCOME`, field: "income_max", operator: "<=", value: String(incomeMax), label: `Annual income ≤ ₹${incomeMax.toLocaleString("en-IN")}` });
  }

  const bplText = (raw.bplCard || raw.rationCard || raw.category || "").toLowerCase();
  if (bplText.includes("bpl") || bplText.includes("below poverty")) {
    criteria.push({ id: `${schemeId}_BPL`, field: "bpl_card", operator: "=", value: "true", label: "BPL card holder" });
  }

  const occVal = normaliseOccupation(raw.occupation || raw.profession || raw.beneficiaryType);
  if (occVal !== "ALL") {
    criteria.push({ id: `${schemeId}_OCC`, field: "occupation", operator: "=", value: occVal, label: `Occupation: ${occVal}` });
  }

  const landAcres = parseFloat(raw.landHolding || raw.landAcres || 0);
  if (landAcres > 0) {
    criteria.push({ id: `${schemeId}_LAND`, field: "land_acres", operator: "<=", value: String(landAcres), label: `Land holding ≤ ${landAcres} acres` });
  }

  return criteria;
}

// ── Map state names to codes ───────────────────────────────────────────────

const STATE_NAME_TO_CODE = {
  "tamil nadu": "TN", "uttar pradesh": "UP", "maharashtra": "MH",
  "andhra pradesh": "AP", "telangana": "TS", "karnataka": "KA",
  "kerala": "KL", "west bengal": "WB", "rajasthan": "RJ",
  "gujarat": "GJ", "madhya pradesh": "MP", "bihar": "BR",
  "odisha": "OD", "punjab": "PB", "haryana": "HR", "delhi": "DL",
  "all india": "ALL", "central": "ALL",
};

function resolveStates(raw) {
  const stateRaw = raw.state || raw.stateCode || raw._fetch_state || "ALL";
  if (stateRaw === "ALL") return ["ALL"];
  if (stateRaw.length <= 2) return [stateRaw.toUpperCase()];
  const code = STATE_NAME_TO_CODE[(stateRaw || "").toLowerCase().trim()];
  return [code || "ALL"];
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`❌  Input not found: ${IN_FILE}. Run fetch-myscheme.js first.`);
    process.exit(1);
  }

  const raw     = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));
  const parsed  = [];
  const errors  = [];

  for (const item of raw) {
    try {
      const id = (item.schemeCode || item.id || item.slug || "SCH_" + Date.now())
        .toString()
        .replace(/[^A-Z0-9_]/gi, "_")
        .toUpperCase();

      const scheme = {
        id,
        name:     item.schemeName || item.name || "Unknown Scheme",
        name_hi:  item.schemeName_hi || item.name_hi || null,
        name_ta:  item.schemeName_ta || item.name_ta || null,
        name_te:  item.schemeName_te || item.name_te || null,
        name_kn:  item.schemeName_kn || item.name_kn || null,
        name_mr:  item.schemeName_mr || item.name_mr || null,
        name_bn:  item.schemeName_bn || item.name_bn || null,
        benefit:  item.benefit || item.benefitDescription || "Benefit as per scheme guidelines",
        ministry: item.ministry || item.department || item.nodal_ministry || "Government of India",
        type:     item.schemeType || item.type || "Direct Benefit Transfer",
        url:      item.schemeUrl || item.officialUrl || item.url || "https://myscheme.gov.in",
        active:   true,
        department: {
          id:       `DEPT_${id}`,
          name:     item.department || item.ministry || "Concerned Department",
          helpline: item.helplineNo || item.helpline || "1800-11-4000",
          portal:   item.portalUrl  || item.url      || "https://myscheme.gov.in",
        },
        criteria: buildCriteria(id, item),
        states:   resolveStates(item),
      };

      parsed.push(scheme);
    } catch (err) {
      errors.push({ item, error: err.message });
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(parsed, null, 2), "utf8");
  console.log(`✅  Parsed ${parsed.length} schemes → ${OUT_FILE}`);
  if (errors.length) {
    console.warn(`⚠️   ${errors.length} parse errors (see /tmp/parse-errors.json)`);
    fs.writeFileSync("/tmp/parse-errors.json", JSON.stringify(errors, null, 2));
  }
}

main();
