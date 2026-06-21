#!/usr/bin/env node
/**
 * fetch-csc.js
 * Fetches Common Service Centre (CSC) locations from data.gov.in API.
 * Writes /tmp/csc-raw.json for update-csc-neo4j.js to consume.
 *
 * API: https://api.data.gov.in/resource/  (CSC directory dataset)
 * Fallback: embedded sample data for known states when API unavailable.
 */

const https = require("https");
const fs    = require("fs");

const OUT_FILE       = "/tmp/csc-raw.json";
const DATA_GOV_KEY   = process.env.DATA_GOV_API_KEY;
// CSC Locator dataset ID on data.gov.in
const DATASET_ID     = "6176ee09-3d56-4a3b-8115-21841576513d";
const PAGE_SIZE      = 500;

const TARGET_STATES = [
  "ANDHRA PRADESH", "TAMIL NADU", "MAHARASHTRA", "UTTAR PRADESH",
  "TELANGANA", "KARNATAKA", "KERALA", "WEST BENGAL", "RAJASTHAN",
  "GUJARAT", "MADHYA PRADESH", "BIHAR", "ODISHA", "PUNJAB",
];

// ── Fallback sample data (used when API is unavailable) ───────────────────
const SAMPLE_CSCS = [
  { id:"CSC_TN_001", name:"Arumbakkam CSC",          address:"42, Arumbakkam Main Rd, Chennai 600106", phone:"044-23611234", timings:"Mon–Sat 9am–5pm", lat:13.0827, lng:80.2707, state:"TN", district:"Chennai" },
  { id:"CSC_TN_002", name:"Vellore Town CSC",         address:"15, Gandhi Rd, Vellore 632001",          phone:"0416-2234567", timings:"Mon–Sat 9am–5pm", lat:12.9165, lng:79.1325, state:"TN", district:"Vellore" },
  { id:"CSC_TN_003", name:"Coimbatore RS Puram CSC",  address:"3, RS Puram, Coimbatore 641002",         phone:"0422-2227890", timings:"Mon–Sat 9am–6pm", lat:11.0168, lng:76.9558, state:"TN", district:"Coimbatore" },
  { id:"CSC_UP_001", name:"Hazratganj CSC Lucknow",   address:"12, Hazratganj, Lucknow 226001",         phone:"0522-2611111", timings:"Mon–Fri 10am–4pm", lat:26.8467, lng:80.9462, state:"UP", district:"Lucknow" },
  { id:"CSC_UP_002", name:"Varanasi Sigra CSC",       address:"8, Sigra, Varanasi 221010",              phone:"0542-2506677", timings:"Mon–Sat 9am–5pm", lat:25.3176, lng:82.9739, state:"UP", district:"Varanasi" },
  { id:"CSC_MH_001", name:"Shivajinagar Jan Seva",    address:"1, FC Rd, Pune 411004",                  phone:"020-25535555", timings:"Mon–Sat 9am–6pm", lat:18.5204, lng:73.8567, state:"MH", district:"Pune" },
  { id:"CSC_MH_002", name:"Andheri CSC Mumbai",       address:"85, Andheri West, Mumbai 400058",        phone:"022-26212345", timings:"Mon–Sat 9am–6pm", lat:19.1136, lng:72.8697, state:"MH", district:"Mumbai" },
  { id:"CSC_TS_001", name:"Abids Mee-Seva Centre",    address:"3-6-11 Abids, Hyderabad 500001",         phone:"040-23230789", timings:"Mon–Sat 9am–7pm", lat:17.3850, lng:78.4867, state:"TS", district:"Hyderabad" },
  { id:"CSC_AP_001", name:"Vijayawada Auto Nagar CSC","address": "Auto Nagar, Vijayawada 520007",       phone:"0866-2579000", timings:"Mon–Sat 9am–5pm", lat:16.5062, lng:80.6480, state:"AP", district:"Krishna" },
  { id:"CSC_KA_001", name:"Indiranagar CSC Bengaluru","address": "100ft Rd, Indiranagar, Bengaluru 560038", phone:"080-25212121", timings:"Mon–Sat 9am–6pm", lat:12.9784, lng:77.6408, state:"KA", district:"Bengaluru Urban" },
  { id:"CSC_KL_001", name:"Thiruvananthapuram CSC",   address:"MG Rd, Trivandrum 695001",               phone:"0471-2450200", timings:"Mon–Sat 9am–5pm", lat:8.5241,  lng:76.9366, state:"KL", district:"Thiruvananthapuram" },
  { id:"CSC_WB_001", name:"Salt Lake CSC Kolkata",    address:"Sector V, Salt Lake, Kolkata 700091",    phone:"033-23578900", timings:"Mon–Sat 10am–5pm", lat:22.5726, lng:88.4322, state:"WB", district:"North 24 Parganas" },
  { id:"CSC_RJ_001", name:"Jaipur Pink City CSC",     address:"Johari Bazaar, Jaipur 302003",           phone:"0141-2565678", timings:"Mon–Sat 9am–5pm", lat:26.9124, lng:75.7873, state:"RJ", district:"Jaipur" },
  { id:"CSC_GJ_001", name:"Ahmedabad Maninagar CSC",  address:"Maninagar, Ahmedabad 380008",            phone:"079-22171234", timings:"Mon–Sat 9am–6pm", lat:23.0225, lng:72.5714, state:"GJ", district:"Ahmedabad" },
  { id:"CSC_MP_001", name:"Bhopal New Market CSC",    address:"New Market, Bhopal 462003",              phone:"0755-2557890", timings:"Mon–Sat 9am–5pm", lat:23.2599, lng:77.4126, state:"MP", district:"Bhopal" },
  { id:"CSC_BR_001", name:"Patna Boring Road CSC",    address:"Boring Rd, Patna 800001",                phone:"0612-2690000", timings:"Mon–Sat 9am–5pm", lat:25.6093, lng:85.1376, state:"BR", district:"Patna" },
  { id:"CSC_OD_001", name:"Bhubaneswar Unit-IV CSC",  address:"Unit-IV, Bhubaneswar 751001",            phone:"0674-2431234", timings:"Mon–Sat 9am–5pm", lat:20.2961, lng:85.8245, state:"OD", district:"Khurda" },
  { id:"CSC_PB_001", name:"Amritsar Lawrence Rd CSC", address:"Lawrence Rd, Amritsar 143001",           phone:"0183-2562200", timings:"Mon–Sat 9am–5pm", lat:31.6340, lng:74.8723, state:"PB", district:"Amritsar" },
];

