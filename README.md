# 🌿 GramSeva — Voice-First Government Scheme Navigator

> **"Bridging the digital divide so every citizen can discover and claim their welfare benefits."**

GramSeva is a voice-first mobile application designed to help rural Indians discover government welfare schemes they qualify for in their native language. By utilizing conversational voice inputs, GramSeva makes complex policy details accessible to anyone—regardless of written literacy—and guides them directly to their nearest Common Service Centre (CSC) for physical application submission.

---

## 🌐 Live Deployments & Builds

*   **Android Mobile Application (Direct APK):** [Download gramseva-release.apk](https://github.com/rajpriyanid-creator/GramSeva/raw/main/releases/gramseva-release.apk)
*   **Expo EAS Build ID:** `f834b771-d10c-42c4-a655-3053ab5353c0`
*   **Admin Dashboard (Operations Portal):** [https://gramseva-admin.onrender.com/](https://gramseva-admin.onrender.com/)
*   **Production Backend API Endpoint:** [https://gramseva-api-c102.onrender.com/](https://gramseva-api-c102.onrender.com/)
*   **API Health Status:** [https://gramseva-api-c102.onrender.com/health](https://gramseva-api-c102.onrender.com/health)

---

## 💡 How GramSeva is Useful (Social Impact & Utility)

Rural citizens face significant barriers when attempting to access welfare benefits:
1. **Written Literacy & Language Barriers**: Most government portals are text-heavy and published in official formats that can be difficult to interpret. GramSeva resolves this by supporting **10 major Indian languages** using a voice-only onboarding flow.
2. **Complex Eligibility Rules**: Determining if one qualifies for a scheme involves traversing multiple overlapping parameters (e.g., age thresholds, caste categories, income caps, land holdings, and state of residence). GramSeva parses conversation speech, builds an profile vector, and runs a mathematical graph match in milliseconds.
3. **The "Double-Trip" Document Problem**: Rural residents often travel to government offices only to be turned away because they are missing a specific document. GramSeva generates a downloadable **PDF Document Checklist** containing the exact IDs and certificates required based on their personal profile.
4. **Physical Submission Assist**: Citizens can find nearby physical **Common Service Centres (CSCs)** using GPS geolocation, complete with operating hours, phone numbers, and navigation details.

---

## 🏗 Key Technology Highlights

### 1. 🌿 Neo4j & AuraDB (Decentralized Decision Graph)
Traditional relational databases struggle to scale when querying highly nested, conditional eligibility rules. GramSeva maps eligibility rules as a graph:
* **The Model**: `(:Scheme)-[:OFFERED_BY]->(:Department)`, `(:Scheme)-[:REQUIRES]->(:Criteria)`, and `(:Scheme)-[:AVAILABLE_IN]->(:State)`.
* **Traversals**: A single Cypher query evaluates dozens of criteria nodes simultaneously, returning qualifying schemes immediately without needing complex relational joins.
* **Geospatial Queries**: Uses Neo4j's spatial indexing to compute distances to CSC centers instantly via point-to-point distance formulas:
  ```cypher
  MATCH (c:CSC)
  WITH c, point.distance(
    point({latitude: c.lat, longitude: c.lng}),
    point({latitude: $user_lat, longitude: $user_lng})
  ) AS distance_m
  ORDER BY distance_m ASC LIMIT 5
  RETURN c, distance_m
  ```

### 2. 📱 Expo & React Native (Adaptive Mobile Interface)
* **Voice Recording Integration**: Captures native high-quality audio files directly on device and submits them to the backend speech-to-text pipeline.
* **Adaptive Screen Scaling**: The user interface automatically scales and shifts layouts whenever the soft keyboard is toggled to ensure key inputs remain clear and accessible.
* **Zustand State Store**: Manages user profiles, speech transcripts, matched schemes, and offline local cache values.

### 3. ☁️ Render Deployment (Free Tier Optimization)
* **Unified Blueprint Deployment**: Built using a unified `render.yaml` template to orchestrate the Node.js API Web Service and the Vite React Admin static portal.
* **Production Overrides**: Configured with production overrides (`NODE_ENV=development` inline) to fetch devDependencies like TypeScript type definitions during build time while keeping runtime dependencies lightweight.

---

## 🗂 Project Structure

```text
gramseva/
├── mobile/                     # Expo React Native App
│   ├── app/
│   │   ├── _layout.tsx         # Root Stack Navigator
│   │   ├── index.tsx           # Language Selector (entry screen)
│   │   └── (tabs)/             # Tab Navigation (Home, Schemes, Results, Profile)
│   ├── components/             # Custom UI Cards, Voice Buttons
│   ├── services/               # STT, Audio, and Storage Services
│   └── store/                  # Zustand Store for State Management
│
├── backend/                    # Express Node.js & TypeScript Server
│   ├── src/
│   │   ├── index.ts            # Main API Entry
│   │   ├── db/neo4j.ts         # AuraDB Connection Driver
│   │   ├── routes/             # API routes (schemes, eligibility, csc, pdf)
│   │   └── services/           # Analytics & Sarvam AI Translation integration
│   └── package.json            # Scripts & dependencies
│
├── admin/                      # Admin Operations Portal (Vite React Site)
│   ├── src/
│   │   ├── pages/              # Dashboard, Analytics, Graph, Applications
│   │   ├── services/api.ts     # Axios connection manager
│   │   └── tsconfig.json       # Type Declarations (vite/client)
│   └── index.html              # Entry HTML
│
└── render.yaml                 # Render Deployment Blueprints
```

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js v20+
* Neo4j AuraDB Database (Free tier available at [neo4j.com](https://neo4j.com/cloud/platform/auradb/))
* Sarvam AI API Key ([sarvam.ai](https://www.sarvam.ai/))

### 1. Setup Backend
```bash
cd backend
cp .env.example .env
# Fill in NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, SARVAM_API_KEY
npm install
npm run dev
```

### 2. Setup database Seed
To populate all 36 Indian states, national schemes, state-specific welfare pension schemes, and mock profiles:
```bash
npm run seed
```

### 3. Run Admin Portal
```bash
cd admin
npm install
npm run dev
```

### 4. Run Mobile App (Expo)
```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL=http://<your-machine-ip>:3000
npm install
npx expo start
```
Scan the QR code in your terminal with the Expo Go app on your phone.

---

## 🌐 API Reference

| Method | Path | Function |
|--------|------|----------|
| `GET`  | `/health` | API service health verification |
| `POST` | `/api/eligibility/transcribe` | Decodes voice recording files via Sarvam AI STT |
| `POST` | `/api/eligibility/find-schemes` | Traverses Neo4j database to match qualifying schemes |
| `GET`  | `/api/schemes` | Lists all active welfare schemes |
| `GET`  | `/api/csc/nearby` | Queries closest physical CSC locations |
| `GET`  | `/api/pdf/checklist/:id` | Downloads document checklist PDF for a scheme |
| `POST` | `/api/pdf/summary` | Generates a 1-page summary PDF of matched schemes |

---

## 🗣 Supported Languages

| Language | Sarvam Code | Coverage |
|----------|-------------|----------|
| हिन्दी (Hindi) | `hi-IN` | North/Central India |
| தமிழ் (Tamil) | `ta-IN` | Tamil Nadu & Puducherry |
| తెలుగు (Telugu) | `te-IN` | Andhra Pradesh & Telangana |
| ಕನ್ನಡ (Kannada) | `kn-IN` | Karnataka |
| मराठी (Marathi) | `mr-IN` | Maharashtra |
| বাংলা (Bengali) | `bn-IN` | West Bengal |
| ગુજરાતી (Gujarati) | `gu-IN` | Gujarat |
| മലയാളം (Malayalam) | `ml-IN` | Kerala |
| ଓଡ଼ିଆ (Odia) | `or-IN` | Odisha |
| ਪੰਜਾਬੀ (Punjabi) | `pa-IN` | Punjab |

---

## 🔒 Privacy & Data Policy
* **No Authentication Required**: Rural users can search for schemes without sharing any private personal identification records.
* **Ephemeral Sessions**: Personal profiles (age, income, etc.) reside entirely in local device states and are never saved permanently to external databases.
* **Audio Handling**: Voice recording packets are immediately transcribed using secure, stateless translation APIs and are never stored.

---

