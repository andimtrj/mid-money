import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { AuthScreen } from "./components/AuthScreen";
import { HomeScreen } from "./components/HomeScreen";
import { BudgetScreen } from "./components/BudgetScreen";
import { AnalyticsScreen } from "./components/AnalyticsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { AllTransactionsScreen } from "./components/AllTransactionsScreen";
import { BottomNav } from "./components/BottomNav";
import { TransactionSheet } from "./components/TransactionSheet";
import { AppStateProvider, useAppState } from "./AppState";

export const appRoutes = [
  { path: "/", element: <LoginRoute /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: "home", element: <HomeRoute /> },
      { path: "budget", element: <BudgetRoute /> },
      { path: "analytics", element: <AnalyticsRoute /> },
      { path: "profile", element: <ProfileRoute /> },
      { path: "transactions", element: <AllTransactionsRoute /> },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

function LoginRoute() {
  const { session, authReady, signIn, signUp, authLoading, authError } = useAppState();

  if (authReady && session) {
    return <Navigate to="/app/home" replace />;
  }

  if (!authReady) {
    return <AuthShell><LoadingAuthMessage /></AuthShell>;
  }

  return (
    <AuthShell>
      <AuthScreen
        onLogin={signIn}
        onRegister={signUp}
        loading={authLoading}
        error={authError}
      />
    </AuthShell>
  );
}

function AppLayout() {
  const { session, authReady } = useAppState();

  if (!authReady) {
    return <AuthShell><LoadingAuthMessage /></AuthShell>;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthShell>
      <Outlet />
      <TransactionSheetOutlet />
      <BottomNavOutlet />
    </AuthShell>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="size-full flex items-center justify-center bg-neutral-100 p-4">
      <div className="relative w-full max-w-[420px] aspect-[9/19.5] max-h-[900px] bg-[#fafaf7] rounded-[44px] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] border border-black/5">
        {children}
      </div>
    </div>
  );
}

function LoadingAuthMessage() {
  return (
    <div className="h-full w-full flex items-center justify-center px-8 text-center text-neutral-500" style={{ fontSize: 13 }}>
      Checking your session...
    </div>
  );
}

function TransactionSheetOutlet() {
  const { addOpen, setAddOpen, categories, pockets, addTransaction, addCategory } = useAppState();

  return (
    <TransactionSheet
      open={addOpen}
      onClose={() => setAddOpen(false)}
      onSave={addTransaction}
      onAddCategory={addCategory}
      categories={categories}
      pockets={pockets}
    />
  );
}

function BottomNavOutlet() {
  const navigate = useNavigate();
  const location = useLocation();

  const active =
    location.pathname.startsWith("/app/budget")
      ? "budget"
      : location.pathname.startsWith("/app/analytics")
      ? "analytics"
      : location.pathname.startsWith("/app/profile")
      ? "profile"
      : "home";

  return <BottomNav active={active} onChange={(tab) => navigate(`/app/${tab}`)} />;
}

function HomeRoute() {
  const { name, wallet, transactions, pockets, setAddOpen } = useAppState();
  const navigate = useNavigate();

  return (
    <HomeScreen
      name={name ?? "friend"}
      wallet={wallet}
      transactions={transactions}
      pockets={pockets}
      onAdd={() => setAddOpen(true)}
      onSeeAll={() => navigate("/app/transactions")}
    />
  );
}

function BudgetRoute() {
  const {
    categories,
    wallet,
    pockets,
    addCategory,
    deleteCategory,
    setWallet,
    addPocket,
    updatePocket,
    deletePocket,
  } = useAppState();

  return (
    <BudgetScreen
      categories={categories}
      wallet={wallet}
      pockets={pockets}
      onAddCategory={addCategory}
      onDeleteCategory={deleteCategory}
      onUpdateWallet={setWallet}
      onAddPocket={addPocket}
      onUpdatePocket={updatePocket}
      onDeletePocket={deletePocket}
    />
  );
}

function AnalyticsRoute() {
  const { pockets, transactions } = useAppState();
  return <AnalyticsScreen pockets={pockets} transactions={transactions} />;
}

function ProfileRoute() {
  const { name, signOut } = useAppState();
  const navigate = useNavigate();

  return (
    <ProfileScreen
      name={name ?? "friend"}
      onLogout={async () => {
        await signOut();
        navigate("/", { replace: true });
      }}
    />
  );
}

function AllTransactionsRoute() {
  const { transactions, pockets, updateTransaction, deleteTransaction } = useAppState();
  const navigate = useNavigate();

  return (
    <AllTransactionsScreen
      transactions={transactions}
      pockets={pockets}
      onClose={() => navigate("/app/home")}
      onUpdate={updateTransaction}
      onDelete={deleteTransaction}
    />
  );
}
