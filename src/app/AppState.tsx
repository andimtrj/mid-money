import { useEffect, type ReactNode } from "react";
import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type {
  Category,
  FixedExpense,
  FixedIncome,
  Transaction,
  Wallet,
} from "./components/types";
import { cycleStartFromDay } from "./components/types";
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
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  fixedIncomes: FixedIncome[];
  setFixedIncomes: (items: FixedIncome[]) => void;
  fixedExpenses: FixedExpense[];
  setFixedExpenses: (items: FixedExpense[]) => void;
  appliedCycles: Set<string>;
  setAppliedCycles: (cycles: Set<string>) => void;
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
  addFixedIncome: (fi: Omit<FixedIncome, "id">) => void;
  updateFixedIncome: (
    id: string,
    patch: Partial<Omit<FixedIncome, "id">>,
  ) => void;
  deleteFixedIncome: (id: string) => void;
  addFixedExpense: (fe: Omit<FixedExpense, "id">) => void;
  updateFixedExpense: (
    id: string,
    patch: Partial<Omit<FixedExpense, "id">>,
  ) => void;
  deleteFixedExpense: (id: string) => void;
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
  { id: "c-food", name: "Food", type: "expense" },
  { id: "c-transport", name: "Transport", type: "expense" },
  { id: "c-home", name: "Home", type: "expense" },
  { id: "c-rent", name: "Rent", type: "expense" },
  { id: "c-bills", name: "Bills", type: "expense" },
];

const initialFixedIncomes: FixedIncome[] = [
  { id: "fi-1", categoryId: "c-salary", amount: 15000000, dayOfMonth: 25 },
];

const initialFixedExpenses: FixedExpense[] = [
  { id: "fe-1", categoryId: "c-rent", amount: 3500000, fixedIncomeId: "fi-1" },
  { id: "fe-2", categoryId: "c-bills", amount: 800000, fixedIncomeId: "fi-1" },
];

const initialTransactions: Transaction[] = [
  {
    id: "tx-1",
    type: "expense",
    amount: 180000,
    categoryId: "c-food",
    note: "Groceries",
    date: Date.UTC(2026, 3, 25, 12, 0, 0),
  },
  {
    id: "tx-2",
    type: "expense",
    amount: 65000,
    categoryId: "c-transport",
    note: "Gojek",
    date: Date.UTC(2026, 3, 26, 12, 0, 0),
  },
  {
    id: "tx-3",
    type: "expense",
    amount: 2200000,
    categoryId: "c-food",
    note: "Dining out",
    date: Date.UTC(2026, 3, 27, 6, 0, 0),
  },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const cycleMonthKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
};

const cycleKey = (ts: number, id: string) => {
  return `${cycleMonthKey(ts)}-${id}`;
};

function applyFixedCycles({
  fixedIncomes,
  fixedExpenses,
  appliedCycles,
}: {
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  appliedCycles: Set<string>;
}) {
  const next = new Set(appliedCycles);
  const newTransactions: Transaction[] = [];
  let walletDelta = 0;

  for (const fi of fixedIncomes) {
    const cycleStart = cycleStartFromDay(fi.dayOfMonth);
    const key = cycleKey(cycleStart, fi.id);
    if (next.has(key)) continue;
    next.add(key);
    newTransactions.push({
      id: uid(),
      type: "income",
      amount: fi.amount,
      categoryId: fi.categoryId,
      note: "Fixed income",
      date: cycleStart,
      fixed: true,
      fixedSourceId: fi.id,
      fixedCycleKey: cycleMonthKey(cycleStart),
    });
    walletDelta += fi.amount;
  }

  for (const fe of fixedExpenses) {
    const linked = fixedIncomes.find((item) => item.id === fe.fixedIncomeId);
    if (!linked) continue;
    const cycleStart = cycleStartFromDay(linked.dayOfMonth);
    const key = cycleKey(cycleStart, fe.id);
    if (next.has(key)) continue;
    next.add(key);
    newTransactions.push({
      id: uid(),
      type: "expense",
      amount: fe.amount,
      categoryId: fe.categoryId,
      note: "Fixed expense",
      date: cycleStart,
      fixed: true,
      fixedSourceId: fe.id,
      fixedCycleKey: cycleMonthKey(cycleStart),
    });
    walletDelta -= fe.amount;
  }

  return { appliedCycles: next, newTransactions, walletDelta };
}

function createInitialState() {
  const wallet = { active: 12550000, investment: 38000000 };
  const appliedCycles = new Set<string>();
  const cycleResult = applyFixedCycles({
    fixedIncomes: initialFixedIncomes,
    fixedExpenses: initialFixedExpenses,
    appliedCycles,
  });

  return {
    name: null as string | null,
    wallet: { ...wallet, active: wallet.active + cycleResult.walletDelta },
    categories: initialCategories,
    transactions: [...cycleResult.newTransactions, ...initialTransactions],
    fixedIncomes: initialFixedIncomes,
    fixedExpenses: initialFixedExpenses,
    appliedCycles: cycleResult.appliedCycles,
    addOpen: false,
    hydrated: false,
    authReady: false,
    authLoading: true,
    authError: null,
    session: null,
  };
}

function snapshotAppliedCycles(transactions: Transaction[]) {
  const cycles = new Set<string>();
  for (const tx of transactions) {
    if (!tx.fixed) continue;
    if (tx.fixedSourceId && tx.fixedCycleKey) {
      cycles.add(`${tx.fixedCycleKey}-${tx.fixedSourceId}`);
      continue;
    }
    cycles.add(cycleKey(tx.date, tx.fixedSourceId ?? tx.id));
  }
  return cycles;
}

