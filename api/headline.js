import { writeHeadline } from "../pipeline/lib/storyPipeline.mjs";
import { writeOpenAIHeadline } from "../pipeline/lib/openaiResearch.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  const keys = { openaiKey: process.env.OPENAI_API_KEY, geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
  if (!keys.openaiKey && !keys.geminiKey && !keys.groqKey) { res.status(503).json({ error: "No AI API key configured" }); return; }
  try {
    const { brand, title, summary } = req.body || {};
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const candidate = { brand: brand || "RETAIL", title, rawSummary: summary || title };
    const result = keys.openaiKey
      ? await writeOpenAIHeadline(candidate, process.env).catch((e) => {
        if (!keys.geminiKey && !keys.groqKey) throw e;
        return writeHeadline(candidate, keys);
      })
      : await writeHeadline(candidate, keys);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
