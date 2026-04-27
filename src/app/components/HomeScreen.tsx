import { motion } from "motion/react";
import { Plus, ArrowUpRight, ArrowDownRight, AlertTriangle, Sparkles, ChevronRight, Repeat } from "lucide-react";
import type { Category, Transaction, Wallet, FixedIncome, FixedExpense, AlertKind } from "./types";
import {
  formatIDR,
  currentCycleStart,
  spentInCycle,
  fixedExpenseTotalFor,
  expenseStatus,
} from "./types";

export function HomeScreen({
  name,
  wallet,
  transactions,
  categories,
  fixedIncomes,
  fixedExpenses,
  onAdd,
  onSeeAll,
}: {
  name: string;
  wallet: Wallet;
  transactions: Transaction[];
  categories: Category[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  onAdd: () => void;
  onSeeAll: () => void;
}) {
  const recent = [...transactions].sort((a, b) => b.date - a.date).slice(0, 5);
  const cycleStart = currentCycleStart(fixedIncomes);

  const alerts = categories
    .filter((c) => c.type === "expense")
    .map((c) => {
      const fixed = fixedExpenseTotalFor(c.id, fixedExpenses);
      const spent = spentInCycle(c.id, transactions, cycleStart);
      return { category: c, spent, fixed, kind: expenseStatus(spent, fixed) };
    })
    .filter((a) => a.fixed > 0 && a.kind !== "on-track")
    .sort((a, b) => rank(a.kind) - rank(b.kind));

  const catById = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="h-full w-full bg-[#fafaf7] overflow-y-auto pb-32">
      <div className="px-8 pt-16">
        <div className="flex items-start justify-between mb-12">
          <div>
            <div className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
              Hello, {name}
            </div>
            <div className="text-neutral-900 mt-1" style={{ fontSize: 14 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center text-white tracking-widest" style={{ fontSize: 11 }}>
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>

        <div className="mb-10">
          <div className="text-neutral-400 tracking-[0.2em] uppercase mb-3" style={{ fontSize: 10 }}>
            Current balance
          </div>
          <div className="text-neutral-900 tracking-tight" style={{ fontSize: 44, fontWeight: 300, lineHeight: 1 }}>
            {formatIDR(wallet.active)}
          </div>
          <div className="flex gap-6 mt-4 text-neutral-500" style={{ fontSize: 12 }}>
            <span>Invest · {formatIDR(wallet.investment)}</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onAdd}
          className="w-full h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center gap-2 tracking-[0.2em] uppercase mb-10"
          style={{ fontSize: 11 }}
        >
          <Plus size={16} strokeWidth={1.5} />
          Add transaction
        </motion.button>

        {alerts.length > 0 && (
          <div className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
                Budget alerts
              </span>
              <span className="text-neutral-400" style={{ fontSize: 11 }}>{alerts.length}</span>
            </div>
            <div className="space-y-2">
              {alerts.map((a, i) => {
                const meta = kindMeta(a.kind);
                const ratio = a.spent / a.fixed;
                return (
                  <motion.div
                    key={a.category.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-neutral-900/[0.03]"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: meta.iconBg }}
                    >
                      <meta.Icon size={14} strokeWidth={1.5} className="text-neutral-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-neutral-900 truncate" style={{ fontSize: 13 }}>{a.category.name}</span>
                        <span
                          className="px-1.5 py-0.5 rounded-full tracking-[0.15em] uppercase shrink-0 text-neutral-900"
                          style={{ fontSize: 9, background: "rgba(0,0,0,0.06)" }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-neutral-500 truncate mt-0.5" style={{ fontSize: 11 }}>
                        {formatIDR(a.spent)} of {formatIDR(a.fixed)}
                      </div>
                    </div>
                    <div className="text-neutral-900 tracking-widest tabular-nums" style={{ fontSize: 11 }}>
                      {Math.round(ratio * 100)}%
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
              Recent
            </div>
            <button onClick={onSeeAll} className="flex items-center gap-1 text-neutral-900" style={{ fontSize: 11 }}>
              See all <ChevronRight size={12} strokeWidth={1.8} />
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="py-16 text-center text-neutral-400" style={{ fontSize: 12 }}>
              No transactions yet.
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {recent.map((t) => {
                const cat = catById(t.categoryId);
                return (
                  <li key={t.id} className="py-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                      {t.type === "income" ? (
                        <ArrowUpRight size={14} strokeWidth={1.5} className="text-neutral-900" />
                      ) : (
                        <ArrowDownRight size={14} strokeWidth={1.5} className="text-neutral-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-neutral-900 truncate" style={{ fontSize: 13 }}>{cat?.name ?? "—"}</span>
                        {t.fixed && (
                          <Repeat size={10} strokeWidth={1.8} className="text-neutral-400 shrink-0" />
                        )}
                      </div>
                      {t.note && (
                        <div className="text-neutral-500 truncate" style={{ fontSize: 11 }}>{t.note}</div>
                      )}
                    </div>
                    <div className="tracking-tight" style={{ fontSize: 14, color: t.type === "income" ? "#171717" : "#525252" }}>
                      {t.type === "income" ? "+" : "−"} {formatIDR(t.amount)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function rank(k: AlertKind) {
  return { over: 0, near: 1, under: 2, "on-track": 3 }[k];
}

function kindMeta(kind: AlertKind) {
  if (kind === "over") return { label: "Overbudget", iconBg: "#f1cfc0", Icon: AlertTriangle };
  if (kind === "near") return { label: "Near limit", iconBg: "#f3e2c7", Icon: AlertTriangle };
  return { label: "Underbudget", iconBg: "#dfdbf4", Icon: Sparkles };
}
