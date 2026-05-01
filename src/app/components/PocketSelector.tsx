import { ChevronDown } from "lucide-react";
import type { Pocket } from "./types";
import { formatIDR } from "./types";

export function PocketSelector({
  label,
  value,
  onChange,
  pockets,
  includeMainBalance = false,
  disableInvestment = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (pocketId: string | undefined) => void;
  pockets: Pocket[];
  includeMainBalance?: boolean;
  disableInvestment?: boolean;
}) {
  const availablePockets = pockets.filter((p) => {
    if (disableInvestment && p.isInvestment) return false;
    return true;
  });

  const selectedPocket = value ? pockets.find((p) => p.id === value) : null;
  const displayName = !value
    ? "Select pocket"
    : selectedPocket
    ? selectedPocket.name
    : includeMainBalance
    ? "Main Balance"
    : "Select pocket";

  return (
    <div className="mb-6">
      <span className="block text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>
        {label}
      </span>
      <div className="relative">
        <button
          onClick={() => {}}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition-colors text-left text-neutral-900"
          style={{ fontSize: 13 }}
        >
          <span className="truncate">{displayName}</span>
          <ChevronDown size={16} strokeWidth={1.5} className="text-neutral-400 shrink-0 ml-2" />
        </button>

        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-white border border-neutral-200 shadow-lg z-10 overflow-hidden">
          {includeMainBalance && (
            <button
              onClick={() => onChange(undefined)}
              className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                !value ? "bg-neutral-100" : ""
              }`}
              style={{ fontSize: 13 }}
            >
              <span className="text-neutral-900">Main Balance</span>
            </button>
          )}

          {availablePockets.length === 0 ? (
            <div className="px-4 py-3 text-neutral-400 text-center" style={{ fontSize: 12 }}>
              No pockets available
            </div>
          ) : (
            availablePockets.map((pocket) => (
              <button
                key={pocket.id}
                onClick={() => onChange(pocket.id)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors last:border-b-0 ${
                  value === pocket.id ? "bg-neutral-100" : ""
                }`}
                style={{ fontSize: 13 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-900">{pocket.name}</span>
                  <span className="text-neutral-400 text-sm">{formatIDR(pocket.balance)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
