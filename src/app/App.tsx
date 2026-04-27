import type { ReactNode } from "react";
import { AppStateProvider } from "./AppState";

export default function App({ children }: { children?: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}
