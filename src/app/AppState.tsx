import { useEffect, type ReactNode } from "react";
import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type {
  Category,
  Pocket,
  Transaction,
  Wallet,
} from "./components/types";
import {
  createBudgetBackendFromEnv,
  type BudgetBackend,
  type BudgetSnapshot,
} from "./data/budgetBackend";

type AppStateValue = {
  name: string | null;
  setName: (name: string | null) => void;
  wallet: Wallet;
  setWallet: (wallet: Wallet) => void;
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  pockets: Pocket[];
  setPockets: (pockets: Pocket[]) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  addTransaction: (t: Omit<Transaction, "id" | "date">) => void;
  updateTransaction: (
    id: string,
    patch: Partial<Pick<Transaction, "amount" | "date" | "note">>,
  ) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: Omit<Category, "id">) => string;
  deleteCategory: (id: string) => void;
  addPocket: (p: Omit<Pocket, "id">) => void;
  updatePocket: (id: string, patch: Partial<Omit<Pocket, "id">>) => void;
  deletePocket: (id: string) => void;
  transferToPocket: (pocketId: string, amount: number) => void;
  transferFromPocket: (pocketId: string, amount: number) => void;
  hydrated: boolean;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  session: Session | null;
  hydrateFromBackend: () => Promise<void>;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  signUp: (params: {
    email: string;
    username: string;
    password: string;
  }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const initialCategories: Category[] = [
  { id: "c-salary", name: "Salary", type: "income" },
  { id: "c-freelance", name: "Freelance", type: "income" },
];

const initialTransactions: Transaction[] = [];

const uid = () => Math.random().toString(36).slice(2, 10);

function createInitialState() {
  const wallet = { active: 0 };
  const pockets: Pocket[] = [
    { id: "p-investment", name: "Investment", balance: 0, isInvestment: true },
  ];

  return {
    name: null as string | null,
    wallet,
    categories: initialCategories,
    pockets,
    transactions: initialTransactions,
    addOpen: false,
    hydrated: false,
    authReady: false,
    authLoading: true,
    authError: null,
    session: null,
  };
}

function applySnapshot(set: (patch: Partial<AppStateValue>) => void, snapshot: BudgetSnapshot) {
  set({
    name: snapshot.name,
    wallet: snapshot.wallet,
    categories: snapshot.categories,
    pockets: snapshot.pockets,
    transactions: snapshot.transactions,
  });
}

function resetLocalState(set: (patch: Partial<AppStateValue>) => void) {
  set({
    ...createInitialState(),
    hydrated: true,
    authReady: true,
    authLoading: false,
    authError: null,
    session: null,
  });
}

let backendInstance: BudgetBackend | null = null;

function backend() {
  if (!backendInstance) {
    backendInstance = createBudgetBackendFromEnv();
  }
  return backendInstance;
}

function queueSync(task: () => Promise<void>) {
  void task().catch((error) => {
    console.error("State sync failed:", error);
  });
}

type AppStoreState = AppStateValue;

const initialState = createInitialState();

const useAppStore = create<AppStoreState>((set, get) => ({
  ...initialState,
  setName: (name) => {
    set({ name });
    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.setName(name);
    });
  },
  setWallet: (wallet) => {
    set({ wallet });
    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.updateWallet(wallet);
    });
  },
  setCategories: (categories) => set({ categories }),
  setPockets: (pockets) => set({ pockets }),
  setTransactions: (transactions) => set({ transactions }),
  setAddOpen: (addOpen) => set({ addOpen }),
  hydrateFromBackend: async () => {
    const api = backend();
    if (!api.isConfigured) {
      resetLocalState(set);
      return;
    }
    set({ authLoading: true });
    const session = await api.getSession();
    set({ session, authReady: true });
    if (session) {
      const snapshot = await api.loadSnapshot();
      if (snapshot) {
        applySnapshot(set, snapshot);
      }
      set({ hydrated: true, authLoading: false });
    } else {
      resetLocalState(set);
      set({ authReady: true, authLoading: false, hydrated: true });
    }
  },
  signIn: async ({ email, password }) => {
    const api = backend();
    if (!api.isConfigured) {
      set({ authError: "Supabase is not configured." });
      return;
    }

    set({ authLoading: true, authError: null });
    try {
      await api.signInWithPassword({ email, password });
      const session = await api.getSession();
      set({ session, authReady: true, authLoading: false, authError: null });
      if (session) {
        const snapshot = await api.loadSnapshot();
        if (snapshot) {
          applySnapshot(set, snapshot);
        }
        set({ hydrated: true });
      }
    } catch (error) {
      set({
        authLoading: false,
        authError: error instanceof Error ? error.message : "Unable to sign in.",
      });
    }
  },
  signUp: async ({ email, username, password }) => {
    const api = backend();
    if (!api.isConfigured) {
      set({ authError: "Supabase is not configured." });
      return { needsConfirmation: true };
    }

    set({ authLoading: true, authError: null });
    try {
      const result = await api.signUpWithPassword({ email, username, password });
      const session = result.session ?? (await api.getSession());
      set({ session, authReady: true, authLoading: false, authError: null });
      if (session) {
        const snapshot = await api.loadSnapshot();
        if (snapshot) {
          applySnapshot(set, snapshot);
        }
        set({ hydrated: true });
      }
      return { needsConfirmation: result.needsConfirmation };
    } catch (error) {
      set({
        authLoading: false,
        authError: error instanceof Error ? error.message : "Unable to register.",
      });
      return { needsConfirmation: true };
    }
  },
  signOut: async () => {
    const api = backend();
    if (!api.isConfigured) {
      resetLocalState(set);
      return;
    }

    set({ authLoading: true, authError: null });
    try {
      await api.signOut();
      resetLocalState(set);
    } catch (error) {
      set({
        authLoading: false,
        authError: error instanceof Error ? error.message : "Unable to sign out.",
      });
    }
  },
  addTransaction: (t) => {
    const nextTx: Transaction = {
      ...t,
      id: uid(),
      date: Date.now(),
    };
    set((state) => {
      const nextState: Partial<AppStateValue> = {
        transactions: [nextTx, ...state.transactions],
      };

      // Update wallet/pocket balances locally
      if (t.type === "income") {
        nextState.wallet = {
          active: state.wallet.active + t.amount,
        };
      } else if (t.type === "expense" && t.pocketId) {
        nextState.pockets = state.pockets.map((p) =>
          p.id === t.pocketId
            ? { ...p, balance: p.balance - t.amount }
            : p
        );
      }

      return nextState;
    });

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.addTransaction(t);
    });
  },
  updateTransaction: (id, patch) => {
    set((state) => {
      const current = state.transactions.find((item) => item.id === id);
      if (!current) return {};

      const nextAmount = patch.amount ?? current.amount;
      const delta = nextAmount - current.amount;
      const nextState: Partial<AppStateValue> = {
        transactions: state.transactions.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      };

      // Update wallet/pocket balances locally
      if (delta !== 0) {
        if (current.type === "income") {
          nextState.wallet = {
            active: state.wallet.active + delta,
          };
        } else if (current.type === "expense" && current.pocketId) {
          nextState.pockets = state.pockets.map((p) =>
            p.id === current.pocketId
              ? { ...p, balance: p.balance + delta }
              : p
          );
        }
      }

      return nextState;
    });

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.updateTransaction(id, patch);
    });
  },
  deleteTransaction: (id) => {
    set((state) => {
      const target = state.transactions.find((item) => item.id === id);
      if (!target) return {};

      const nextState: Partial<AppStateValue> = {
        transactions: state.transactions.filter((item) => item.id !== id),
      };

      // Update wallet/pocket balances locally
      if (target.type === "income") {
        nextState.wallet = {
          active: state.wallet.active - target.amount,
        };
      } else if (target.type === "expense" && target.pocketId) {
        nextState.pockets = state.pockets.map((p) =>
          p.id === target.pocketId
            ? { ...p, balance: p.balance + target.amount }
            : p
        );
      }

      return nextState;
    });

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.deleteTransaction(id);
    });
  },
  addCategory: (c) => {
    const id = uid();
    set((state) => ({ categories: [...state.categories, { ...c, id }] }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.addCategory(c);
      const snapshot = await api.loadSnapshot();
      if (snapshot) applySnapshot(set, snapshot);
    });

    return id;
  },
  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((item) => item.id !== id),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.deleteCategory(id);
    });
  },
  addPocket: (p) => {
    const id = uid();
    set((state) => ({
      pockets: [...state.pockets, { ...p, id }],
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.addPocket(p);
      const snapshot = await api.loadSnapshot();
      if (snapshot) applySnapshot(set, snapshot);
    });
  },
  updatePocket: (id, patch) => {
    set((state) => ({
      pockets: state.pockets.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.updatePocket(id, patch);
    });
  },
  deletePocket: (id) => {
    set((state) => ({
      pockets: state.pockets.filter((item) => item.id !== id),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.deletePocket(id);
    });
  },
  transferToPocket: (pocketId, amount) => {
    set((state) => ({
      wallet: { active: state.wallet.active - amount },
      pockets: state.pockets.map((p) =>
        p.id === pocketId
          ? { ...p, balance: p.balance + amount }
          : p
      ),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.transferToPocket(pocketId, amount);
    });
  },
  transferFromPocket: (pocketId, amount) => {
    set((state) => ({
      wallet: { active: state.wallet.active + amount },
      pockets: state.pockets.map((p) =>
        p.id === pocketId
          ? { ...p, balance: p.balance - amount }
          : p
      ),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.transferFromPocket(pocketId, amount);
    });
  },
}));

export function AppStateProvider({ children }: { children: ReactNode }) {
  const hydrateFromBackend = useAppStore((state) => state.hydrateFromBackend);

  useEffect(() => {
    void hydrateFromBackend();
  }, [hydrateFromBackend]);

  useEffect(() => {
    const api = backend();
    if (!api.isConfigured) return;

    const subscription = api.onAuthStateChange((_event, session) => {
      useAppStore.setState({ session, authReady: true });
      if (!session) {
        resetLocalState(useAppStore.setState);
        return;
      }

      void api.loadSnapshot().then((snapshot) => {
        if (snapshot) {
          applySnapshot(useAppStore.setState, snapshot);
        }
        useAppStore.setState({ hydrated: true, authLoading: false, authError: null });
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

export function useAppState() {
  return useAppStore((state) => state);
}
