import { searchImagesForBrand } from "../pipeline/lib/imageSearch.mjs";
import { gemini } from "../pipeline/lib/gemini.mjs";

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const brand    = params.get("q") || "";
  const headline = params.get("headline") || "";
  const title    = params.get("title") || "";
  const summary  = params.get("summary") || "";
  const imageQuery = params.get("imageQuery") || "";
  const sourceUrl = params.get("sourceUrl") || "";
  if (!brand) return res.status(200).json([]);

  try {
    const keys = { geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
    let aiQueries = imageQuery.trim() ? [imageQuery.trim()] : [];
    if (aiQueries.length === 0 && (keys.geminiKey || keys.groqKey) && headline) {
      const raw = await gemini(
        `You are picking background photos for a Jeff Rossen consumer news Instagram post.
Write exactly 2 image search queries — one per line, no numbering, no explanation.
Query 1: a vivid real-world photo that matches the story setting (storefront exterior, drive-thru lane, store aisle, product on shelf, or building entrance).
Query 2: a close-up or alternate angle of the same subject.
Rules:
- Name the exact brand or product in each query
- Prefer "exterior", "storefront", "store front", "entrance", "aisle", "product photo"
- Avoid logo, icon, menu, coupon, screenshot, cartoon, vector
- 5-9 words each query`,
        `Brand: ${brand}\nHeadline: ${headline}\nTitle: ${title}\nSummary: ${summary}`,
        keys,
        { maxTokens: 48 },
      ).catch(() => null);
      if (raw) {
        aiQueries = raw.split(/\n+/).map((q) => q.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean).slice(0, 2);
      }
    }
    const images = await searchImagesForBrand(brand, process.env, { aiQuery: aiQueries[0] || null, aiQuery2: aiQueries[1] || null, headline, title, summary, sourceUrl });
    res.status(200).json(images);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
