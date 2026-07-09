import axios from "axios";
import { runQuery } from "../db/neo4j";

export function startKeepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL || "https://gramseva-api-c102.onrender.com";
  
  // Render free tier sleeps after 15 minutes of inactivity.
  // 10 minutes interval is perfect to keep it awake.
  const intervalMs = 10 * 60 * 1000; 

  console.log(`[Keep-Alive] Service started. Ping URL: ${url}`);

  setInterval(async () => {
    try {
      console.log(`[Keep-Alive] Ping cycle started: ${new Date().toISOString()}`);
      
      // 1. HTTP Self-Ping to keep the Render container awake
      const healthUrl = `${url.replace(/\/$/, "")}/health`;
      console.log(`[Keep-Alive] Sending self-ping to: ${healthUrl}`);
      const httpRes = await axios.get(healthUrl);
      console.log(`[Keep-Alive] HTTP Self-ping response status: ${httpRes.status}`);

      // 2. Neo4j Active Query to keep the AuraDB connection awake
      console.log(`[Keep-Alive] Querying Neo4j to keep connection active...`);
      const neo4jResult = await runQuery("MATCH (s:Scheme) RETURN count(s) AS count");
      const count = neo4jResult[0]?.count?.toNumber?.() || neo4jResult[0]?.count || 0;
      console.log(`[Keep-Alive] Neo4j query successful. Total schemes in DB: ${count}`);

    } catch (err: any) {
      console.error(`[Keep-Alive] Error:`, err.message);
    }
  }, intervalMs);
}
