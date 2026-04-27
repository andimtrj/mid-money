import { useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

export function ProfileScreen({ name, onLogout }: { name: string; onLogout: () => void | Promise<void> }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  const canSave = current && next && next === confirm;

  const save = () => {
    if (!canSave) return;
    setSaved(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="h-full w-full bg-[#fafaf7] overflow-y-auto pb-32">
      <div className="px-8 pt-16">
        <div className="w-8 h-[2px] bg-neutral-900 mb-6" />
        <h1 className="tracking-[-0.02em] text-neutral-900 mb-2" style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 300 }}>
          {name}
        </h1>
        <p className="text-neutral-500 mb-12" style={{ fontSize: 13 }}>Account & settings</p>

        <div className="mb-10">
          <div className="text-neutral-400 tracking-[0.2em] uppercase mb-5" style={{ fontSize: 10 }}>
            Change password
          </div>
          <div className="flex flex-col gap-6">
            <Field label="Current password" value={current} onChange={setCurrent} />
            <Field label="New password" value={next} onChange={setNext} />
            <Field label="Confirm new password" value={confirm} onChange={setConfirm} />
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={save}
            disabled={!canSave}
            className="mt-8 w-full h-14 rounded-full bg-neutral-900 text-white tracking-[0.2em] uppercase disabled:opacity-30 flex items-center justify-center gap-2"
            style={{ fontSize: 11 }}
          >
            {saved ? (
              <>
                <Check size={16} strokeWidth={1.5} /> Saved
              </>
            ) : (
              "Update password"
            )}
          </motion.button>
        </div>

        <button
          onClick={onLogout}
          className="w-full h-14 rounded-full border border-neutral-900/10 text-neutral-900 tracking-[0.2em] uppercase"
          style={{ fontSize: 11 }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-neutral-300 focus:border-neutral-900 outline-none pb-2 text-neutral-900 transition-colors"
        style={{ fontSize: 16 }}
      />
    </label>
  );
}
