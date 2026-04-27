import { hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { AppShell, appRoutes } from "./app/router";
import "./styles/index.css";

const router = createBrowserRouter(appRoutes);

hydrateRoot(
  document.getElementById("root")!,
  <AppShell>
    <RouterProvider router={router} />
  </AppShell>
);
