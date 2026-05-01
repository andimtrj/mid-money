import type { Pocket, Transaction } from "./types";
import { formatIDR } from "./types";

export function AnalyticsScreen({
  pockets,
  transactions,
}: {
  pockets: Pocket[];
  transactions: Transaction[];
}) {
  const nonInvestmentPockets = pockets.filter((p) => !p.isInvestment);
  const investmentPocket = pockets.find((p) => p.isInvestment);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const pocketSpending = new Map<string, number>();
  for (const t of transactions.filter((t) => t.type === "expense")) {
    if (!t.pocketId) continue;
    pocketSpending.set(t.pocketId, (pocketSpending.get(t.pocketId) ?? 0) + t.amount);
  }

  return (
    <div className="h-full w-full bg-[#fafaf7] overflow-y-auto pb-32">
      <div className="px-8 pt-16">
        <div className="w-8 h-[2px] bg-neutral-900 mb-6" />
        <h1
          className="tracking-[-0.02em] text-neutral-900 mb-10"
          style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 300 }}
        >
          Analytics
        </h1>

        <div className="grid grid-cols-2 gap-3 mb-10">
          <Stat label="Total Income" value={formatIDR(totalIncome)} />
          <Stat label="Total Expenses" value={formatIDR(totalExpenses)} />
        </div>

        {nonInvestmentPockets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-neutral-400 tracking-[0.2em] uppercase mb-4" style={{ fontSize: 10 }}>
              Pocket Usage
            </h2>
            <div className="space-y-2">
              {nonInvestmentPockets.map((pocket) => {
                const spent = pocketSpending.get(pocket.id) ?? 0;
                const remaining = pocket.balance - spent;
                return (
                  <div key={pocket.id} className="p-4 rounded-xl bg-white border border-black/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-neutral-900" style={{ fontSize: 13 }}>
                        {pocket.name}
                      </span>
                      <span className="text-neutral-500" style={{ fontSize: 12 }}>
                        {formatIDR(remaining)} remaining
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-900 transition-all"
                        style={{
                          width: pocket.balance > 0 ? `${Math.min(100, (spent / pocket.balance) * 100)}%` : "0%",
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-neutral-400" style={{ fontSize: 11 }}>
                      <span>Spent: {formatIDR(spent)}</span>
                      <span>Balance: {formatIDR(pocket.balance)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {investmentPocket && (
          <div className="mb-8">
            <h2 className="text-neutral-400 tracking-[0.2em] uppercase mb-4" style={{ fontSize: 10 }}>
              Investment
            </h2>
            <div className="p-4 rounded-xl bg-white border border-black/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-900" style={{ fontSize: 13 }}>
                  {investmentPocket.name}
                </span>
                <span className="text-neutral-900 tracking-tight" style={{ fontSize: 16, fontWeight: 300 }}>
                  {formatIDR(investmentPocket.balance)}
                </span>
              </div>
            </div>
          </div>
        )}
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
