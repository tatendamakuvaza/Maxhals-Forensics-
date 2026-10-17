"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AppData, FraudFlag, SophieMessage } from "./types";
import { buildSeedData } from "./seed";
import { runFraudDetection } from "./ml/fraud";

interface AppState {
  data: AppData;
  sessionUser: string | null; // user id
  hydrated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  update: (fn: (d: AppData) => void) => void;
  retrainFraud: () => FraudFlag[];
  addChat: (m: SophieMessage) => void;
  resetData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      data: buildSeedData(),
      sessionUser: null,
      hydrated: false,
      login: (email, password) => {
        const u = get().data.users.find(
          (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password
        );
        if (u) {
          set({ sessionUser: u.id });
          return true;
        }
        return false;
      },
      logout: () => set({ sessionUser: null }),
      update: (fn) => {
        const next: AppData = JSON.parse(JSON.stringify(get().data));
        fn(next);
        set({ data: next });
      },
      retrainFraud: () => {
        const flags = runFraudDetection(get().data);
        get().update((d) => {
          d.fraudFlags = flags;
        });
        return flags;
      },
      addChat: (m) =>
        get().update((d) => {
          d.chat.push(m);
        }),
      resetData: () => set({ data: buildSeedData() })
    }),
    {
      name: "maxhals-forensics-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ data: s.data, sessionUser: s.sessionUser }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          if (state.data.fraudFlags.length === 0) {
            state.data.fraudFlags = runFraudDetection(state.data);
          }
        }
      }
    }
  )
);

export function useUser() {
  const { data, sessionUser } = useStore();
  return data.users.find((u) => u.id === sessionUser) ?? null;
}
