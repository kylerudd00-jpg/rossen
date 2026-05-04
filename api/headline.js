import { writeHeadline } from "../pipeline/lib/storyPipeline.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  const keys = { geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
  if (!keys.geminiKey && !keys.groqKey) { res.status(503).json({ error: "No AI API key configured" }); return; }
  try {
    const { brand, title, summary } = req.body || {};
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const headline = await writeHeadline(
      { brand: brand || "RETAIL", title, rawSummary: summary || title },
      keys,
    );
    res.status(200).json({ headline });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
