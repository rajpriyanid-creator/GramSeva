# 🌿 GramSeva — Voice-First Government Scheme Navigator

> *"Every Indian citizen deserves to know what the government is giving them."*

GramSeva is a voice-first mobile app that helps rural Indians discover government welfare schemes they qualify for — in their own language, with no literacy or internet required during the actual interaction. Built for HACKHAZARDS '26.

---

## 🏆 Hackathon Tracks

| Track | Integration |
|-------|-------------|
| **Expo (Mobile)** | React Native / Expo Router mobile app |
| **Neo4j / AuraDB** | Graph DB for eligibility traversal across 500+ schemes |
| **Base44** | Render-hosted backend + scheduled scheme sync pipeline |

---

## 🗂 Project Structure

```
gramseva/
├── mobile/                     # Expo React Native app
│   ├── app/
│   │   ├── _layout.tsx         # Root stack navigator
│   │   ├── index.tsx           # Language selector (entry screen)
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx     # Bottom tab bar
│   │   │   ├── home.tsx        # Voice query flow
│   │   │   ├── schemes.tsx     # Browse all schemes
│   │   │   ├── results.tsx     # My matched schemes
│   │   │   └── csc.tsx         # Find nearby CSC centres
│   │   └── scheme/[id].tsx     # Scheme detail + PDF download
│   ├── components/             # Reusable UI components
│   ├── services/               # API, Audio, Cache services
│   ├── store/                  # Zustand global state
│   └── constants/              # Languages (10) + Questions
│
├── backend/                    # Node.js / Express / TypeScript API
│   └── src/
│       ├── index.ts            # Server entry
│       ├── db/neo4j.ts         # Neo4j AuraDB driver
│       ├── routes/
│       │   ├── eligibility.routes.ts   # STT → NLP → Neo4j match
│       │   ├── schemes.routes.ts       # Browse / search schemes
│       │   ├── csc.routes.ts           # Geospatial CSC lookup
│       │   └── pdf.routes.ts           # PDF checklist generation
│       └── services/
│           └── sarvam.service.ts       # Sarvam AI STT/TTS/Translate
│
├── render-workflows/           # Nightly sync pipeline
│   ├── scheme-sync.yaml        # Render cron job definition
│   └── scripts/
│       ├── fetch-myscheme.js   # Pull schemes from MyScheme API
│       ├── parse-scheme-pdfs.js # Normalise & extract criteria
│       ├── update-neo4j.js     # Upsert schemes into AuraDB
│       ├── fetch-csc.js        # Pull CSC locations
│       ├── update-csc-neo4j.js # Upsert CSCs with geospatial data
│       ├── validate-graph.js   # Post-sync integrity checks
│       └── notify-failure.js   # Slack alert on failure
│
├── neo4j/
│   ├── constraints.cypher      # Unique + not-null constraints
│   ├── indexes.cypher          # Full-text + spatial indexes
│   └── seed.cypher             # 15 real schemes + sample CSCs
│
└── render.yaml                 # Render deployment config
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js 20+
- Neo4j AuraDB account (free tier works)
- Sarvam AI API key → [sarvam.ai](https://sarvam.ai)
- Expo Go app (Android/iOS) or Android emulator

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, SARVAM_API_KEY

npm install
npm run dev        # Starts on http://localhost:3000
```

### 2. Neo4j Setup

In your AuraDB console → Open with Neo4j Browser → run in order:

```cypher
:source neo4j/constraints.cypher
:source neo4j/indexes.cypher
:source neo4j/seed.cypher
```

Or using cypher-shell:
```bash
cypher-shell -a $NEO4J_URI -u $NEO4J_USERNAME -p $NEO4J_PASSWORD -f neo4j/constraints.cypher
cypher-shell -a $NEO4J_URI -u $NEO4J_USERNAME -p $NEO4J_PASSWORD -f neo4j/indexes.cypher
cypher-shell -a $NEO4J_URI -u $NEO4J_USERNAME -p $NEO4J_PASSWORD -f neo4j/seed.cypher
```

### 3. Mobile Setup

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL=http://your-machine-ip:3000

