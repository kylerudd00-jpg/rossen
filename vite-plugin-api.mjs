import { readFileSync } from "fs";
import { join } from "path";
import { fetchStories, writeHeadline } from "./pipeline/lib/storyPipeline.mjs";
import { searchImagesForBrand } from "./pipeline/lib/imageSearch.mjs";
import { gemini } from "./pipeline/lib/gemini.mjs";
import { writeOpenAIHeadline } from "./pipeline/lib/openaiResearch.mjs";
import segmentsHandler from "./api/segments.js";

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
          const force = url.searchParams.get("force") === "1";
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
          try {
            const stories = await fetchStories((message, percent) => {
              send({ type: "progress", message, percent });
            }, { force });
            send({ type: "done", stories });
          } catch (e) {
            send({ type: "error", message: e.message });
          }
          res.end();
          return;
        }

        if (url.pathname === "/api/segments") {
          try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const raw = Buffer.concat(chunks).toString();
            req.body = raw ? JSON.parse(raw) : {};
          } catch (e) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e.message }));
            return;
          }

          await segmentsHandler(req, res);
          return;
        }

        if (url.pathname === "/api/images") {
          const brand    = url.searchParams.get("q") || "";
          const headline = url.searchParams.get("headline") || "";
          const title    = url.searchParams.get("title") || "";
          const summary  = url.searchParams.get("summary") || "";
          const imageQuery = url.searchParams.get("imageQuery") || "";
          const sourceUrl = url.searchParams.get("sourceUrl") || "";
          if (!brand) { res.setHeader("Content-Type", "application/json"); res.end("[]"); return; }
          try {
            let aiQuery = imageQuery.trim() || null;
            const keys = { geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
            if (!aiQuery && (keys.geminiKey || keys.groqKey) && headline) {
              aiQuery = await gemini(
                "Write a 5-8 word Google Images query for the best real photograph for this consumer story. If it is a restaurant/store/theater deal, search for a real storefront, exterior, drive-thru, entrance, marquee, or building sign photo. If it is a recall/safety warning about a physical product, search for the exact product/package photo. Do not search for logos, menus, coupons, screenshots, social posts, or generic brand images. Return only the query.",
                `Brand: ${brand}\nHeadline: ${headline}\nTitle: ${title}\nSummary: ${summary}`,
                keys,
                { maxTokens: 32 },
              ).catch(() => null);
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(await searchImagesForBrand(brand, process.env, { aiQuery, headline, title, summary, sourceUrl })));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        if (url.pathname === "/api/headline") {
          const keys = { openaiKey: process.env.OPENAI_API_KEY, geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
          if (!keys.openaiKey && !keys.geminiKey && !keys.groqKey) { res.statusCode = 503; res.end(JSON.stringify({ error: "No AI API key configured" })); return; }
          try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { brand, title, summary } = body;
            if (!title) { res.statusCode = 400; res.end(JSON.stringify({ error: "title required" })); return; }
            const candidate = { brand: brand || "RETAIL", title, rawSummary: summary || title };
            const result = keys.openaiKey
              ? await writeOpenAIHeadline(candidate, process.env).catch((e) => {
                if (!keys.geminiKey && !keys.groqKey) throw e;
                return writeHeadline(candidate, keys);
              })
              : await writeHeadline(candidate, keys);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        if (url.pathname === "/api/proxy") {
          const PRIVATE_RE = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|::1|0\.0\.0\.0)$/i;
          const MAX_BYTES = 10 * 1024 * 1024;
          const raw = url.searchParams.get("url");
          if (!raw) { res.statusCode = 400; res.end(JSON.stringify({ error: "missing url param" })); return; }
          let parsed;
          try { parsed = new URL(raw); } catch { res.statusCode = 400; res.end(JSON.stringify({ error: "invalid URL" })); return; }
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") { res.statusCode = 400; res.end(JSON.stringify({ error: "non-http scheme" })); return; }
          if (PRIVATE_RE.test(parsed.hostname)) { res.statusCode = 400; res.end(JSON.stringify({ error: "private hostname" })); return; }
          try {
            const upstream = await fetch(raw, {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(10000),
            });
            if (!upstream.ok) { res.statusCode = 502; res.end(); return; }
            const contentType = upstream.headers.get("content-type") || "";
            if (!contentType.startsWith("image/")) {
              upstream.body?.cancel();
              res.statusCode = 415;
              res.end(JSON.stringify({ error: "upstream is not an image" }));
              return;
            }
            const chunks = [];
            let total = 0;
            for await (const chunk of upstream.body) {
              total += chunk.length;
              if (total > MAX_BYTES) { res.statusCode = 502; res.end(JSON.stringify({ error: "upstream too large" })); return; }
              chunks.push(chunk);
            }
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=3600");
            res.end(Buffer.concat(chunks));
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
