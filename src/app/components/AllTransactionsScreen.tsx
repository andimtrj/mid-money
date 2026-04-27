import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Trash2, Repeat, X } from "lucide-react";
import type { Category, Transaction } from "./types";
import { formatIDR } from "./types";
import { NumberPad } from "./NumberPad";

export function AllTransactionsScreen({
  transactions,
  categories,
  onClose,
  onUpdate,
  onDelete,
}: {
  transactions: Transaction[];
  categories: Category[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Pick<Transaction, "amount" | "date" | "note">>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);

  const grouped = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.date - a.date);
    const map = new Map<string, Transaction[]>();
    for (const t of sorted) {
      const key = new Date(t.date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [transactions]);

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      className="absolute inset-0 z-30 bg-[#fafaf7] overflow-y-auto pb-32"
    >
      <div className="px-8 pt-16">
        <button onClick={onClose} className="flex items-center gap-1 text-neutral-900 mb-8" style={{ fontSize: 12 }}>
          <ChevronLeft size={16} strokeWidth={1.5} /> Back
        </button>
        <div className="w-8 h-[2px] bg-neutral-900 mb-6" />
        <h1 className="tracking-[-0.02em] text-neutral-900 mb-10" style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 300 }}>
          All transactions
        </h1>

        {grouped.length === 0 ? (
          <div className="py-16 text-center text-neutral-400" style={{ fontSize: 12 }}>
            No transactions yet.
          </div>
        ) : (
          grouped.map(([day, items]) => (
            <div key={day} className="mb-8">
              <div className="text-neutral-400 tracking-[0.2em] uppercase mb-3" style={{ fontSize: 10 }}>
                {formatDay(day)}
              </div>
              <ul className="divide-y divide-black/[0.05]">
                {items.map((t) => (
                  <li key={t.id} className="py-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                      {t.type === "income" ? (
                        <ArrowUpRight size={14} strokeWidth={1.5} className="text-neutral-900" />
                      ) : (
                        <ArrowDownRight size={14} strokeWidth={1.5} className="text-neutral-900" />
                      )}
                    </div>
                    <button onClick={() => setEditing(t)} className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-neutral-900 truncate" style={{ fontSize: 13 }}>{catName(t.categoryId)}</span>
                        {t.fixed && <Repeat size={10} strokeWidth={1.8} className="text-neutral-400 shrink-0" />}
                      </div>
                      {t.note && (
                        <div className="text-neutral-500 truncate" style={{ fontSize: 11 }}>{t.note}</div>
                      )}
                    </button>
                    <div className="tracking-tight" style={{ fontSize: 14, color: t.type === "income" ? "#171717" : "#525252" }}>
                      {t.type === "income" ? "+" : "−"} {formatIDR(t.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {editing && (
        <EditSheet
          transaction={editing}
          categoryName={catName(editing.categoryId)}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            onUpdate(editing.id, patch);
            setEditing(null);
          }}
          onDelete={() => {
            onDelete(editing.id);
            setEditing(null);
          }}
        />
      )}
    </motion.div>
  );
}

function formatDay(s: string) {
  const d = new Date(s);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - d.setHours(0, 0, 0, 0)) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(s).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

function EditSheet({
  transaction,
  categoryName,
  onClose,
  onSave,
  onDelete,
}: {
  transaction: Transaction;
  categoryName: string;
  onClose: () => void;
  onSave: (patch: Partial<Pick<Transaction, "amount" | "date" | "note">>) => void;
  onDelete: () => void;
}) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [note, setNote] = useState(transaction.note);
  const [date, setDate] = useState(stripTime(transaction.date));
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleKey = (k: string) => {
    if (k === "back") setAmount((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));
    else setAmount((a) => (a === "0" ? k.replace(/^0+/, "") || "0" : (a + k).slice(0, 14)));
  };

  const save = () => {
    const n = parseInt(amount, 10);
    if (!n) return;
    onSave({ amount: n, note, date });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="absolute bottom-0 left-0 right-0 z-50 bg-[#fafaf7] rounded-t-[28px] pt-3 pb-8 px-6 max-h-[92%] overflow-y-auto"
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300 mb-4" />
        <div className="flex items-center justify-between mb-6">
          <span className="tracking-[0.2em] uppercase text-neutral-500" style={{ fontSize: 10 }}>Edit transaction</span>
          <button onClick={onClose} className="text-neutral-400">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="mb-4">
          <div className="text-neutral-400 tracking-[0.2em] uppercase mb-1" style={{ fontSize: 10 }}>Category</div>
          <div className="text-neutral-900" style={{ fontSize: 14 }}>{categoryName}</div>
          <div className="text-neutral-400 mt-1" style={{ fontSize: 11 }}>Category cannot be changed.</div>
        </div>

        <div className="mb-5">
          <span className="block text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>Date</span>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="w-full flex items-center justify-between border-b border-neutral-200 pb-2 text-neutral-900"
            style={{ fontSize: 14 }}
          >
            <span>{formatLong(date)}</span>
            <ChevronRight
              size={14}
              strokeWidth={1.5}
              className="text-neutral-400 transition-transform"
              style={{ transform: pickerOpen ? "rotate(90deg)" : "none" }}
            />
          </button>
          <AnimatePresence initial={false}>
            {pickerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <CalendarPicker value={date} onChange={(d) => setDate(d)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <label className="block mb-6">
          <span className="block text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full bg-transparent border-b border-neutral-200 focus:border-neutral-900 outline-none pb-2 text-neutral-900 placeholder:text-neutral-400"
            style={{ fontSize: 14 }}
          />
        </label>

        <div className="text-center mb-6">
          <div className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
            {transaction.type} · IDR
          </div>
          <div className="text-neutral-900 tracking-tight mt-1" style={{ fontSize: 36, fontWeight: 300 }}>
            {transaction.type === "expense" ? "− " : "+ "}{formatIDR(parseInt(amount, 10) || 0)}
          </div>
        </div>
        <NumberPad onInput={handleKey} />

        <div className="flex gap-2 mt-5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onDelete}
            className="h-14 px-6 rounded-full border border-neutral-900/10 text-neutral-900 tracking-[0.2em] uppercase flex items-center gap-2"
            style={{ fontSize: 11 }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
            Delete
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={save}
            className="flex-1 h-14 rounded-full bg-neutral-900 text-white tracking-[0.2em] uppercase"
            style={{ fontSize: 11 }}
          >
            Save changes
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

function stripTime(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatLong(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

function CalendarPicker({ value, onChange }: { value: number; onChange: (ts: number) => void }) {
  const [view, setView] = useState(() => {
    const d = new Date(value);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const viewDate = new Date(view);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(view);
    d.setMonth(d.getMonth() + delta);
    setView(d.getTime());
  };

  const selected = new Date(value);
  const isSelected = (d: number) =>
    selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;
  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div className="mt-3 p-4 rounded-2xl bg-white border border-black/[0.04]">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shift(-1)} className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900">
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-neutral-900" style={{ fontSize: 13 }}>
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button onClick={() => shift(1)} className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900">
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-neutral-400 tracking-widest" style={{ fontSize: 9 }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          const sel = isSelected(d);
          const tod = isToday(d);
          return (
            <button
              key={i}
              onClick={() => onChange(new Date(year, month, d).getTime())}
              className="aspect-square rounded-full flex items-center justify-center transition-all"
              style={{
                fontSize: 12,
                background: sel ? "#171717" : "transparent",
                color: sel ? "#fff" : tod ? "#171717" : "#525252",
                border: tod && !sel ? "1px solid rgba(0,0,0,0.2)" : "none",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
