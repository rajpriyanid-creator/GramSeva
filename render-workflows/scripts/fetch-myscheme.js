#!/usr/bin/env node
/**
 * fetch-myscheme.js
 * Pulls all Central + State schemes from MyScheme.gov.in API
 * and writes raw JSON to /tmp/myscheme-raw.json
 */

const https  = require("https");
const fs     = require("fs");
const path   = require("path");

const BASE_URL  = process.env.MYSCHEME_API_BASE || "https://api.myscheme.gov.in/v2";
const OUT_FILE  = path.join("/tmp", "myscheme-raw.json");
const PAGE_SIZE = 100;

const TARGET_STATES = [
  "ALL", "TN", "UP", "MH", "AP", "TS", "KA", "KL", "WB", "RJ",
  "GJ", "MP", "BR", "OD", "PB", "HR", "DL", "CG", "JH", "UK",
];

async function fetchPage(state, page) {
  const url = `${BASE_URL}/schemes?state=${state}&page=${page}&limit=${PAGE_SIZE}`;
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${e.message}`));
        }
      });
    }).on("error", reject);
  });
}

async function fetchAllSchemesForState(state) {
  const all = [];
  let page  = 1;
  while (true) {
    console.log(`  [${state}] page ${page}…`);
    let result;
    try {
      result = await fetchPage(state, page);
    } catch (err) {
      console.warn(`  [${state}] page ${page} failed: ${err.message} – stopping state.`);
      break;
    }
    const schemes = result?.data?.schemes || result?.schemes || [];
    if (!schemes.length) break;
    all.push(...schemes);
    if (schemes.length < PAGE_SIZE) break;
    page++;
    // Polite rate-limit: 200ms between pages
    await new Promise((r) => setTimeout(r, 200));
  }
  return all;
}

async function main() {
  console.log("🌐  Fetching schemes from MyScheme.gov.in…");
  const allSchemes = [];
  const seen       = new Set();

  for (const state of TARGET_STATES) {
    const schemes = await fetchAllSchemesForState(state);
    let newCount   = 0;
    for (const s of schemes) {
      const key = s.schemeCode || s.id || s.name;
      if (!seen.has(key)) {
        seen.add(key);
        allSchemes.push({ ...s, _fetch_state: state });
        newCount++;
      }
    }
    console.log(`  [${state}] +${newCount} new (total ${allSchemes.length})`);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(allSchemes, null, 2), "utf8");
  console.log(`✅  Wrote ${allSchemes.length} schemes → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("❌  fetch-myscheme failed:", err);
  process.exit(1);
});
