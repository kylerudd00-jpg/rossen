import { readFileSync } from "fs";
import { join } from "path";
import { fetchStories, searchImages } from "./pipeline/lib/storyPipeline.mjs";

// Vite doesn't push .env into process.env for plugins — load it manually
function loadDotEnv() {
  try {
    const content = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadDotEnv();

export function apiPlugin() {
  return {
    name: "deal-pipeline-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://localhost");

        if (url.pathname === "/api/stories") {
          try {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(await fetchStories()));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        if (url.pathname === "/api/images") {
          const q = url.searchParams.get("q") || "";
          if (!q) { res.setHeader("Content-Type", "application/json"); res.end("[]"); return; }
          try {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(await searchImages(q)));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        next();
      });
    },
  };
}
