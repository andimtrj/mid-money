import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Trash2, Repeat, Calendar } from "lucide-react";
import type { Category, Wallet, FixedIncome, FixedExpense } from "./types";
import { formatIDR, ordinal } from "./types";
import { NumberPad } from "./NumberPad";

type SheetKind = "income" | "expense" | "category-income" | "category-expense" | null;

export function BudgetScreen({
  categories,
  wallet,
  fixedIncomes,
  fixedExpenses,
  onAddCategory,
  onDeleteCategory,
  onUpdateWallet,
  onAddFixedIncome,
  onUpdateFixedIncome,
  onDeleteFixedIncome,
  onAddFixedExpense,
  onUpdateFixedExpense,
  onDeleteFixedExpense,
}: {
  categories: Category[];
  wallet: Wallet;
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  onAddCategory: (c: Omit<Category, "id">) => string;
  onDeleteCategory: (id: string) => void;
  onUpdateWallet: (w: Wallet) => void;
  onAddFixedIncome: (fi: Omit<FixedIncome, "id">) => void;
  onUpdateFixedIncome: (id: string, patch: Partial<Omit<FixedIncome, "id">>) => void;
  onDeleteFixedIncome: (id: string) => void;
  onAddFixedExpense: (fe: Omit<FixedExpense, "id">) => void;
  onUpdateFixedExpense: (id: string, patch: Partial<Omit<FixedExpense, "id">>) => void;
  onDeleteFixedExpense: (id: string) => void;
}) {
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [editIncome, setEditIncome] = useState<FixedIncome | null>(null);
  const [editExpense, setEditExpense] = useState<FixedExpense | null>(null);

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";
  const incomeCats = categories.filter((c) => c.type === "income");
  const expenseCats = categories.filter((c) => c.type === "expense");

  return (
    <div className="h-full w-full bg-[#fafaf7] overflow-y-auto pb-32">
      <div className="px-8 pt-16">
        <div className="w-8 h-[2px] bg-neutral-900 mb-6" />
        <h1 className="tracking-[-0.02em] text-neutral-900 mb-12" style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 300 }}>
          Fixed
        </h1>

        <WalletCard wallet={wallet} onUpdate={onUpdateWallet} />

        <SectionHeader title="Fixed Income" onAdd={() => setSheet("income")} disabled={incomeCats.length === 0} />
        {fixedIncomes.length === 0 ? (
          <Empty msg={incomeCats.length === 0 ? "Add an income category first." : "No fixed income."} />
        ) : (
          <ul className="divide-y divide-black/[0.05] mb-10">
            {fixedIncomes.map((fi) => (
              <li key={fi.id} className="py-4 flex items-center gap-3">
                <button onClick={() => setEditIncome(fi)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Repeat size={14} strokeWidth={1.5} className="text-neutral-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-900 truncate" style={{ fontSize: 13 }}>{catName(fi.categoryId)}</div>
                    <div className="text-neutral-500 truncate flex items-center gap-1" style={{ fontSize: 11 }}>
                      <Calendar size={10} strokeWidth={1.8} />
                      Every {ordinal(fi.dayOfMonth)}
                    </div>
                  </div>
                  <div className="text-neutral-900 tracking-tight" style={{ fontSize: 13 }}>+ {formatIDR(fi.amount)}</div>
                </button>
                <button onClick={() => onDeleteFixedIncome(fi.id)} className="text-neutral-300">
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <SectionHeader
          title="Fixed Expense"
          onAdd={() => setSheet("expense")}
          disabled={expenseCats.length === 0 || fixedIncomes.length === 0}
        />
        {fixedExpenses.length === 0 ? (
          <Empty
            msg={
              fixedIncomes.length === 0
                ? "Add fixed income first."
                : expenseCats.length === 0
                ? "Add an expense category first."
                : "No fixed expenses."
            }
          />
        ) : (
          <ul className="divide-y divide-black/[0.05] mb-10">
            {fixedExpenses.map((fe) => {
              const linked = fixedIncomes.find((i) => i.id === fe.fixedIncomeId);
              return (
                <li key={fe.id} className="py-4 flex items-center gap-3">
                  <button onClick={() => setEditExpense(fe)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                      <Repeat size={14} strokeWidth={1.5} className="text-neutral-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-neutral-900 truncate" style={{ fontSize: 13 }}>{catName(fe.categoryId)}</div>
                      <div className="text-neutral-500 truncate flex items-center gap-1" style={{ fontSize: 11 }}>
                        <Calendar size={10} strokeWidth={1.8} />
                        {linked ? `On ${ordinal(linked.dayOfMonth)} · with ${catName(linked.categoryId)}` : "—"}
                      </div>
                    </div>
                    <div className="text-neutral-500 tracking-tight" style={{ fontSize: 13 }}>− {formatIDR(fe.amount)}</div>
                  </button>
                  <button onClick={() => onDeleteFixedExpense(fe.id)} className="text-neutral-300">
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <SectionHeader title="Income categories" onAdd={() => setSheet("category-income")} />
        <CategoryList items={incomeCats} onDelete={onDeleteCategory} />

        <SectionHeader title="Expense categories" onAdd={() => setSheet("category-expense")} />
        <CategoryList items={expenseCats} onDelete={onDeleteCategory} />
      </div>

      <FixedIncomeSheet
        open={sheet === "income"}
        categories={incomeCats}
        onClose={() => setSheet(null)}
        onSave={(fi) => {
          onAddFixedIncome(fi);
          setSheet(null);
        }}
      />

      <FixedIncomeSheet
        open={!!editIncome}
        initial={editIncome ?? undefined}
        categories={incomeCats}
        onClose={() => setEditIncome(null)}
        onSave={(fi) => {
          if (editIncome) onUpdateFixedIncome(editIncome.id, fi);
          setEditIncome(null);
        }}
      />

      <FixedExpenseSheet
        open={sheet === "expense"}
        categories={expenseCats}
        fixedIncomes={fixedIncomes}
        incomeCategoryName={(id) => catName(id)}
        onClose={() => setSheet(null)}
        onSave={(fe) => {
          onAddFixedExpense(fe);
          setSheet(null);
        }}
      />

      <FixedExpenseSheet
        open={!!editExpense}
        initial={editExpense ?? undefined}
        categories={expenseCats}
        fixedIncomes={fixedIncomes}
        incomeCategoryName={(id) => catName(id)}
        onClose={() => setEditExpense(null)}
        onSave={(fe) => {
          if (editExpense) onUpdateFixedExpense(editExpense.id, fe);
          setEditExpense(null);
        }}
      />

      <CategorySheet
        open={sheet === "category-income" || sheet === "category-expense"}
        type={sheet === "category-income" ? "income" : "expense"}
        onClose={() => setSheet(null)}
        onSave={(c) => {
          onAddCategory(c);
          setSheet(null);
        }}
      />
    </div>
  );
}

function SectionHeader({ title, onAdd, disabled }: { title: string; onAdd: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-4 mt-2">
      <span className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>{title}</span>
      <button
        onClick={onAdd}
        disabled={disabled}
        className="flex items-center gap-1 text-neutral-900 disabled:opacity-30"
        style={{ fontSize: 11 }}
      >
        <Plus size={14} strokeWidth={1.5} /> Add
      </button>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="py-6 text-center text-neutral-400 mb-6" style={{ fontSize: 12 }}>{msg}</div>;
}

function CategoryList({ items, onDelete }: { items: Category[]; onDelete: (id: string) => void }) {
  if (items.length === 0) return <Empty msg="No categories." />;
  return (
    <ul className="divide-y divide-black/[0.05] mb-10">
      {items.map((c) => (
        <li key={c.id} className="py-3 flex items-center justify-between">
          <span className="text-neutral-900" style={{ fontSize: 13 }}>{c.name}</span>
          <button onClick={() => onDelete(c.id)} className="text-neutral-300">
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function WalletCard({ wallet, onUpdate }: { wallet: Wallet; onUpdate: (w: Wallet) => void }) {
  const [editing, setEditing] = useState<null | "active" | "investment">(null);
  const [amount, setAmount] = useState("0");

  const open = (field: "active" | "investment") => {
    setAmount(String(wallet[field] || 0));
    setEditing(field);
  };

  const handleKey = (k: string) => {
    if (k === "back") setAmount((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));
    else setAmount((a) => (a === "0" ? k.replace(/^0+/, "") || "0" : (a + k).slice(0, 14)));
  };

  const save = () => {
    if (!editing) return;
    onUpdate({ ...wallet, [editing]: parseInt(amount, 10) || 0 });
    setEditing(null);
  };

  return (
    <div className="mb-12">
      <div className="text-neutral-400 tracking-[0.2em] uppercase mb-4" style={{ fontSize: 10 }}>Wallet</div>
      <div className="grid grid-cols-2 gap-3">
        {(["active", "investment"] as const).map((k) => (
          <button key={k} onClick={() => open(k)} className="text-left p-5 rounded-2xl bg-white border border-black/[0.04]">
            <div className="text-neutral-400 tracking-[0.15em] uppercase mb-2" style={{ fontSize: 9 }}>
              {k === "active" ? "Active balance" : "Investment"}
            </div>
            <div className="text-neutral-900 tracking-tight" style={{ fontSize: 18, fontWeight: 300 }}>
              {formatIDR(wallet[k])}
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <Sheet onClose={() => setEditing(null)} title={`Set ${editing === "active" ? "active balance" : "investment"}`}>
            <div className="text-center mb-6">
              <div className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>IDR</div>
              <div className="text-neutral-900 tracking-tight mt-1" style={{ fontSize: 40, fontWeight: 300 }}>
                {formatIDR(parseInt(amount, 10) || 0)}
              </div>
            </div>
            <NumberPad onInput={handleKey} />
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

function FixedIncomeSheet({
  open,
  initial,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: FixedIncome;
  categories: Category[];
  onClose: () => void;
  onSave: (fi: Omit<FixedIncome, "id">) => void;
}) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "0");
  const [day, setDay] = useState(initial?.dayOfMonth ?? 25);

  const handleKey = (k: string) => {
    if (k === "back") setAmount((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));
    else setAmount((a) => (a === "0" ? k.replace(/^0+/, "") || "0" : (a + k).slice(0, 14)));
  };

  const save = () => {
    if (!categoryId || !parseInt(amount, 10)) return;
    onSave({ categoryId, amount: parseInt(amount, 10), dayOfMonth: day });
    if (!initial) {
      setCategoryId("");
      setAmount("0");
      setDay(25);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Sheet onClose={onClose} title={initial ? "Edit fixed income" : "New fixed income"}>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          <DayPicker value={day} onChange={setDay} />
          <div className="text-center mb-6">
            <div className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>Amount · IDR</div>
            <div className="text-neutral-900 tracking-tight mt-1" style={{ fontSize: 36, fontWeight: 300 }}>
              {formatIDR(parseInt(amount, 10) || 0)}
            </div>
          </div>
          <NumberPad onInput={handleKey} />
          <PrimaryButton onClick={save} disabled={!categoryId || !parseInt(amount, 10)}>Save</PrimaryButton>
        </Sheet>
      )}
    </AnimatePresence>
  );
}

function FixedExpenseSheet({
  open,
  initial,
  categories,
  fixedIncomes,
  incomeCategoryName,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: FixedExpense;
  categories: Category[];
  fixedIncomes: FixedIncome[];
  incomeCategoryName: (id: string) => string;
  onClose: () => void;
  onSave: (fe: Omit<FixedExpense, "id">) => void;
}) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "0");
  const [fixedIncomeId, setFixedIncomeId] = useState(initial?.fixedIncomeId ?? fixedIncomes[0]?.id ?? "");

  const handleKey = (k: string) => {
    if (k === "back") setAmount((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));
    else setAmount((a) => (a === "0" ? k.replace(/^0+/, "") || "0" : (a + k).slice(0, 14)));
  };

  const save = () => {
    if (!categoryId || !fixedIncomeId || !parseInt(amount, 10)) return;
    onSave({ categoryId, amount: parseInt(amount, 10), fixedIncomeId });
    if (!initial) {
      setCategoryId("");
      setAmount("0");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Sheet onClose={onClose} title={initial ? "Edit fixed expense" : "New fixed expense"}>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          <div className="mb-6">
            <div className="text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>
              Sync with fixed income
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-none">
              {fixedIncomes.map((fi) => (
                <button
                  key={fi.id}
                  onClick={() => setFixedIncomeId(fi.id)}
                  className="shrink-0 px-4 py-2 rounded-full border transition-all"
                  style={{
                    fontSize: 12,
                    borderColor: fixedIncomeId === fi.id ? "#171717" : "rgba(0,0,0,0.08)",
                    background: fixedIncomeId === fi.id ? "#171717" : "transparent",
                    color: fixedIncomeId === fi.id ? "#fff" : "#525252",
                  }}
                >
                  {incomeCategoryName(fi.categoryId)} · {ordinal(fi.dayOfMonth)}
                </button>
              ))}
            </div>
          </div>
          <div className="text-center mb-6">
            <div className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>Amount · IDR</div>
            <div className="text-neutral-900 tracking-tight mt-1" style={{ fontSize: 36, fontWeight: 300 }}>
              {formatIDR(parseInt(amount, 10) || 0)}
            </div>
          </div>
          <NumberPad onInput={handleKey} />
          <PrimaryButton onClick={save} disabled={!categoryId || !fixedIncomeId || !parseInt(amount, 10)}>
            Save
          </PrimaryButton>
        </Sheet>
      )}
    </AnimatePresence>
  );
}

function CategorySheet({
  open,
  type,
  onClose,
  onSave,
}: {
  open: boolean;
  type: "income" | "expense";
  onClose: () => void;
  onSave: (c: Omit<Category, "id">) => void;
}) {
  const [name, setName] = useState("");
  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), type });
    setName("");
  };
  return (
    <AnimatePresence>
      {open && (
        <Sheet onClose={onClose} title={`New ${type} category`}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full bg-transparent border-b border-neutral-200 focus:border-neutral-900 outline-none pb-2 mb-6 text-neutral-900 placeholder:text-neutral-400"
            style={{ fontSize: 16 }}
          />
          <PrimaryButton onClick={save} disabled={!name.trim()}>Save</PrimaryButton>
        </Sheet>
      )}
    </AnimatePresence>
  );
}

function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-6">
      <div className="text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>Category</div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className="shrink-0 px-4 py-2 rounded-full border transition-all"
            style={{
              fontSize: 12,
              borderColor: value === c.id ? "#171717" : "rgba(0,0,0,0.08)",
              background: value === c.id ? "#171717" : "transparent",
              color: value === c.id ? "#fff" : "#525252",
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DayPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
          Repeat date
        </span>
        <span className="text-neutral-900" style={{ fontSize: 12 }}>
          Every {ordinal(value)}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 p-3 rounded-2xl bg-white border border-black/[0.04]">
        {days.map((d) => {
          const selected = value === d;
          return (
            <button
              key={d}
              onClick={() => onChange(d)}
              className="aspect-square rounded-full transition-all flex items-center justify-center"
              style={{
                fontSize: 12,
                background: selected ? "#171717" : "transparent",
                color: selected ? "#fff" : "#525252",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
      {value > 28 && (
        <div className="text-neutral-400 mt-2" style={{ fontSize: 11 }}>
          On months without the {ordinal(value)}, the cycle runs on the last day.
        </div>
      )}
    </div>
  );
}

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
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
          <span className="tracking-[0.2em] uppercase text-neutral-500" style={{ fontSize: 10 }}>{title}</span>
          <button onClick={onClose} className="text-neutral-400">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </motion.div>
    </>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className="mt-5 w-full h-14 rounded-full bg-neutral-900 text-white tracking-[0.2em] uppercase disabled:opacity-30"
      style={{ fontSize: 11 }}
    >
      {children}
    </motion.button>
  );
}
