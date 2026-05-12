import { gemini } from "../pipeline/lib/gemini.mjs";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env relative to this file's directory (works in worktrees and on Vercel)
try {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const content = readFileSync(join(root, ".env"), "utf8");
  for (const line of content.split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 1 || line.trim().startsWith("#")) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {
  // .env is optional in Vercel and local test environments.
}

// Try food → beauty → general products → pet food in order
const OFF_BASES = [
  "https://world.openfoodfacts.org/api/v2/product",
  "https://world.openbeautyfacts.org/api/v2/product",
  "https://world.openproductsfacts.org/api/v2/product",
  "https://world.openpetfoodfacts.org/api/v2/product",
];
const FIELDS = "product_name,product_name_en,brands,image_url,image_front_url,quantity,categories_tags";

async function lookupProduct(upc) {
  for (const base of OFF_BASES) {
    try {
      const res = await fetch(`${base}/${upc}?fields=${FIELDS}`, {
        headers: { "User-Agent": "RossenReports/1.0 (contact@rossenreports.com)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== 1) continue;
      const p = data.product;
      const name = p.product_name_en || p.product_name || "";
      if (!name) continue;
      return {
        name,
        brand: p.brands || "",
        imageUrl: p.image_front_url || p.image_url || "",
        quantity: p.quantity || "",
        categories: (p.categories_tags || [])
          .filter(t => t.startsWith("en:"))
          .map(t => t.replace("en:", "").replace(/-/g, " "))
          .slice(0, 3),
      };
    } catch {}
  }
  return null;
}

async function estimatePrices(product, keys) {
  const productDesc = `${product.brand} ${product.name}${product.quantity ? ` (${product.quantity})` : ""}`.trim();

  const raw = await gemini(
    `You are a consumer price expert. Based on your knowledge of US grocery store pricing, estimate the typical retail prices for this product at major chains (Walmart, Kroger, Target, Costco if applicable).

Return a JSON object (no markdown, no explanation) with this exact shape:
{"prices":[{"store":"Walmart","price":3.98},{"store":"Kroger","price":4.29},{"store":"Target","price":4.49}],"avgPrice":4.25,"verdict":"fair price","verdictReason":"Typical retail price range for this product"}

Verdict must be one of: "great deal" | "fair price" | "overpriced" | "unknown"
If you don't have reliable price knowledge for this product, set verdict to "unknown" and prices to [].
Return valid JSON only.`,
    `Product: ${productDesc}`,
    keys,
    { maxTokens: 400, temperature: 0 }
  );

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const upc = params.get("upc")?.replace(/\D/g, "");

  const json = (statusCode, data) => {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };

  if (!upc) return json(400, { error: "Missing upc" });

  const env = process.env;
  const keys = { geminiKey: env.GEMINI_API_KEY, groqKey: env.GROQ_API_KEY };

  const product = await lookupProduct(upc).catch(() => null);
  if (!product || !product.name) {
    return json(404, { error: "Product not found. Try entering the name manually." });
  }

  let prices = [];
  let avgPrice = null;
  let verdict = { label: "unknown", reason: "Price data not available." };

  if (keys.geminiKey || keys.groqKey) {
    try {
      const parsed = await estimatePrices(product, keys);
      prices = parsed.prices || [];
      avgPrice = parsed.avgPrice || null;
      verdict = { label: parsed.verdict || "unknown", reason: parsed.verdictReason || "" };
    } catch (e) {
      console.warn("[barcode] price estimation failed:", e.message);
    }
  }

  json(200, { product, prices, avgPrice, verdict });
}
