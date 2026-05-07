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
    let query = imageQuery.trim() || null;
    if (!query && (keys.geminiKey || keys.groqKey) && headline) {
      query = await gemini(
        "Write a 5-8 word Google Images query for the best real photograph for this consumer story. If it is a restaurant/store/theater deal, search for a real storefront, exterior, drive-thru, entrance, marquee, or building sign photo. If it is a recall/safety warning about a physical product, search for the exact product/package photo. Do not search for logos, menus, coupons, screenshots, social posts, or generic brand images. Return only the query.",
        `Brand: ${brand}\nHeadline: ${headline}\nTitle: ${title}\nSummary: ${summary}`,
        keys,
        { maxTokens: 32 },
      ).catch(() => null);
    }
    const images = await searchImagesForBrand(brand, process.env, { aiQuery: query, headline, title, summary, sourceUrl });
    res.status(200).json(images);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
