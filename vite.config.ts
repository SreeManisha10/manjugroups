// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const APP_BASE_PATH = "/manjugroups/";
const APP_BASE_PREFIX = APP_BASE_PATH.slice(0, -1);

export default defineConfig({
  plugins: [
    {
      name: "redirect-root-to-app-base-path",
      enforce: "pre",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url === "/") {
            response.statusCode = 302;
            response.setHeader("Location", APP_BASE_PATH);
            response.end();
            return;
          }
          if (request.url?.startsWith(APP_BASE_PREFIX)) {
            const rewrittenUrl = request.url.slice(APP_BASE_PREFIX.length) || "/";
            request.url = rewrittenUrl;
            Object.assign(request, { originalUrl: rewrittenUrl });
          }
          next();
        });
      },
    },
  ],
  vite: {
    base: "./",
    server: {
      open: APP_BASE_PATH,
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from thisOk
    server: { entry: "server" },
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/_shell.html",
      },
    },
  },
});
