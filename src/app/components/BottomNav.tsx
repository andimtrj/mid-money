import { Home, Wallet, BarChart3, User } from "lucide-react";

type Tab = "home" | "budget" | "analytics" | "profile";

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const items: { key: Tab; label: string; Icon: typeof Home }[] = [
    { key: "home", label: "Home", Icon: Home },
    { key: "budget", label: "Budget", Icon: Wallet },
    { key: "analytics", label: "Analytics", Icon: BarChart3 },
    { key: "profile", label: "Profile", Icon: User },
  ];
  return (
    <nav className="absolute bottom-0 left-0 right-0 border-t border-black/5 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center justify-around px-4 py-3 pb-6">
        {items.map(({ key, label, Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className="flex flex-col items-center gap-1 px-3 py-1 transition-opacity"
              style={{ opacity: isActive ? 1 : 0.35 }}
            >
              <Icon size={20} strokeWidth={1.5} className="text-neutral-900" />
              <span className="text-[10px] tracking-[0.15em] uppercase text-neutral-900">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
