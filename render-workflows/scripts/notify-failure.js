#!/usr/bin/env node
/**
 * notify-failure.js
 * Posts a Slack message when the scheme-sync pipeline fails.
 * Called by the render-workflows on_failure hook.
 */

const https = require("https");

const WEBHOOK = process.env.SLACK_WEBHOOK;

function postSlack(payload) {
  return new Promise((resolve, reject) => {
    if (!WEBHOOK) {
      console.warn("SLACK_WEBHOOK not set – skipping notification");
      return resolve();
    }

    const body   = JSON.stringify(payload);
    const parsed = new URL(WEBHOOK);
    const opts   = {
      hostname: parsed.hostname,
      path:     parsed.pathname,
      method:   "POST",
      headers:  {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const now  = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const env  = process.env.NODE_ENV || "production";

  const payload = {
    text: `🚨 *GramSeva Scheme Sync FAILED* (${env})`,
    attachments: [
      {
        color:  "danger",
        fields: [
          { title: "Time (IST)", value: now,  short: true },
          { title: "Render Env", value: env,  short: true },
          {
            title: "Action Required",
            value: "Check Render cron logs. Schemes may be stale in Neo4j.",
            short: false,
          },
        ],
        footer: "GramSeva CI",
      },
    ],
  };

  await postSlack(payload);
  console.log("📣  Failure notification sent to Slack.");
}

main().catch((err) => {
  console.error("notify-failure crashed:", err.message);
  // Don't exit 1 – this is a best-effort notification
});
