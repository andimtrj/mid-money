import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Trash2, Edit2, AlertCircle } from "lucide-react";
import type { Category, Pocket, Wallet } from "./types";
import { formatIDR } from "./types";
import { NumberPad } from "./NumberPad";

type SheetKind = "add-pocket" | "edit-pocket" | "category-income" | "category-expense" | "confirm-delete" | null;

type ConfirmDeleteType = { type: "category" | "pocket"; id: string; name: string } | null;

export function BudgetScreen({
  categories,
  wallet,
  pockets,
  onAddCategory,
  onDeleteCategory,
  onUpdateWallet,
  onAddPocket,
  onUpdatePocket,
  onDeletePocket,
}: {
  categories: Category[];
  wallet: Wallet;
  pockets: Pocket[];
  onAddCategory: (c: Omit<Category, "id">) => string;
  onDeleteCategory: (id: string) => void;
  onUpdateWallet: (w: Wallet) => void;
  onAddPocket: (p: Omit<Pocket, "id">) => void;
  onUpdatePocket: (id: string, patch: Partial<Omit<Pocket, "id">>) => void;
  onDeletePocket: (id: string) => void;
}) {
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [editPocket, setEditPocket] = useState<Pocket | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteType>(null);
  const [confirmPocket, setConfirmPocket] = useState<{name: string; amount: number} | null>(null);

  const incomeCats = categories.filter((c) => c.type === "income");
  const nonInvestmentPockets = pockets.filter((p) => !p.isInvestment);
  const investmentPocket = pockets.find((p) => p.isInvestment);

  return (
    <div className="h-full w-full bg-[#fafaf7] overflow-y-auto pb-32">
      <div className="px-8 pt-16">
        <div className="w-8 h-[2px] bg-neutral-900 mb-6" />
        <h1 className="tracking-[-0.02em] text-neutral-900 mb-12" style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 300 }}>
          Budget
        </h1>

        <WalletCard wallet={wallet} onUpdate={onUpdateWallet} />

        <SectionHeader title="Pockets" onAdd={() => setSheet("add-pocket")} />
        {nonInvestmentPockets.length === 0 ? (
          <Empty msg="No pockets yet. Create one to organize your spending." />
        ) : (
          <ul className="divide-y divide-black/[0.05] mb-10">
            {nonInvestmentPockets.map((p) => (
              <li key={p.id} className="py-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditPocket(p);
                    setSheet("edit-pocket");
                  }}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-900 truncate" style={{ fontSize: 13 }}>
                      {p.name}
                    </div>
                    <div className="text-neutral-500 truncate" style={{ fontSize: 11 }}>
                      {formatIDR(p.balance)}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() =>
                    setConfirmDelete({ type: "pocket", id: p.id, name: p.name })
                  }
                  className="text-neutral-300"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {investmentPocket && (
          <>
            <SectionHeader title="Investment" onAdd={() => {}} />
            <button
              onClick={() => {
                setEditPocket(investmentPocket);
                setSheet("edit-pocket");
              }}
              className="w-full text-left p-4 rounded-2xl bg-white border border-black/[0.04] mb-10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-neutral-900" style={{ fontSize: 13 }}>
                    {investmentPocket.name}
                  </div>
                  <div className="text-neutral-500" style={{ fontSize: 11 }}>
                    Cannot be used for direct expenses
                  </div>
                </div>
                <div className="text-neutral-900 tracking-tight" style={{ fontSize: 14, fontWeight: 400 }}>
                  {formatIDR(investmentPocket.balance)}
                </div>
              </div>
            </button>
          </>
        )}

        <SectionHeader title="Income categories" onAdd={() => setSheet("category-income")} />
        <CategoryList
          items={incomeCats}
          onDelete={(id, name) =>
            setConfirmDelete({ type: "category", id, name })
          }
        />
      </div>

      <PocketSheet
        open={sheet === "add-pocket"}
        initial={undefined}
        mainWalletBalance={wallet.active}
        onClose={() => setSheet(null)}
        onSave={(p) => {
          setConfirmPocket({ name: p.name, amount: p.balance });
          setSheet(null);
        }}
      />

      <PocketSheet
        open={sheet === "edit-pocket" && !!editPocket}
        initial={editPocket ?? undefined}
        mainWalletBalance={wallet.active}
        isInvestment={editPocket?.isInvestment}
        onClose={() => {
          setEditPocket(null);
          setSheet(null);
        }}
        onSave={(p) => {
          if (editPocket) {
            if (editPocket.isInvestment) {
              // For investment pocket, update the balance
              onUpdatePocket(editPocket.id, { balance: p.balance });
            } else {
              // For normal pockets, update name and balance
              onUpdatePocket(editPocket.id, p);
            }
          }
          setEditPocket(null);
          setSheet(null);
        }}
      />

      <CategorySheet
        open={sheet === "category-income"}
        type="income"
        onClose={() => setSheet(null)}
        onSave={(c) => {
          onAddCategory(c);
          setSheet(null);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.type === "category" ? "category" : "pocket"}`}
        message={`Are you sure want to delete this ${confirmDelete?.type}?`}
        itemName={confirmDelete?.name}
        onConfirm={() => {
          if (confirmDelete) {
            if (confirmDelete.type === "category") {
              onDeleteCategory(confirmDelete.id);
            } else {
              onDeletePocket(confirmDelete.id);
            }
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmPocketDialog
        open={!!confirmPocket}
        name={confirmPocket?.name ?? ""}
        amount={confirmPocket?.amount ?? 0}
        onConfirm={() => {
          if (confirmPocket) {
            onAddPocket({ name: confirmPocket.name, balance: confirmPocket.amount, isInvestment: false });
          }
          setConfirmPocket(null);
        }}
        onCancel={() => setConfirmPocket(null)}
      />
    </div>
  );
}


function SectionHeader({ title, onAdd, disabled }: { title: string; onAdd: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-4 mt-2">
      <span className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
        {title}
      </span>
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
  return (
    <div className="py-6 text-center text-neutral-400 mb-6" style={{ fontSize: 12 }}>
      {msg}
    </div>
  );
}

function CategoryList({ items, onDelete }: { items: Category[]; onDelete: (id: string, name: string) => void }) {
  if (items.length === 0) return <Empty msg="No categories." />;
  return (
    <ul className="divide-y divide-black/[0.05] mb-10">
      {items.map((c) => (
        <li key={c.id} className="py-3 flex items-center justify-between">
          <span className="text-neutral-900" style={{ fontSize: 13 }}>
            {c.name}
          </span>
          <button
            onClick={() => onDelete(c.id, c.name)}
            className="text-neutral-300"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function WalletCard({ wallet, onUpdate }: { wallet: Wallet; onUpdate: (w: Wallet) => void }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(wallet.active || 0));

  const handleKey = (k: string) => {
    if (k === "back") setAmount((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));
    else setAmount((a) => (a === "0" ? k.replace(/^0+/, "") || "0" : (a + k).slice(0, 14)));
  };

  const save = () => {
    onUpdate({ ...wallet, active: parseInt(amount, 10) || 0 });
    setEditing(false);
  };

  return (
    <div className="mb-12">
      <div className="text-neutral-400 tracking-[0.2em] uppercase mb-4" style={{ fontSize: 10 }}>
        Main Balance
      </div>
      <button
        onClick={() => {
          setAmount(String(wallet.active || 0));
          setEditing(true);
        }}
        className="w-full text-left p-5 rounded-2xl bg-white border border-black/[0.04]"
      >
        <div className="text-neutral-400 tracking-[0.15em] uppercase mb-2" style={{ fontSize: 9 }}>
          Available
        </div>
        <div className="text-neutral-900 tracking-tight" style={{ fontSize: 18, fontWeight: 300 }}>
          {formatIDR(wallet.active)}
        </div>
      </button>

      <AnimatePresence>
        {editing && (
          <Sheet onClose={() => setEditing(false)} title="Set main balance">
            <div className="text-center mb-6">
              <div className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
                IDR
              </div>
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

function PocketSheet({
  open,
  initial,
  mainWalletBalance,
  isInvestment,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Pocket;
  mainWalletBalance: number;
  isInvestment?: boolean;
  onClose: () => void;
  onSave: (p: Omit<Pocket, "id">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.balance) : "0");
  const canAddAmount = mainWalletBalance > 0 || !!initial;
  const isEdit = !!initial;

  const handleKey = (k: string) => {
    if (!canAddAmount) return;
    if (k === "back") setAmount((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));
    else setAmount((a) => (a === "0" ? k.replace(/^0+/, "") || "0" : (a + k).slice(0, 14)));
  };

  const save = () => {
    if (isInvestment) {
      // For investment pocket, only require amount (name is fixed)
      if (!parseInt(amount, 10)) return;
      onSave({ name: "Investment", balance: parseInt(amount, 10), isInvestment: true });
    } else {
      // For normal pocket, require both name and amount
      if (!name || !parseInt(amount, 10)) return;
      onSave({ name, balance: parseInt(amount, 10), isInvestment: false });
    }
    if (!isEdit) {
      setName("");
      setAmount("0");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Sheet onClose={onClose} title={initial ? (isInvestment ? "Transfer to Investment" : "Edit pocket") : "New pocket"}>
          {!isInvestment && (
            <div className="mb-6">
              <label className="block">
                <span className="block text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>
                  Pocket name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Grocery, Gas"
                  className="w-full bg-transparent border-b border-neutral-200 focus:border-neutral-900 outline-none pb-2 text-neutral-900 placeholder:text-neutral-400"
                  style={{ fontSize: 14 }}
                />
              </label>
            </div>
          )}

          {!canAddAmount && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-6 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-red-700 font-medium" style={{ fontSize: 12 }}>
                  Cannot add amount
                </div>
                <div className="text-red-600" style={{ fontSize: 11 }}>
                  Main Wallet balance must be greater than 0
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="text-neutral-400 tracking-[0.2em] uppercase" style={{ fontSize: 10 }}>
              Initial amount · IDR
            </div>
            <div className="text-neutral-900 tracking-tight mt-1" style={{ fontSize: 36, fontWeight: 300 }}>
              {formatIDR(parseInt(amount, 10) || 0)}
            </div>
            <div className="text-neutral-400 mt-2" style={{ fontSize: 11 }}>
              Main Wallet: {formatIDR(mainWalletBalance)}
            </div>
          </div>
          <NumberPad onInput={handleKey} />
          <PrimaryButton
            onClick={save}
            disabled={isInvestment ? !parseInt(amount, 10) || !canAddAmount : (!name || !parseInt(amount, 10) || !canAddAmount)}
          >
            {isInvestment ? "Transfer" : "Continue"}
          </PrimaryButton>
        </Sheet>
      )}
    </AnimatePresence>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/30 z-50 flex items-end"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#fafaf7] rounded-t-[28px] pt-3 pb-8 px-6"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300 mb-4" />
            <div className="mb-6">
              <div className="text-neutral-900 mb-2" style={{ fontSize: 16, fontWeight: 500 }}>
                {title}
              </div>
              <div className="text-neutral-600" style={{ fontSize: 14 }}>
                {message}
              </div>
              {itemName && (
                <div
                  className="mt-3 p-3 rounded-lg bg-neutral-100 text-neutral-900 truncate"
                  style={{ fontSize: 13 }}
                >
                  {itemName}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 h-12 rounded-full border border-neutral-300 text-neutral-900 tracking-[0.2em] uppercase"
                style={{ fontSize: 11 }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 h-12 rounded-full bg-red-600 text-white tracking-[0.2em] uppercase"
                style={{ fontSize: 11 }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConfirmPocketDialog({
  open,
  name,
  amount,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  name: string;
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/30 z-50 flex items-end"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#fafaf7] rounded-t-[28px] pt-3 pb-8 px-6"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300 mb-4" />
            <div className="mb-6">
              <div className="text-neutral-900 mb-4" style={{ fontSize: 16, fontWeight: 500 }}>
                Create new Pocket?
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4">
                <div className="text-blue-700 font-medium" style={{ fontSize: 12 }}>
                  ⓘ Note
                </div>
                <div className="text-blue-600 mt-1" style={{ fontSize: 11 }}>
                  The initial amount for Pockets will be taken from the Main Wallet
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-100">
                  <span className="text-neutral-600" style={{ fontSize: 13 }}>
                    Pocket name:
                  </span>
                  <span className="text-neutral-900 font-medium" style={{ fontSize: 13 }}>
                    {name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-100">
                  <span className="text-neutral-600" style={{ fontSize: 13 }}>
                    Amount:
                  </span>
                  <span className="text-neutral-900 font-medium" style={{ fontSize: 13 }}>
                    {formatIDR(amount)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 h-12 rounded-full border border-neutral-300 text-neutral-900 tracking-[0.2em] uppercase"
                style={{ fontSize: 11 }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 h-12 rounded-full bg-neutral-900 text-white tracking-[0.2em] uppercase"
                style={{ fontSize: 11 }}
              >
                Create
              </button>
            </div>
          </motion.div>
        </motion.div>
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
  type: "income";
  onClose: () => void;
  onSave: (c: Omit<Category, "id">) => void;
}) {
  const [name, setName] = useState("");

  const save = () => {
    if (!name) return;
    onSave({ name, type });
    setName("");
  };

  return (
    <AnimatePresence>
      {open && (
        <Sheet
          onClose={onClose}
          title="New income category"
        >
          <label className="block mb-6">
            <span className="block text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., ${type === "income" ? "Salary" : "Food"}`}
              className="w-full bg-transparent border-b border-neutral-200 focus:border-neutral-900 outline-none pb-2 text-neutral-900 placeholder:text-neutral-400"
              style={{ fontSize: 14 }}
              autoFocus
            />
          </label>
          <PrimaryButton onClick={save} disabled={!name}>
            Create category
          </PrimaryButton>
        </Sheet>
      )}
    </AnimatePresence>
  );
}

function Sheet({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-black/20 z-40"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 z-50 bg-[#fafaf7] rounded-t-[28px] pt-3 pb-8 px-6"
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300 mb-4" />
        <div className="flex items-center justify-between mb-6">
          <span className="tracking-[0.2em] uppercase text-neutral-500" style={{ fontSize: 10 }}>
            {title}
          </span>
          <button onClick={onClose} className="text-neutral-400">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 rounded-full bg-neutral-900 text-white tracking-[0.2em] uppercase flex items-center justify-center disabled:opacity-50"
      style={{ fontSize: 11 }}
    >
      {children}
    </button>
  );
}
