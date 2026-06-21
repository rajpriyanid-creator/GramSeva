import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { eligibilityRouter } from "./routes/eligibility.routes";
import { schemesRouter } from "./routes/schemes.routes";
import { cscRouter } from "./routes/csc.routes";
import { pdfRouter } from "./routes/pdf.routes";
import { adminRouter } from "./routes/admin.routes";
import { authRouter } from "./routes/auth.routes";
import { applicationsRouter } from "./routes/applications.routes";
import { chatRouter } from "./routes/chat.routes";
import { neo4jDriver } from "./db/neo4j";
import { trackTranscribe, trackFindSchemes, requestLogger } from "./middleware/analytics.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" })); // base64 audio payloads
app.use(requestLogger);

// Wire analytics interceptors before the route handlers
app.post("/api/eligibility/transcribe",   trackTranscribe);
app.post("/api/eligibility/find-schemes", trackFindSchemes);

app.use("/api/eligibility", eligibilityRouter);
app.use("/api/schemes", schemesRouter);
app.use("/api/csc", cscRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/chat", chatRouter);

app.get("/health", (_: Request, res: Response) =>
  res.json({ status: "ok", service: "GramSeva API", timestamp: new Date().toISOString() })
);

import os from "os";

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  try {
    await neo4jDriver.verifyConnectivity();
    console.log(`✅ Neo4j connected`);
  } catch (err) {
    console.error("❌ Neo4j connection failed:", err);
  }
  console.log(`🚀 GramSeva API running on port ${PORT}`);
  console.log(`📡 Local Network Access URLs:`);
  console.log(`   - http://localhost:${PORT}`);
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`   - http://${iface.address}:${PORT}  <-- Use this for EXPO_PUBLIC_API_URL in mobile/.env`);
      }
    }
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await neo4jDriver.close();
  process.exit(0);
});
