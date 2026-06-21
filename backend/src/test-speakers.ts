import axios from "axios";

const SARVAM_KEY = process.env.SARVAM_API_KEY!;
const sarvam = axios.create({
  baseURL: "https://api.sarvam.ai",
  headers: { "api-subscription-key": SARVAM_KEY }
});

const speakersToTest = [
  { lang: "en-IN", speaker: "priya" },
  { lang: "en-IN", speaker: "shreya" },
  { lang: "en-IN", speaker: "aditya" }
];

async function run() {
  for (const item of speakersToTest) {
    try {
      const response = await sarvam.post("/text-to-speech", {
        inputs: ["Hello, welcome to GramSeva"],
        target_language_code: item.lang,
        speaker: item.speaker,
        pace: 1.0,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: "bulbul:v3",
      });
      console.log(`✓ Speaker '${item.speaker}' for language '${item.lang}' succeeded! Audio length:`, response.data.audios[0]?.length);
    } catch (err: any) {
      console.error(`✗ Speaker '${item.speaker}' for language '${item.lang}' failed:`, err.message);
      if (err.response) {
        console.error("  Error body:", JSON.stringify(err.response.data));
      }
    }
  }
}
run();
