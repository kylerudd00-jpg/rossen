import { readFileSync } from "fs";
import { join } from "path";
import { fetchStories } from "./pipeline/lib/storyPipeline.mjs";
import { searchImagesForBrand } from "./pipeline/lib/imageSearch.mjs";

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
          const brand    = url.searchParams.get("q") || "";
          const headline = url.searchParams.get("headline") || "";
          if (!brand) { res.setHeader("Content-Type", "application/json"); res.end("[]"); return; }
          try {
            let aiQuery = null;
            const groqKey = process.env.GROQ_API_KEY;
            if (groqKey && headline) {
              const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "content-type": "application/json", "authorization": `Bearer ${groqKey}` },
                body: JSON.stringify({
                  model: "llama-3.3-70b-versatile",
                  temperature: 0,
                  max_tokens: 32,
                  messages: [
                    { role: "system", content: "Write a 4-6 word Google Images search query to find a real exterior photo of the brand in this story. Be specific enough to avoid ambiguity — include the brand type (restaurant, retail store, pharmacy, etc.) if the name could be confused with something else. Return only the search query, no quotes, no explanation." },
                    { role: "user", content: `Brand: ${brand}\nHeadline: ${headline}` },
                  ],
                }),
                signal: AbortSignal.timeout(8000),
              });
              if (r.ok) {
                const d = await r.json();
                aiQuery = d.choices?.[0]?.message?.content?.trim() || null;
              }
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(await searchImagesForBrand(brand, process.env, aiQuery)));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        if (url.pathname === "/api/proxy") {
          const imageUrl = url.searchParams.get("url");
          if (!imageUrl) { res.statusCode = 400; res.end(); return; }
          try {
            const upstream = await fetch(imageUrl, {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(10000),
            });
            if (!upstream.ok) { res.statusCode = upstream.status; res.end(); return; }
            const contentType = upstream.headers.get("content-type") || "image/jpeg";
            const buffer = await upstream.arrayBuffer();
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=3600");
            res.end(Buffer.from(buffer));
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
