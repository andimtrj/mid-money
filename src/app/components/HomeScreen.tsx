import { motion } from "motion/react";
import { Plus, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import type { Pocket, Transaction, Wallet } from "./types";
import { formatIDR } from "./types";

export function HomeScreen({
  name,
  wallet,
  transactions,
  pockets,
  onAdd,
  onSeeAll,
}: {
  name: string;
  wallet: Wallet;
  transactions: Transaction[];
  pockets: Pocket[];
  onAdd: () => void;
  onSeeAll: () => void;
}) {
  const recent = [...transactions].sort((a, b) => b.date - a.date).slice(0, 5);
  const getPocketName = (id: string | undefined) => pockets.find((p) => p.id === id)?.name ?? "—";

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
            Main Balance
          </div>
          <div className="text-neutral-900 tracking-tight" style={{ fontSize: 44, fontWeight: 300, lineHeight: 1 }}>
            {formatIDR(wallet.active)}
          </div>
        </div>

        {pockets.length > 0 && (
          <div className="mb-10">
            <div className="text-neutral-400 tracking-[0.2em] uppercase mb-3" style={{ fontSize: 10 }}>
              Pockets
            </div>
            <div className="space-y-2">
              {pockets.map((pocket) => (
                <div key={pocket.id} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-black/[0.04]">
                  <span className="text-neutral-900" style={{ fontSize: 13 }}>
                    {pocket.name}
                    {pocket.isInvestment && <span className="text-neutral-400 ml-2">(Investment)</span>}
                  </span>
                  <span className="text-neutral-900 tracking-tight" style={{ fontSize: 13, fontWeight: 400 }}>
                    {formatIDR(pocket.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onAdd}
          className="w-full h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center gap-2 tracking-[0.2em] uppercase mb-10"
          style={{ fontSize: 11 }}
        >
          <Plus size={16} strokeWidth={1.5} />
          Add transaction
        </motion.button>

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
              {recent.map((t) => (
                <li key={t.id} className="py-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    {t.type === "income" ? (
                      <ArrowUpRight size={14} strokeWidth={1.5} className="text-neutral-900" />
                    ) : (
                      <ArrowDownRight size={14} strokeWidth={1.5} className="text-neutral-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-900 truncate" style={{ fontSize: 13 }}>
                      {t.type === "income" ? "Income" : `Pocket: ${getPocketName(t.pocketId)}`}
                    </div>
                    {t.note && (
                      <div className="text-neutral-500 truncate" style={{ fontSize: 11 }}>{t.note}</div>
                    )}
                  </div>
                  <div className="tracking-tight" style={{ fontSize: 14, color: t.type === "income" ? "#171717" : "#525252" }}>
                    {t.type === "income" ? "+" : "−"} {formatIDR(t.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
