import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";

const SARVAM_BASE = "https://api.sarvam.ai";
const SARVAM_KEY = process.env.SARVAM_API_KEY!;

const sarvam = axios.create({
  baseURL: SARVAM_BASE,
  timeout: 15000,   // 15 s — prevents indefinite block that causes mobile timeout
  headers: {
    "api-subscription-key": SARVAM_KEY,
  },
});

// ─── Speech-to-Text ────────────────────────────────────────────────────────

/**
 * Transcribe audio. If languageCode is "unknown", Sarvam auto-detects
 * the spoken language. Returns { transcript, detected_language_code }.
 */
export async function transcribeAudio(
  audioBase64: string,
  languageCode: string
): Promise<{ transcript: string; detected_language_code: string }> {
  // Use the language code as-is. Pass "unknown" for auto-detection.
  const lang = languageCode || "unknown";

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const audioStream = new Readable();
  audioStream.push(audioBuffer);
  audioStream.push(null);

  const form = new FormData();
  form.append("file", audioStream, {
    filename: "audio.wav",
    contentType: "audio/wav",
  });
  form.append("model", "saaras:v3");
  form.append("language_code", lang);
  form.append("mode", "transcribe");

  const response = await sarvam.post("/speech-to-text", form, {
    headers: {
      ...form.getHeaders(),
    },
  });
  const transcript = response.data.transcript || "";
  // Sarvam returns the actual detected language in the response
  const detected_language_code = response.data.language_code || lang;
  return { transcript, detected_language_code };
}

// ─── Translation ───────────────────────────────────────────────────────────

export async function translateToEnglish(
  text: string,
  sourceLang: string
): Promise<string> {
  if (sourceLang === "en-IN") return text;
  const response = await sarvam.post("/translate", {
    input: text,
    source_language_code: sourceLang,
    target_language_code: "en-IN",
    speaker_gender: "Male",
    mode: "formal",
    model: "mayura:v1",
  });
  return response.data.translated_text || text;
}

export async function translateFromEnglish(
  text: string,
  targetLang: string
): Promise<string> {
  if (targetLang === "en-IN") return text;
  const response = await sarvam.post("/translate", {
    input: text,
    source_language_code: "en-IN",
    target_language_code: targetLang,
    speaker_gender: "Female",
    mode: "formal",
    model: "mayura:v1",
  });
  return response.data.translated_text || text;
}

// ─── Text-to-Speech ────────────────────────────────────────────────────────

const SPEAKER_MAP: Record<string, string> = {
  "en-IN": "priya",
  "hi-IN": "shreya",
  "ta-IN": "kavitha",
  "te-IN": "suhani",
  "kn-IN": "kavya",
  "mr-IN": "rupali",
  "bn-IN": "ishita",
  "gu-IN": "shruti",
  "od-IN": "ritu",
  "or-IN": "ritu",
  "pa-IN": "pooja",
  "ml-IN": "kavitha",
};

export async function textToSpeech(
  text: string,
  languageCode: string
): Promise<string> {
  const lang = languageCode === "or-IN" ? "od-IN" : languageCode;

  // Sarvam TTS max ~500 chars per call
  const truncated = text.slice(0, 500);
  const response = await sarvam.post("/text-to-speech", {
    inputs: [truncated],
    target_language_code: lang,
    speaker: SPEAKER_MAP[lang] || "shreya",
    pace: 1.0,
    speech_sample_rate: 8000,
    enable_preprocessing: true,
    model: "bulbul:v3",
  });
  return response.data.audios[0] || "";
}


// ─── Entity extraction ────────────────────────────────────────────────────

export interface UserProfile {
  age: number;
  gender: "M" | "F" | "OTHER";
  state: string;
  annual_income: number;
  caste_category: "SC" | "ST" | "OBC" | "GEN";
  land_acres: number;
  bpl_card: boolean;
  occupation: string;
  aadhaar_linked?: boolean;
  district?: string;
}

export function extractUserProfile(
  translatedResponses: Record<string, string>
): Partial<UserProfile> {
  const profile: Partial<UserProfile> = {};

  // Age
  const ageMatch = translatedResponses.age?.match(/\d+/);
  if (ageMatch) profile.age = parseInt(ageMatch[0]);

  // Gender
  const genderText = (translatedResponses.gender || "").toLowerCase();
  if (
    genderText.includes("female") ||
    genderText.includes("woman") ||
    genderText.includes("mahila") ||
    genderText.includes("stri")
  ) {
    profile.gender = "F";
  } else if (
    genderText.includes("male") ||
    genderText.includes("man") ||
    genderText.includes("purush")
  ) {
    profile.gender = "M";
  } else {
    profile.gender = "OTHER";
  }

  // Income — handle "72 thousand", "72000", "1.2 lakh"
  const incomeText = (translatedResponses.income || "").replace(/,/g, "");
  const incomeMatch = incomeText.match(/(\d+(?:\.\d+)?)\s*(thousand|lakh|crore)?/i);
  if (incomeMatch) {
    let income = parseFloat(incomeMatch[1]);
    const unit = (incomeMatch[2] || "").toLowerCase();
    if (unit === "lakh") income *= 100000;
    else if (unit === "thousand") income *= 1000;
    else if (unit === "crore") income *= 10000000;
    profile.annual_income = Math.round(income);
  }

  // Land acres
  const landMatch = (translatedResponses.land || "").match(/(\d+(?:\.\d+)?)/);
  if (landMatch) profile.land_acres = parseFloat(landMatch[1]);
  else profile.land_acres = 0;

  // BPL card
  const bplText = (translatedResponses.bpl || "").toLowerCase();
  profile.bpl_card =
    bplText.includes("yes") ||
    bplText.includes("haan") ||
    bplText.includes("aamudhaan") ||
    bplText.includes("ahe") ||
    bplText.includes("ache") ||
    bplText.includes("undu");

  // Caste
  const casteText = (translatedResponses.caste || "").toLowerCase();
  if (
    casteText.includes("sc") ||
    casteText.includes("scheduled caste") ||
    casteText.includes("dalit")
  ) {
    profile.caste_category = "SC";
  } else if (
    casteText.includes("st") ||
    casteText.includes("tribal") ||
    casteText.includes("adivasi")
  ) {
    profile.caste_category = "ST";
  } else if (
    casteText.includes("obc") ||
    casteText.includes("other backward") ||
    casteText.includes("bc")
  ) {
    profile.caste_category = "OBC";
  } else {
    profile.caste_category = "GEN";
  }

  // Occupation
  const occText = (translatedResponses.occupation || "").toLowerCase();
  if (
    occText.includes("farm") ||
    occText.includes("kisan") ||
    occText.includes("ryot") ||
    occText.includes("farmer") ||
    occText.includes("agriculture")
  ) {
    profile.occupation = "farmer";
  } else if (
    occText.includes("labour") ||
    occText.includes("worker") ||
    occText.includes("mazdoor") ||
    occText.includes("coolie")
  ) {
    profile.occupation = "labourer";
  } else if (
    occText.includes("business") ||
    occText.includes("shop") ||
    occText.includes("vyapar") ||
    occText.includes("trade")
  ) {
    profile.occupation = "business";
  } else {
    profile.occupation = "other";
  }

  return profile;
}
