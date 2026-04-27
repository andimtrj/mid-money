import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AuthInvalidCredentialsModal } from "./AuthInvalidCredentialsModal";

export function AuthScreen({
  onLogin,
  onRegister,
  loading,
  error,
}: {
  onLogin: (params: { email: string; password: string }) => Promise<void>;
  onRegister: (params: {
    email: string;
    username: string;
    password: string;
  }) => Promise<{ needsConfirmation: boolean }>;
  loading?: boolean;
  error?: string | null;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [showInvalidCredentialsModal, setShowInvalidCredentialsModal] = useState(false);

  const invalidCredentialsMessage = useMemo(() => {
    if (!error) return null;
    const normalized = error.toLowerCase();
    const matchesInvalidCredentials =
      normalized.includes("invalid login credentials") ||
      normalized.includes("invalid credentials") ||
      normalized.includes("user already registered") ||
      normalized.includes("already registered");

    if (!matchesInvalidCredentials) return null;

    return normalized.includes("already registered")
      ? "This email is already registered. Sign in instead or use another email."
      : "The email or password is incorrect. Please try again.";
  }, [error]);

  useEffect(() => {
    if (invalidCredentialsMessage) {
      setShowInvalidCredentialsModal(true);
    }
  }, [invalidCredentialsMessage]);

  const canSubmit = Boolean(
    mode === "login"
      ? email && password
      : email && username && password && password === confirm,
  );

  const inlineError = error && !invalidCredentialsMessage ? error : null;

  const submit = async () => {
    if (!canSubmit || loading) return;
    setNotice(null);
    if (mode === "login") {
      await onLogin({ email, password });
      return;
    }

    const result = await onRegister({ email, username, password });
    if (result.needsConfirmation) {
      setNotice("Check your email to confirm your account before signing in.");
    }
  };

  return (
    <div className="relative h-full w-full bg-[#fafaf7] px-8 pt-24 pb-10 flex flex-col">
      <div className="mb-16">
        <div className="w-8 h-[2px] bg-neutral-900 mb-6" />
        <h1 className="tracking-[-0.02em] text-neutral-900" style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 300 }}>
          {mode === "login" ? "Welcome\nback." : "Create\naccount."}
        </h1>
        <p className="mt-4 text-neutral-500 tracking-wide" style={{ fontSize: 13 }}>
          {mode === "login" ? "Sign in to continue tracking." : "A quieter way to manage money."}
        </p>
        {(notice || inlineError) && (
          <p
            className={`mt-4 tracking-wide ${inlineError ? "text-red-600" : "text-neutral-500"}`}
            style={{ fontSize: 12 }}
          >
            {inlineError ?? notice}
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            {mode === "register" && <Field label="Username" value={username} onChange={setUsername} />}
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            {mode === "register" && (
              <Field label="Confirm password" value={confirm} onChange={setConfirm} type="password" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-10 flex flex-col gap-5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={submit}
          disabled={!canSubmit || loading}
          className="w-full h-14 rounded-full bg-neutral-900 text-white tracking-[0.2em] uppercase disabled:opacity-30 transition-opacity"
          style={{ fontSize: 11 }}
        >
          {loading ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}
        </motion.button>
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="text-center text-neutral-500 tracking-wide"
          style={{ fontSize: 12 }}
        >
          {mode === "login" ? "No account yet? " : "Already have an account? "}
          <span className="text-neutral-900 underline underline-offset-4">
            {mode === "login" ? "Register" : "Sign in"}
          </span>
        </button>
      </div>

      <AuthInvalidCredentialsModal
        open={showInvalidCredentialsModal}
        onOpenChange={setShowInvalidCredentialsModal}
        description={invalidCredentialsMessage ?? undefined}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-neutral-400 tracking-[0.2em] uppercase mb-2" style={{ fontSize: 10 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-neutral-300 focus:border-neutral-900 outline-none pb-2 text-neutral-900 transition-colors"
        style={{ fontSize: 16 }}
      />
    </label>
  );
}