function applySnapshot(set: (patch: Partial<AppStateValue>) => void, snapshot: BudgetSnapshot) {
  set({
    name: snapshot.name,
    wallet: snapshot.wallet,
    categories: snapshot.categories,
    transactions: snapshot.transactions,
    fixedIncomes: snapshot.fixedIncomes,
    fixedExpenses: snapshot.fixedExpenses,
    appliedCycles: snapshotAppliedCycles(snapshot.transactions),
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
  setTransactions: (transactions) => set({ transactions }),
  setFixedIncomes: (fixedIncomes) => set({ fixedIncomes }),
  setFixedExpenses: (fixedExpenses) => set({ fixedExpenses }),
  setAppliedCycles: (appliedCycles) => set({ appliedCycles: new Set(appliedCycles) }),
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
    set((state) => ({
      transactions: [nextTx, ...state.transactions],
      wallet: {
        ...state.wallet,
        active:
          t.type === "income"
            ? state.wallet.active + t.amount
            : state.wallet.active - t.amount,
      },
    }));

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
      const nextWallet =
        delta === 0
          ? state.wallet
          : {
              ...state.wallet,
              active:
                current.type === "income"
                  ? state.wallet.active + delta
                  : state.wallet.active - delta,
            };

      return {
        transactions: state.transactions.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
        wallet: nextWallet,
      };
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

      return {
        transactions: state.transactions.filter((item) => item.id !== id),
        wallet: {
          ...state.wallet,
          active:
            target.type === "income"
              ? state.wallet.active - target.amount
              : state.wallet.active + target.amount,
        },
      };
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
      fixedIncomes: state.fixedIncomes.filter((item) => item.categoryId !== id),
      fixedExpenses: state.fixedExpenses.filter((item) => item.categoryId !== id),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.deleteCategory(id);
    });
  },
  addFixedIncome: (fi) => {
    const id = uid();
    const cycleStart = cycleStartFromDay(fi.dayOfMonth);
    const key = cycleKey(cycleStart, id);

    set((state) => {
      if (state.appliedCycles.has(key)) {
        return {
          fixedIncomes: [...state.fixedIncomes, { ...fi, id }],
        };
      }

      const nextCycles = new Set(state.appliedCycles);
      nextCycles.add(key);
      return {
        fixedIncomes: [...state.fixedIncomes, { ...fi, id }],
        appliedCycles: nextCycles,
        transactions: [
          {
            id: uid(),
            type: "income",
            amount: fi.amount,
            categoryId: fi.categoryId,
            note: "Fixed income",
            date: cycleStart,
            fixed: true,
            fixedSourceId: id,
            fixedCycleKey: cycleMonthKey(cycleStart),
          },
          ...state.transactions,
        ],
        wallet: {
          ...state.wallet,
          active: state.wallet.active + fi.amount,
        },
      };
    });

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.addFixedIncome(fi);
      await api.applyCycles();
      const snapshot = await api.loadSnapshot();
      if (snapshot) applySnapshot(set, snapshot);
    });
  },
  updateFixedIncome: (id, patch) => {
    set((state) => ({
      fixedIncomes: state.fixedIncomes.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.updateFixedIncome(id, patch);
    });
  },
  deleteFixedIncome: (id) => {
    set((state) => ({
      fixedIncomes: state.fixedIncomes.filter((item) => item.id !== id),
      fixedExpenses: state.fixedExpenses.filter((item) => item.fixedIncomeId !== id),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.deleteFixedIncome(id);
    });
  },
  addFixedExpense: (fe) => {
    const id = uid();

    set((state) => {
      const linked = state.fixedIncomes.find((item) => item.id === fe.fixedIncomeId);
      if (!linked) {
        return { fixedExpenses: [...state.fixedExpenses, { ...fe, id }] };
      }

      const cycleStart = cycleStartFromDay(linked.dayOfMonth);
      const key = cycleKey(cycleStart, id);
      if (state.appliedCycles.has(key)) {
        return { fixedExpenses: [...state.fixedExpenses, { ...fe, id }] };
      }

      const nextCycles = new Set(state.appliedCycles);
      nextCycles.add(key);

      return {
        fixedExpenses: [...state.fixedExpenses, { ...fe, id }],
        appliedCycles: nextCycles,
        transactions: [
          {
            id: uid(),
            type: "expense",
            amount: fe.amount,
            categoryId: fe.categoryId,
            note: "Fixed expense",
            date: cycleStart,
            fixed: true,
            fixedSourceId: id,
            fixedCycleKey: cycleMonthKey(cycleStart),
          },
          ...state.transactions,
        ],
        wallet: {
          ...state.wallet,
          active: state.wallet.active - fe.amount,
        },
      };
    });

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.addFixedExpense(fe);
      await api.applyCycles();
      const snapshot = await api.loadSnapshot();
      if (snapshot) applySnapshot(set, snapshot);
    });
  },
  updateFixedExpense: (id, patch) => {
    set((state) => ({
      fixedExpenses: state.fixedExpenses.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.updateFixedExpense(id, patch);
    });
  },
  deleteFixedExpense: (id) => {
    set((state) => ({
      fixedExpenses: state.fixedExpenses.filter((item) => item.id !== id),
    }));

    queueSync(async () => {
      const api = backend();
      if (!api.isConfigured) return;
      await api.deleteFixedExpense(id);
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
