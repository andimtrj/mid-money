export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  note: string;
  date: number;
  fixed?: boolean;
  fixedSourceId?: string;
  fixedCycleKey?: string;
};

export type FixedIncome = {
  id: string;
  categoryId: string;
  amount: number;
  dayOfMonth: number;
};

export type FixedExpense = {
  id: string;
  categoryId: string;
  amount: number;
  fixedIncomeId: string;
};

export type Wallet = {
  active: number;
  investment: number;
};

export const formatIDR = (n: number) =>
  "Rp " + Math.abs(n).toLocaleString("id-ID");

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function cycleStartFromDay(day: number, now = Date.now()): number {
  const d = new Date(now);
  if (d.getDate() >= day) d.setDate(day);
  else {
    d.setMonth(d.getMonth() - 1);
    d.setDate(day);
  }
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function primaryCycleDay(incomes: FixedIncome[]): number | null {
  return incomes[0]?.dayOfMonth ?? null;
}

export function currentCycleStart(incomes: FixedIncome[], now = Date.now()): number {
  const day = primaryCycleDay(incomes);
  if (day == null) {
    const d = new Date(now);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return cycleStartFromDay(day, now);
}

export type AlertKind = "over" | "near" | "under" | "on-track";

export function expenseStatus(spent: number, fixed: number): AlertKind {
  if (fixed <= 0) return "on-track";
  const r = spent / fixed;
  if (r >= 1) return "over";
  if (r >= 0.8) return "near";
  if (r < 0.4) return "under";
  return "on-track";
}

export function fixedExpenseTotalFor(
  categoryId: string,
  fixedExpenses: FixedExpense[]
) {
  return fixedExpenses
    .filter((f) => f.categoryId === categoryId)
    .reduce((s, f) => s + f.amount, 0);
}

export function spentInCycle(
  categoryId: string,
  txs: Transaction[],
  cycleStart: number
) {
  return txs
    .filter((t) => t.categoryId === categoryId && t.type === "expense" && t.date >= cycleStart)
    .reduce((s, t) => s + t.amount, 0);
}
