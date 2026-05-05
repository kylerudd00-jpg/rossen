import { searchImagesForBrand } from "../pipeline/lib/imageSearch.mjs";
import { gemini } from "../pipeline/lib/gemini.mjs";

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const brand    = params.get("q") || "";
  const headline = params.get("headline") || "";
  const title    = params.get("title") || "";
  const summary  = params.get("summary") || "";
  if (!brand) return res.status(200).json([]);

  try {
    const keys = { geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
    let query = null;
    if ((keys.geminiKey || keys.groqKey) && headline) {
      query = await gemini(
        "Write a 5-8 word Google Images query for a real exterior/streetfront photograph of the physical business in this story. Prefer storefront, restaurant exterior, drive-thru, entrance, or building sign photos. Do not search for logos, menus, products, coupons, screenshots, or generic brand images. Return only the query.",
        `Brand: ${brand}\nHeadline: ${headline}\nTitle: ${title}\nSummary: ${summary}`,
        keys,
        { maxTokens: 32 },
      ).catch(() => null);
    }
    const images = await searchImagesForBrand(brand, process.env, { aiQuery: query, headline, title, summary });
    res.status(200).json(images);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
