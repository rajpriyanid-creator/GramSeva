import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://gramseva-api-c102.onrender.com";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export const ApiService = {
  // ─── Auth ──────────────────────────────────────────────────────────────
  async login(phone: string, password: string) {
    const res = await api.post("/api/auth/login", { phone, password });
    return res.data;
  },

  async register(phone: string, password: string, name: string) {
    const res = await api.post("/api/auth/register", { phone, password, name });
    return res.data;
  },

  async updateProfile(userId: string, profile: Record<string, any>) {
    const res = await api.put("/api/auth/profile", { userId, ...profile });
    return res.data;
  },

  async getMe(userId: string) {
    const res = await api.get("/api/auth/me", { params: { userId } });
    return res.data;
  },

  // ─── Eligibility ───────────────────────────────────────────────────────
  async transcribeAndProcess(payload: {
    audio: string;
    language_code: string;
    question_key: string;
    session_id: string;
  }) {
    const res = await api.post("/api/eligibility/transcribe", payload);
    return res.data;
  },

  async rawTranscribe(audio: string, language_code: string) {
    const res = await api.post("/api/eligibility/raw-transcribe", { audio, language_code });
    return res.data;
  },

  async findSchemes(payload: {
    answers: Record<string, string>;
    language_code: string;
    state: string;
    session_id: string;
  }) {
    const res = await api.post("/api/eligibility/find-schemes", payload);
    return res.data;
  },

  // ─── Schemes ───────────────────────────────────────────────────────────
  async getAllSchemes(state?: string) {
    const res = await api.get("/api/schemes", { params: { state } });
    return res.data;
  },

  async getScheme(id: string) {
    const res = await api.get(`/api/schemes/${id}`);
    return res.data;
  },

  // ─── Applications ──────────────────────────────────────────────────────
  async applyForScheme(userId: string, schemeId: string, additionalInfo?: string) {
    const res = await api.post("/api/applications", { userId, schemeId, additionalInfo });
    return res.data;
  },

  async getUserApplications(userId: string) {
    const res = await api.get(`/api/applications/user/${userId}`);
    return res.data;
  },

  // ─── CSC ───────────────────────────────────────────────────────────────
  async getNearbyCSCs(params: { lat: number; lng: number; state: string }) {
    const res = await api.get("/api/csc/nearby", { params });
    return res.data;
  },

  // ─── Health ────────────────────────────────────────────────────────────
  async healthCheck() {
    const res = await api.get("/health");
    return res.data;
  },

  // ─── Eligible Schemes (Logged-in User) ─────────────────────────────────
  async getEligibleSchemes(userId: string) {
    const res = await api.get("/api/auth/eligible-schemes", { params: { userId } });
    return res.data;
  },

  // ─── AI Chat ───────────────────────────────────────────────────────────
  async chat(messages: Array<{ role: string; content: string }>, language_code?: string, userId?: string) {
    const res = await api.post("/api/chat", { messages, language_code, userId });
    return res.data;
  },

  async getChatTTS(text: string, language_code?: string) {
    const res = await api.post("/api/chat/tts", { text, language_code });
    return res.data;
  },
};
