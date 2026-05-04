import { searchImagesForBrand } from "../pipeline/lib/imageSearch.mjs";
import { gemini } from "../pipeline/lib/gemini.mjs";

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const brand    = params.get("q") || "";
  const headline = params.get("headline") || "";
  if (!brand) return res.status(200).json([]);

  try {
    const keys = { geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
    let query = null;
    if ((keys.geminiKey || keys.groqKey) && headline) {
      query = await gemini(
        "Write a 4-6 word Google Images search query to find a real exterior photo of the brand in this story. Be specific enough to avoid ambiguity — include the brand type (restaurant, retail store, pharmacy, etc.) if the name could be confused with something else. Return only the search query, no quotes, no explanation.",
        `Brand: ${brand}\nHeadline: ${headline}`,
        keys,
        { maxTokens: 32 },
      ).catch(() => null);
    }
    const images = await searchImagesForBrand(brand, process.env, query);
    res.status(200).json(images);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
