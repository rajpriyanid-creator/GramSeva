import { Router, Request, Response } from "express";
import { runQuery } from "../db/neo4j";
import axios from "axios";
import { textToSpeech } from "../services/sarvam.service";

export const chatRouter = Router();

// ─── POST /api/chat ────────────────────────────────────────────────────────
chatRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { messages, language_code } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // 1. Fetch active schemes from Neo4j to build context
    const dbSchemes = await runQuery(`
      MATCH (s:Scheme {active: true})
      OPTIONAL MATCH (s)-[:REQUIRES]->(c:Criteria)
      RETURN s.id AS id, s.name AS name, s.benefit AS benefit, s.ministry AS ministry, s.type AS type, collect(c.label) AS criteria
    `);

    let schemesContext = "Here are the government schemes available in our database:\n";
    dbSchemes.forEach((s: any) => {
      schemesContext += `- Scheme ID: ${s.id}\n  Name: ${s.name}\n  Benefit: ${s.benefit}\n  Ministry: ${s.ministry}\n  Type: ${s.type}\n  Criteria requirements: ${s.criteria.join(", ") || "None"}\n\n`;
    });

    const systemPrompt = `You are "GramSeva Assistant", a helpful, friendly AI assistant for Indian rural citizens.
Use the following database schemes to answer the user's questions about eligibility, benefits, and how to apply.
If the scheme they ask about is not listed, politely let them know and try to suggest the closest alternative from our database.
Keep your answers brief, clear, and easy to understand for rural citizens.
Answer in the language of the user query (e.g., Hindi, Tamil, Telugu, English, etc.).

${schemesContext}`;

    // 2. Call Sarvam AI Chat Completion API
    const response = await axios.post("https://api.sarvam.ai/v1/chat/completions", {
      model: "sarvam-105b",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.5,
      max_tokens: 1500
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

    // Call Sarvam TTS
    const base64Audio = await textToSpeech(text, language_code || "hi-IN");
    res.json({ audio: base64Audio });
  } catch (err: any) {
    console.error("[Chat TTS Error]:", err.message);
    res.status(500).json({ error: err.message });
  }
});
