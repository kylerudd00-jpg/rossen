import { gemini } from "../pipeline/lib/gemini.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { brand, headline, summary } = req.body || {};
  if (!brand || !headline) return res.status(400).json({ error: "Missing fields" });

  const keys = { geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
  try {
    const raw = await gemini(
      `Write an Instagram caption for a Jeff Rossen consumer news post.
Format: 2-3 short punchy sentences, then a blank line, then 5-8 hashtags on one line.
Rules:
- Open with a hook that creates urgency or saves money
- Name the brand in the first or second sentence
- End with a clear call to action (save this, share with a friend, etc.)
- Hashtags: mix of brand-specific, consumer savings, and news hashtags
- No emojis
- Max 180 words`,
      `Brand: ${brand}\nHeadline: ${headline}\nContext: ${summary || ""}`,
      keys,
      { maxTokens: 240 },
    );
    res.status(200).json({ caption: raw.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
