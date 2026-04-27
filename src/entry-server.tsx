import { renderToString } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router";
import { AppShell, appRoutes } from "./app/router";

export async function render(request: Request) {
  const handler = createStaticHandler(appRoutes);
  const context = await handler.query(request);

  if (context instanceof Response) {
    return context;
  }

  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(
    <AppShell>
      <StaticRouterProvider router={router} context={context} />
    </AppShell>
  );
}
