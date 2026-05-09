import { gemini } from "../pipeline/lib/gemini.mjs";

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";

async function lookupProduct(upc) {
  const res = await fetch(`${OFF_BASE}/${upc}?fields=product_name,product_name_en,brands,image_url,image_front_url,quantity,categories_tags`, {
    headers: { "User-Agent": "RossenReports/1.0 (contact@rossenreports.com)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1) return null;
  const p = data.product;
  return {
    name: p.product_name_en || p.product_name || "",
    brand: p.brands || "",
    imageUrl: p.image_front_url || p.image_url || "",
    quantity: p.quantity || "",
    categories: (p.categories_tags || [])
      .filter(t => t.startsWith("en:"))
      .map(t => t.replace("en:", "").replace(/-/g, " "))
      .slice(0, 3),
  };
}

async function searchPrices(product, tavilyKey) {
  const query = `${product.brand} ${product.name} ${product.quantity} grocery price store 2026`.trim();
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: tavilyKey,
      query,
      search_depth: "basic",
      max_results: 8,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

async function synthesizePrices(product, searchResults, keys) {
  const snippets = searchResults
    .map(r => `${r.title}\n${r.content}`)
    .join("\n\n---\n\n");

  const userContent = `Product: ${product.brand} ${product.name} (${product.quantity})\n\nSearch results:\n${snippets}`;

  const raw = await gemini(
    `You are a consumer price analyst. Extract grocery store prices for this product from the search results.

Return a JSON object (no markdown) with this exact shape:
{
  "prices": [
    {"store": "Kroger", "price": 3.99, "unit": "12 oz", "note": "sale through 5/15"},
    ...
  ],
  "avgPrice": 4.29,
  "verdict": "great deal" | "fair price" | "overpriced" | "unknown",
  "verdictReason": "one short sentence"
}

Rules:
- Only include prices you can clearly extract from the text. Skip guesses.
- "note" is optional (only if there's a sale end date or condition).
- If fewer than 2 prices found, set verdict to "unknown" and verdictReason to "Not enough price data found."
- avgPrice = average of found prices (or null if unknown).
- Return valid JSON only, no explanation.`,
    userContent,
    keys,
    { maxTokens: 512 }
  );

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const upc = params.get("upc")?.replace(/\D/g, "");

  if (!upc) return res.status(400).json({ error: "Missing upc" });

  const env = process.env;
  const keys = { geminiKey: env.GEMINI_API_KEY, groqKey: env.GROQ_API_KEY };
  const tavilyKey = env.TAVILY_API_KEY;

  const product = await lookupProduct(upc).catch(() => null);
  if (!product || !product.name) {
    return res.status(404).json({ error: "Product not found. Try entering the name manually." });
  }

  let prices = [];
  let avgPrice = null;
  let verdict = { label: "unknown", reason: "Price search unavailable." };

  if (tavilyKey) {
    try {
      const results = await searchPrices(product, tavilyKey);
      if (results.length > 0 && (keys.geminiKey || keys.groqKey)) {
        const parsed = await synthesizePrices(product, results, keys);
        prices = parsed.prices || [];
        avgPrice = parsed.avgPrice || null;
        verdict = { label: parsed.verdict || "unknown", reason: parsed.verdictReason || "" };
      }
    } catch (e) {
      console.warn("[barcode] price synthesis failed:", e.message);
    }
  }

  res.json({ product, prices, avgPrice, verdict });
}
