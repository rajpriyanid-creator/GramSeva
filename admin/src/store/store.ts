import { create } from "zustand";

interface Toast { id: string; msg: string; kind: "ok"|"error"|"warn"; }

interface AdminStore {
  // Sidebar
  collapsed: boolean;
  toggleSidebar: () => void;

  // Toast
  toasts: Toast[];
  toast: (msg: string, kind?: "ok"|"error"|"warn") => void;
  dismissToast: (id: string) => void;

  // Sync status
  syncing: boolean;
  setSyncing: (v: boolean) => void;
}

export const useAdmin = create<AdminStore>((set, get) => ({
  collapsed: false,
  toggleSidebar: () => set(s => ({ collapsed: !s.collapsed })),

  toasts: [],
  toast: (msg, kind = "ok") => {
    const id = Date.now().toString();
    set(s => ({ toasts: [...s.toasts, { id, msg, kind }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  syncing: false,
  setSyncing: (v) => set({ syncing: v }),
}));