npm install
npx expo start
# Scan QR code with Expo Go
```

---

## 🧠 Neo4j Graph Model

```
(:Scheme)-[:OFFERED_BY]->(:Department)
(:Scheme)-[:REQUIRES]->(:Criteria)
(:Scheme)-[:AVAILABLE_IN]->(:State)
(:CSC)-[:LOCATED_IN]->(:District)-[:PART_OF]->(:State)
```

### Eligibility Query Pattern

The core eligibility traversal matches a user's profile against ALL criteria of a scheme simultaneously:

```cypher
MATCH (s:Scheme {active: true})-[:REQUIRES]->(c:Criteria)
WITH s, collect(c) AS allCriteria
WITH s, allCriteria,
     [c IN allCriteria WHERE
       (c.field = 'age_min'    AND $age >= toFloat(c.value)) OR
       (c.field = 'income_max' AND $income <= toFloat(c.value)) OR
       ...
     ] AS satisfiedCriteria
WHERE size(satisfiedCriteria) = size(allCriteria)
RETURN s
```

### Geospatial CSC Query

```cypher
MATCH (c:CSC)
WITH c, point.distance(
  point({latitude: c.lat, longitude: c.lng}),
  point({latitude: $user_lat, longitude: $user_lng})
) AS distance_m
ORDER BY distance_m ASC LIMIT 5
```

---

## 🌐 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Service health check |
| `POST` | `/api/eligibility/transcribe` | STT → transcript + confirmation TTS |
| `POST` | `/api/eligibility/find-schemes` | Profile extraction + Neo4j match |
| `GET`  | `/api/schemes` | All active schemes |
| `GET`  | `/api/schemes/:id` | Single scheme detail |
| `GET`  | `/api/csc/nearby?lat=&lng=&state=` | Nearest CSC centres |
| `GET`  | `/api/pdf/checklist/:id` | Download document checklist PDF |
| `POST` | `/api/pdf/summary` | Download matched-schemes summary PDF |

---

## 🗣 Supported Languages

| Language | Sarvam Code | States |
|----------|-------------|--------|
| हिन्दी (Hindi) | `hi-IN` | UP, MP, RJ, HR, DL, BR… |
| தமிழ் (Tamil) | `ta-IN` | TN, PY |
| తెలుగు (Telugu) | `te-IN` | AP, TS |
| ಕನ್ನಡ (Kannada) | `kn-IN` | KA |
| मराठी (Marathi) | `mr-IN` | MH |
| বাংলা (Bengali) | `bn-IN` | WB |
| ગુજરાતી (Gujarati) | `gu-IN` | GJ |
| മലയാളം (Malayalam) | `ml-IN` | KL |
| ଓଡ଼ିଆ (Odia) | `or-IN` | OD |
| ਪੰਜਾਬੀ (Punjabi) | `pa-IN` | PB |

---

## 🚀 Deployment (Render)

1. Push to GitHub
2. Connect repo to Render
3. Render auto-reads `render.yaml` — creates web service + cron job
4. Set env vars in Render dashboard (NEO4J_*, SARVAM_API_KEY, DATA_GOV_API_KEY)
5. Mobile: `EXPO_PUBLIC_API_URL=https://gramseva-api.onrender.com npx expo build`

The nightly cron (1 AM IST) auto-fetches MyScheme.gov.in and refreshes the graph.

---

## 📲 User Flow

```
Language Select → Voice Question 1-8 → STT (Sarvam)
  → Entity Extraction → Neo4j Eligibility Query
    → Matched Schemes → TTS Summary
      → Scheme Detail → PDF Checklist Download
        → Find Nearest CSC → Directions / Call
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo 53 / React Native 0.76 / Expo Router 4 |
| State | Zustand + AsyncStorage |
| Backend | Node.js 20 / Express / TypeScript |
| Graph DB | Neo4j AuraDB (Free tier) |
| STT / TTS | Sarvam AI (`saarika:v1`, `bulbul:v1`) |
| Translation | Sarvam AI (`mayura:v1`) |
| PDF | PDFKit |
| Deploy | Render (Web Service + Cron) |
| Offline Cache | Expo SQLite |

---

## 🔒 Privacy

- **No login required**
- Voice data is processed by Sarvam AI and **never stored** by GramSeva
- User profile exists only in the current session (not persisted to any DB)
- Session ID is UUID-based and ephemeral

---

## 📄 License

MIT — Built for HACKHAZARDS '26
