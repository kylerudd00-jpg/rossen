import { searchImagesForBrand } from "../pipeline/lib/imageSearch.mjs";

async function generateImageQuery(brand, headline, apiKey) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 32,
      messages: [
        {
          role: "system",
          content: `Write a 4-6 word Google Images search query to find a real exterior photo of the brand in this story. Be specific enough to avoid ambiguity — include the brand type (restaurant, retail store, pharmacy, etc.) if the name could be confused with something else. Return only the search query, no quotes, no explanation.`,
        },
        {
          role: "user",
          content: `Brand: ${brand}\nHeadline: ${headline}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const brand    = params.get("q") || "";
  const headline = params.get("headline") || "";
  if (!brand) return res.status(200).json([]);

  try {
    const groqKey = process.env.GROQ_API_KEY;
    let query = null;
    if (groqKey && headline) {
      query = await generateImageQuery(brand, headline, groqKey).catch(() => null);
    }
    const images = await searchImagesForBrand(brand, process.env, query);
    res.status(200).json(images);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
