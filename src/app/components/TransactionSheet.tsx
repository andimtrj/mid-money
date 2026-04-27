import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, TrendingUp, TrendingDown, Check } from "lucide-react";
import { NumberPad } from "./NumberPad";
import type { Category, Transaction } from "./types";
import { formatIDR } from "./types";

export function TransactionSheet({
  open,
  onClose,
  onSave,
  onAddCategory,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (t: Omit<Transaction, "id" | "date">) => void;
  onAddCategory: (c: Omit<Category, "id">) => string;
  categories: Category[];
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState("");

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const filtered = categories.filter((c) => c.type === type);

  const handleKey = (k: string) => {
    if (k === "back") setAmount((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));
    else setAmount((a) => (a === "0" ? k.replace(/^0+/, "") || "0" : (a + k).slice(0, 12)));
  };

  const reset = () => {
    setAmount("0");
    setNote("");
    setCategoryId("");
    setType("expense");
    setAdding(false);
    setNewName("");
  };

  const submit = () => {
    const n = parseInt(amount, 10);
    if (!n || !categoryId) return;
    onSave({ type, amount: n, categoryId, note });
    reset();
    onClose();
  };

  const confirmAddCategory = () => {
    if (!newName.trim()) return;
    const id = onAddCategory({ name: newName.trim(), type });
    setCategoryId(id);
    setAdding(false);
    setNewName("");
  };

  const TypeIcon = type === "expense" ? TrendingDown : TrendingUp;

  return (
    <AnimatePresence>
      {open && (
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
            className="absolute bottom-0 left-0 right-0 z-50 bg-[#fafaf7] rounded-t-[28px] pt-3 pb-8 px-6 flex flex-col max-h-[92%] overflow-y-auto"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300 mb-4" />
            <div className="flex items-center justify-between mb-6">
              <span className="tracking-[0.2em] uppercase text-neutral-500" style={{ fontSize: 10 }}>
                New transaction
              </span>
              <button onClick={onClose} className="text-neutral-400">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex gap-1 p-1 rounded-full bg-neutral-200/60 mb-6 self-center">
              {(["expense", "income"] as const).map((t) => {
                const Icon = t === "expense" ? TrendingDown : TrendingUp;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setType(t);
                      setCategoryId("");
                      setAdding(false);
                    }}
                    className="flex items-center gap-1.5 px-5 py-1.5 rounded-full tracking-[0.15em] uppercase transition-all"
                    style={{
                      fontSize: 10,
                      background: type === t ? "#171717" : "transparent",
                      color: type === t ? "#fff" : "#525252",
                    }}
                  >
                    <Icon size={12} strokeWidth={1.8} />
                    {t}
                  </button>
                );
              })}
            </div>

            <div className="text-center mb-6">
              <div
                className="inline-flex items-center gap-1.5 tracking-[0.2em] uppercase"
                style={{ fontSize: 10, color: type === "expense" ? "#b43a3a" : "#2e7a4f" }}
              >
                <TypeIcon size={12} strokeWidth={1.8} />
                {type} · IDR
              </div>
              <div className="text-neutral-900 tracking-tight mt-1" style={{ fontSize: 40, fontWeight: 300 }}>
                {type === "expense" ? "− " : "+ "}
                {formatIDR(parseInt(amount, 10) || 0)}
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
                  Category
                </span>
                <button
                  onClick={() => setAdding((v) => !v)}
                  className="flex items-center gap-1 text-neutral-900"
                  style={{ fontSize: 11 }}
                >
                  <Plus size={12} strokeWidth={1.8} />
                  New
                </button>
              </div>

              <AnimatePresence initial={false}>
                {adding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-2xl bg-white border border-black/[0.05] mb-3 flex items-center gap-2">
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={`New ${type} category`}
                        className="flex-1 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400"
                        style={{ fontSize: 13 }}
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={confirmAddCategory}
                        disabled={!newName.trim()}
                        className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center disabled:opacity-30"
                      >
                        <Check size={14} strokeWidth={1.8} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-none">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className="shrink-0 px-4 py-2 rounded-full border transition-all"
                    style={{
                      fontSize: 12,
                      borderColor: categoryId === c.id ? "#171717" : "rgba(0,0,0,0.08)",
                      background: categoryId === c.id ? "#171717" : "transparent",
                      color: categoryId === c.id ? "#fff" : "#525252",
                    }}
                  >
                    {c.name}
                  </button>
                ))}
                {filtered.length === 0 && !adding && (
                  <span className="text-neutral-400 py-2" style={{ fontSize: 12 }}>
                    No categories yet — tap New.
                  </span>
                )}
              </div>
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full bg-transparent border-b border-neutral-200 focus:border-neutral-900 outline-none pb-2 mb-6 text-neutral-900 placeholder:text-neutral-400 transition-colors"
              style={{ fontSize: 14 }}
            />

            <NumberPad onInput={handleKey} />

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={submit}
              disabled={!parseInt(amount, 10) || !categoryId}
              className="mt-5 h-14 rounded-full bg-neutral-900 text-white tracking-[0.2em] uppercase disabled:opacity-30 flex items-center justify-center gap-2"
              style={{ fontSize: 11 }}
            >
              <TypeIcon size={14} strokeWidth={1.8} />
              Save {type}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
