import { Router, Request, Response } from "express";
import { runQuery } from "../db/neo4j";
import axios from "axios";
import { textToSpeech } from "../services/sarvam.service";

export const chatRouter = Router();

chatRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { messages, language_code, userId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // 1. Fetch user profile if logged in
    let userState = null;
    let userContext = "";
    if (userId) {
      const userRes = await runQuery(`
        MATCH (u:User {id: $userId})
        RETURN u
      `, { userId });
      if (userRes && userRes.length > 0) {
        const u = userRes[0].u.properties;
        userState = u.state;

        // Fetch user's applied schemes
        const appRes = await runQuery(`
          MATCH (u:User {id: $userId})-[:APPLIED_FOR]->(a:Application)-[:FOR_SCHEME]->(s:Scheme)
          RETURN s.name AS schemeName, a.status AS status, a.createdAt AS appliedAt
        `, { userId });

        let appText = "No schemes applied yet.";
        if (appRes && appRes.length > 0) {
          appText = appRes.map((a: any) => `- Scheme Name: ${a.schemeName}\n  Application Status: ${a.status}\n  Applied Date: ${a.appliedAt || "Not specified"}`).join("\n");
        }

        userContext = `\nThe current user interacting with you is:
- Name: ${u.name}
- GramSeva ID: ${u.gramsevaId}
- Age: ${u.age}
- Gender: ${u.gender}
- State: ${u.state}
- District: ${u.district || "Not set"}
- Occupation: ${u.occupation}
- Annual Income: INR ${u.annual_income}
- Land owned (Acres): ${u.land_acres}
- BPL Card Holder: ${u.bpl_card}
- Caste Category: ${u.caste_category}

The user's list of applied schemes and application status:
${appText}

Please use this user's profile details and applied schemes status to assess if they qualify for the schemes listed below, reference their specific attributes directly to provide clear, customized assistance, and answer in their query's language.`;
      }
    }

    // 2. Fetch active schemes from Neo4j (filtered by state if user is logged in)
    const dbSchemes = await runQuery(`
      MATCH (s:Scheme {active: true})-[:AVAILABLE_IN]->(st:State)
      WHERE st.code = 'ALL' OR ($userState IS NOT NULL AND st.name = $userState)
      OPTIONAL MATCH (s)-[:REQUIRES]->(c:Criteria)
      RETURN s.id AS id, s.name AS name, s.benefit AS benefit, s.ministry AS ministry, s.type AS type, collect(c.label) AS criteria
    `, { userState });

    let schemesContext = "Here are the government schemes available in our database:\n";
    dbSchemes.forEach((s: any) => {
      schemesContext += `- Scheme ID: ${s.id}\n  Name: ${s.name}\n  Benefit: ${s.benefit}\n  Ministry: ${s.ministry}\n  Type: ${s.type}\n  Criteria requirements: ${s.criteria.join(", ") || "None"}\n\n`;
    });

    const systemPrompt = `You are "GramSeva Assistant", a helpful, friendly AI assistant for Indian rural citizens.
Use the following database schemes to answer the user's questions about eligibility, benefits, and how to apply.
If the scheme they ask about is not listed, politely let them know and try to suggest the closest alternative from our database.
Keep your answers brief, clear, and easy to understand for rural citizens.
Answer in the language of the user query (e.g., Hindi, Tamil, Telugu, English, etc.).
${userContext}

${schemesContext}`;

    // 3. Call Sarvam AI Chat Completion API
    const response = await axios.post("https://api.sarvam.ai/v1/chat/completions", {
      model: "sarvam-105b",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.5,
      max_tokens: 1500,
      reasoning_effort: null
    }, {
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY!,
        "Content-Type": "application/json"
      },
      timeout: 20000
    });

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (err: any) {
    console.error("[Chat API Error]:", err.message);
    res.status(500).json({ error: "Failed to communicate with AI Assistant. Please try again." });
  }
});

// ─── POST /api/chat/tts ────────────────────────────────────────────────────
chatRouter.post("/tts", async (req: Request, res: Response) => {
  try {
    const { text, language_code } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });

    // Call Sarvam TTS — use the language passed from client, fallback to en-IN (not hi-IN)
    const base64Audio = await textToSpeech(text, language_code || "en-IN");
    res.json({ audio: base64Audio });
  } catch (err: any) {
    console.error("[Chat TTS Error]:", err.message);
    res.status(500).json({ error: err.message });
  }
});
