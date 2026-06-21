import { Router, Request, Response } from "express";
import {
  transcribeAudio,
  translateToEnglish,
  textToSpeech,
  extractUserProfile,
} from "../services/sarvam.service";
import { runQuery } from "../db/neo4j";

export const eligibilityRouter = Router();

// ─── POST /api/eligibility/transcribe ─────────────────────────────────────
// Receives base64 audio for one question answer.
// Returns: transcript + English translation + TTS confirmation audio
eligibilityRouter.post(
  "/transcribe",
  async (req: Request, res: Response) => {
    try {
      const { audio, language_code, question_key, session_id } = req.body;

      if (!audio || !language_code) {
        return res
          .status(400)
          .json({ error: "audio and language_code are required" });
      }

      // Step 1: Speech-to-text via Sarvam
      const transcript = await transcribeAudio(audio, language_code);

      // Step 2: Translate to English for entity extraction
      const english_text = await translateToEnglish(transcript, language_code);

      // Step 3: TTS confirmation in the user's language
      const confirmationMap: Record<string, string> = {
        "hi-IN": `आपने कहा: ${transcript}`,
        "ta-IN": `நீங்கள் சொன்னது: ${transcript}`,
        "te-IN": `మీరు చెప్పారు: ${transcript}`,
        "kn-IN": `ನೀವು ಹೇಳಿದ್ದು: ${transcript}`,
        "mr-IN": `तुम्ही म्हणालात: ${transcript}`,
        "bn-IN": `আপনি বললেন: ${transcript}`,
        "gu-IN": `તમે કહ્યું: ${transcript}`,
        "ml-IN": `നിങ്ങൾ പറഞ്ഞു: ${transcript}`,
        "or-IN": `ଆପଣ କହିଲେ: ${transcript}`,
        "pa-IN": `ਤੁਸੀਂ ਕਿਹਾ: ${transcript}`,
        "en-IN": `You said: ${transcript}`,
      };
      const confirmText =
        confirmationMap[language_code] || `You said: ${transcript}`;
      let confirmation_audio = "";
      try {
        confirmation_audio = await textToSpeech(confirmText, language_code);
      } catch (ttsErr: any) {
        console.warn("[TTS Warning] Confirmation audio failed:", ttsErr.message);
      }

      res.json({
        transcript,
        english_text,
        confirmation_audio,
        question_key,
        session_id,
      });
    } catch (err: any) {
      console.error("[/transcribe]", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

eligibilityRouter.post(
  "/raw-transcribe",
  async (req: Request, res: Response) => {
    try {
      const { audio, language_code } = req.body;
      if (!audio || !language_code) {
        return res.status(400).json({ error: "audio and language_code are required" });
      }
      const transcript = await transcribeAudio(audio, language_code);
      res.json({ transcript });
    } catch (err: any) {
      console.error("[/raw-transcribe]", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── POST /api/eligibility/find-schemes ───────────────────────────────────
// Receives all 8 answers (raw text), runs entity extraction + Neo4j
// Returns: matched schemes + user profile + TTS summary audio
eligibilityRouter.post(
  "/find-schemes",
  async (req: Request, res: Response) => {
    try {
      const { answers, language_code, session_id } = req.body;

      if (!answers || !language_code) {
        return res
          .status(400)
          .json({ error: "answers and language_code are required" });
      }

      // Step 1: Translate all raw answers to English in parallel
      const translatedAnswers: Record<string, string> = {};
      const keys = Object.keys(answers);
      const promises = Object.values(answers).map(value =>
        translateToEnglish(value as string, language_code)
      );
      const translations = await Promise.all(promises);
      keys.forEach((key, idx) => {
        translatedAnswers[key] = translations[idx];
      });

      // Step 2: Extract structured profile
      const userProfile = extractUserProfile(translatedAnswers);

      // Map state name → state code (best-effort)
      const STATE_CODES: Record<string, string> = {
        "tamil nadu": "TN",
        "uttar pradesh": "UP",
        maharashtra: "MH",
        "andhra pradesh": "AP",
        telangana: "TS",
        karnataka: "KA",
        kerala: "KL",
        "west bengal": "WB",
        rajasthan: "RJ",
        gujarat: "GJ",
        "madhya pradesh": "MP",
        bihar: "BR",
        odisha: "OD",
        punjab: "PB",
        haryana: "HR",
        delhi: "DL",
      };
      const rawState = (translatedAnswers.state || "").toLowerCase().trim();
      userProfile.state =
        STATE_CODES[rawState] ||
        rawState.toUpperCase().slice(0, 2) ||
        "ALL";

      // Step 3: Neo4j eligibility traversal
      const ELIGIBILITY_QUERY = `
        MATCH (s:Scheme {active: true})
        WITH s
        MATCH (s)-[:REQUIRES]->(c:Criteria)
        WITH s, collect(c) AS allCriteria
        WITH s, allCriteria,
             [c IN allCriteria WHERE
               (c.field = 'age_min'    AND $age            >= toFloat(c.value)) OR
               (c.field = 'age_max'    AND $age            <= toFloat(c.value)) OR
               (c.field = 'gender'     AND (c.value = 'ALL' OR $gender          = c.value)) OR
               (c.field = 'state'      AND (c.value = 'ALL' OR $state           = c.value)) OR
               (c.field = 'income_max' AND $annual_income  <= toFloat(c.value)) OR
               (c.field = 'caste'      AND (c.value = 'ALL' OR $caste_category IN split(c.value, ','))) OR
               (c.field = 'land_acres' AND $land_acres     <= toFloat(c.value)) OR
               (c.field = 'bpl_card'   AND $bpl_card        = (c.value = 'true')) OR
               (c.field = 'occupation' AND (c.value = 'ALL' OR $occupation      = c.value))
             ] AS satisfiedCriteria
        WHERE size(satisfiedCriteria) = size(allCriteria)
        MATCH (s)-[:AVAILABLE_IN]->(st:State)
        WHERE st.code = $state OR st.code = 'ALL'
        OPTIONAL MATCH (s)-[:OFFERED_BY]->(d:Department)
        RETURN s {
          .id, .name, .name_hi, .name_ta, .name_te, .name_kn,
          .name_mr, .name_bn, .benefit, .ministry, .type, .url,
          department: CASE WHEN d IS NOT NULL THEN d { .name, .helpline, .portal } ELSE null END,
          matched: size(satisfiedCriteria),
          total:   size(allCriteria)
        } AS scheme
        ORDER BY s.name
      `;

      const results = await runQuery(ELIGIBILITY_QUERY, {
        age: userProfile.age || 30,
        gender: userProfile.gender || "M",
        state: userProfile.state || "ALL",
        annual_income: userProfile.annual_income || 200000,
        caste_category: userProfile.caste_category || "GEN",
        land_acres: userProfile.land_acres ?? 0,
        bpl_card: userProfile.bpl_card ?? false,
        occupation: userProfile.occupation || "other",
      });

      const schemes = results.map((r: any) => r.scheme);
      const count = schemes.length;

      // Step 4: TTS summary
      const summaryMap: Record<string, string> = {
        "ta-IN": `உங்களுக்கு ${count} அரசு திட்டங்கள் கிடைக்கும்.`,
        "te-IN": `మీకు ${count} ప్రభుత్వ పథకాలు అర్హత ఉన్నాయి.`,
        "kn-IN": `ನಿಮಗೆ ${count} ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಅರ್ಹವಾಗಿವೆ.`,
        "mr-IN": `तुम्हाला ${count} सरकारी योजनांचा लाभ मिळू शकतो.`,
        "bn-IN": `আপনার জন্য ${count}টি সরকারি প্রকল্প পাওয়া গেছে।`,
        "gu-IN": `તમને ${count} સરકારી યોજનાઓ મળી.`,
        "ml-IN": `നിങ്ങൾക്ക് ${count} സർക്കാർ പദ്ധതികൾ ലഭ്യമാണ്.`,
        "or-IN": `ଆପଣଙ୍କ ପାଇଁ ${count}ଟି ସରକାରୀ ଯୋଜନା ମିଳିଲା।`,
        "pa-IN": `ਤੁਹਾਡੇ ਲਈ ${count} ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਮਿਲੀਆਂ।`,
        "hi-IN": `आपको ${count} सरकारी योजनाओं का लाभ मिल सकता है।`,
        "en-IN": `You qualify for ${count} government schemes.`,
      };
      const summaryText =
        summaryMap[language_code] ||
        `You qualify for ${count} government schemes.`;
      let summary_audio = "";
      try {
        summary_audio = await textToSpeech(summaryText, language_code);
      } catch (ttsErr: any) {
        console.warn("[TTS Warning] Summary audio failed:", ttsErr.message);
      }

      res.json({
        schemes,
        user_profile: userProfile,
        summary_audio,
        session_id,
        total_matched: count,
      });
    } catch (err: any) {
      console.error("[/find-schemes]", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);
