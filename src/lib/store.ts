"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AppData, FraudFlag, SophieMemory, SophieMessage } from "./types";
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
  setSophieMemory: (mem: SophieMemory) => void;
  resetData: () => void;
  eraseTransactions: () => void;
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
      setSophieMemory: (mem) =>
        get().update((d) => {
          d.sophieMemory = {
            ...mem,
            facts: Array.isArray(mem?.facts) ? mem.facts : []
          };
        }),
      resetData: () => set({ data: buildSeedData() }),
      eraseTransactions: () => get().update((d) => {
        // Keep the people who can sign in, the company profile, and Sophie's learned memory;
        // clear every business record so the dashboard and all statements open at zero.
        const users = d.users;
        const settings = d.settings;
        const sophieMemory = d.sophieMemory ?? { facts: [] };
        d.clients = [];
        d.income = [];
        d.expenses = [];
        d.invoices = [];
        d.bankTxns = [];
        d.journal = [];
        d.taxes = [];
        d.payroll = [];
        d.equity = [];
        d.fraudFlags = [];
        d.tasks = [];
        d.chat = [];
        d.bankAccounts = [];
        d.users = users;
        d.sophieMemory = sophieMemory;
        d.settings = { ...settings, nextInvoiceNo: 1 };
      })
    }),
    {
      name: "maxhals-forensics-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ data: s.data, sessionUser: s.sessionUser }),
      onRehydrateStorage: () => (state) => {
        if (state && state.data) {
          state.hydrated = true;
          state.data.sophieMemory = {
            ...(state.data.sophieMemory ?? {}),
            facts: Array.isArray(state.data.sophieMemory?.facts) ? state.data.sophieMemory!.facts : []
          };
          if (!Array.isArray(state.data.chat)) {
            state.data.chat = [];
          }
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