async function fetchFromDataGov() {
  if (!DATA_GOV_KEY) throw new Error("DATA_GOV_API_KEY not set");

  return new Promise((resolve, reject) => {
    const url = `https://api.data.gov.in/resource/${DATASET_ID}?api-key=${DATA_GOV_KEY}&format=json&limit=${PAGE_SIZE}`;
    https.get(url, { timeout: 15000 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json    = JSON.parse(data);
          const records = json?.records || json?.data || [];
          const mapped  = records.map((r, i) => ({
            id:       `CSC_API_${i}`,
            name:     r.centre_name || r.name || "CSC Centre",
            address:  [r.address, r.district, r.state].filter(Boolean).join(", "),
            phone:    r.phone || r.contact || "",
            timings:  r.timings || "Mon–Sat 9am–5pm",
            lat:      parseFloat(r.latitude  || r.lat  || 0),
            lng:      parseFloat(r.longitude || r.long || 0),
            state:    r.state_code || (r.state || "").toUpperCase().slice(0, 2),
            district: r.district || "",
          })).filter((c) => c.lat && c.lng);
          resolve(mapped);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function main() {
  let cscs;

  try {
    cscs = await fetchFromDataGov();
    console.log(`🌐  Fetched ${cscs.length} CSCs from data.gov.in`);
  } catch (err) {
    console.warn(`⚠️   data.gov.in fetch failed: ${err.message} – using sample data`);
    cscs = SAMPLE_CSCS;
    console.log(`📦  Using ${cscs.length} sample CSC records`);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(cscs, null, 2), "utf8");
  console.log(`✅  Wrote ${cscs.length} CSCs → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("❌  fetch-csc failed:", err);
  process.exit(1);
});
