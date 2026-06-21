import { create } from "zustand";

interface SchemesState {
  allSchemes: any[];
  matchedSchemes: any[];
  setAllSchemes: (schemes: any[]) => void;
  setMatchedSchemes: (schemes: any[]) => void;
  clearMatched: () => void;
}

export const useSchemesStore = create<SchemesState>((set) => ({
  allSchemes: [],
  matchedSchemes: [],
  setAllSchemes: (allSchemes) => set({ allSchemes }),
  setMatchedSchemes: (matchedSchemes) => set({ matchedSchemes }),
  clearMatched: () => set({ matchedSchemes: [] }),
}));
