import { motion } from "motion/react";
import { AlertTriangle, Sparkles, Check } from "lucide-react";
import type { Category, Transaction, FixedIncome, FixedExpense, AlertKind } from "./types";
import {
  formatIDR,
  currentCycleStart,
  spentInCycle,
  fixedExpenseTotalFor,
  expenseStatus,
  primaryCycleDay,
  ordinal,
} from "./types";

export function AnalyticsScreen({
  categories,
  transactions,
  fixedIncomes,
  fixedExpenses,
}: {
  categories: Category[];
  transactions: Transaction[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
}) {
  const cycleStart = currentCycleStart(fixedIncomes);
  const day = primaryCycleDay(fixedIncomes);

  const rows = categories
    .filter((c) => c.type === "expense")
    .map((c) => {
      const fixed = fixedExpenseTotalFor(c.id, fixedExpenses);
      const spent = spentInCycle(c.id, transactions, cycleStart);
      return { category: c, fixed, spent, kind: expenseStatus(spent, fixed) };
    });

  const buckets = {
    over: rows.filter((r) => r.kind === "over"),
    near: rows.filter((r) => r.kind === "near"),
    under: rows.filter((r) => r.kind === "under"),
    track: rows.filter((r) => r.kind === "on-track"),
  };

  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);

  return (
    <div className="h-full w-full bg-[#fafaf7] overflow-y-auto pb-32">
      <div className="px-8 pt-16">
        <div className="w-8 h-[2px] bg-neutral-900 mb-6" />
        <h1 className="tracking-[-0.02em] text-neutral-900 mb-2" style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 300 }}>
          Stats
        </h1>
        <p className="text-neutral-500 mb-10" style={{ fontSize: 13 }}>
          {day
            ? `Cycle since the ${ordinal(day)} of this month.`
            : "Set a fixed income to start a cycle."}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-10">
          <Stat label="Cycle spent" value={formatIDR(totalSpent)} />
          <Stat label="Fixed budget" value={formatIDR(totalFixed)} />
        </div>

        <Bucket title="Overbudget" kind="over" rows={buckets.over} />
        <Bucket title="Near limit" kind="near" rows={buckets.near} />
        <Bucket title="Underbudget" kind="under" rows={buckets.under} />
        <Bucket title="On track" kind="on-track" rows={buckets.track} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-black/[0.04]">
      <div className="text-neutral-400 tracking-[0.15em] uppercase mb-2" style={{ fontSize: 9 }}>{label}</div>
      <div className="text-neutral-900 tracking-tight" style={{ fontSize: 18, fontWeight: 300 }}>{value}</div>
    </div>
  );
}

function Bucket({
  title,
  kind,
  rows,
}: {
  title: string;
  kind: AlertKind;
  rows: { category: Category; fixed: number; spent: number; kind: AlertKind }[];
}) {
  if (rows.length === 0) return null;
  const meta = kindMeta(kind);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
          <span className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>{title}</span>
        </div>
        <span className="text-neutral-400" style={{ fontSize: 11 }}>{rows.length}</span>
      </div>
      <ul className="space-y-2">
        {rows.map((r, i) => {
          const ratio = r.fixed > 0 ? Math.min(r.spent / r.fixed, 1.4) : 0;
          return (
            <motion.li
              key={r.category.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-4 rounded-2xl bg-neutral-900/[0.03]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: meta.iconBg }}
                  >
                    <meta.Icon size={12} strokeWidth={1.8} className="text-neutral-900" />
                  </div>
                  <span className="text-neutral-900 truncate" style={{ fontSize: 13 }}>{r.category.name}</span>
                </div>
                <span className="text-neutral-900 tracking-widest tabular-nums" style={{ fontSize: 11 }}>
                  {r.fixed > 0 ? Math.round((r.spent / r.fixed) * 100) : 0}%
                </span>
              </div>
              <div className="h-[2px] bg-neutral-200 overflow-hidden rounded-full">
                <motion.div
                  className="h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(ratio, 1) * 100}%` }}
                  transition={{ type: "spring", damping: 28, stiffness: 180 }}
                  style={{ background: meta.bar }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-neutral-400" style={{ fontSize: 10 }}>
                <span>{formatIDR(r.spent)} spent</span>
                <span>{r.fixed > 0 ? `of ${formatIDR(r.fixed)}` : "no fixed expense"}</span>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function kindMeta(kind: AlertKind) {
  if (kind === "over") return { dot: "#d4183d", iconBg: "#f1cfc0", bar: "#d4183d", Icon: AlertTriangle };
  if (kind === "near") return { dot: "#c89a3a", iconBg: "#f3e2c7", bar: "#c89a3a", Icon: AlertTriangle };
  if (kind === "under") return { dot: "#7065c8", iconBg: "#dfdbf4", bar: "#7065c8", Icon: Sparkles };
  return { dot: "#171717", iconBg: "#e8e8e8", bar: "#171717", Icon: Check };
}
