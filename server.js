import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { readFile } from "node:fs/promises";
import { createServer as createViteServer } from "vite";

const preferredPort = Number(process.env.PORT ?? 5173);

async function findOpenPort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const isFree = await new Promise((resolve) => {
      const tester = createNetServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port);
    });

    if (isFree) return port;
  }

  return startPort;
}

async function start() {
  const port = await findOpenPort(preferredPort);
  const hmrPort = await findOpenPort(port + 1000);
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        port: hmrPort,
        clientPort: hmrPort,
        overlay: false,
      },
    },
    appType: "custom",
  });

  const template = await readFile("index.html", "utf-8");

  const server = createServer(async (req, res) => {
    vite.middlewares(req, res, async () => {
      try {
        const url = req.url ?? "/";

        const request = new Request(`http://${req.headers.host}${url}`, {
          method: req.method,
          headers: req.headers,
        });

        const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
        const result = await render(request);

        if (result instanceof Response) {
          res.statusCode = result.status;
          result.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await result.text());
          return;
        }

        const html = await vite.transformIndexHtml(url, template);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.end(html.replace("<!--app-html-->", result));
      } catch (error) {
        vite.ssrFixStacktrace(error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        res.end(String(error));
      }
    });
  });

  server.listen(port, () => {
    console.log(`SSR dev server running at http://localhost:${port}`);
  });
}

start();
