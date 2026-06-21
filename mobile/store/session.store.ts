import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { LANGUAGES } from "@/constants/languages";

type Language = (typeof LANGUAGES)[0];

export interface UserProfile {
  age: number;
  gender: "M" | "F" | "OTHER";
  state: string;
  annual_income: number;
  caste_category: "SC" | "ST" | "OBC" | "GEN";
  land_acres: number;
  bpl_card: boolean;
  occupation: string;
  district?: string;
}

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  role: string;
  state?: string;
  age?: number;
  gender?: string;
  caste_category?: string;
  annual_income?: number;
  bpl_card?: boolean;
  occupation?: string;
  land_acres?: number;
  district?: string;
  profileComplete?: boolean;
  gramsevaId?: string;
  profileUpdatedAt?: string;
}

interface SessionState {
  sessionId: string;
  language: Language | null;
  profile: UserProfile | null;
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  setLanguage: (lang: Language) => void;
  setProfile: (profile: UserProfile) => void;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: uuid.v4() as string,
      language: null,
      profile: null,
      user: null,
      token: null,
      isLoggedIn: false,
      setLanguage: (language) => set({ language }),
      setProfile: (profile) => set({ profile }),
      setAuth: (user, token) => set({ user, token, isLoggedIn: true }),
      logout: () => set({ user: null, token: null, isLoggedIn: false, profile: null }),
      reset: () => set({ sessionId: uuid.v4() as string, profile: null }),
    }),
    {
      name: "gramseva-session",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
