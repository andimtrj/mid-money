import { motion } from "motion/react";
import { Delete } from "lucide-react";

export function NumberPad({
  onInput,
  disabled = false,
}: {
  onInput: (key: string) => void;
  disabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-1">
      {keys.map((k) => (
        <motion.button
          key={k}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          onClick={() => onInput(k)}
          disabled={disabled}
          className="h-14 rounded-2xl flex items-center justify-center text-neutral-900 active:bg-neutral-100"
          style={{ fontSize: k === "000" ? 20 : 24, fontWeight: 300, opacity: disabled ? 0.35 : 1 }}
        >
          {k === "back" ? <Delete size={20} strokeWidth={1.5} /> : k}
        </motion.button>
      ))}
    </div>
  );
}
