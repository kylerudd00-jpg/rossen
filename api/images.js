import { searchImages } from "../pipeline/lib/storyPipeline.mjs";

export default async function handler(req, res) {
  const q = new URL(req.url, "http://localhost").searchParams.get("q") || "";
  if (!q) { res.status(200).json([]); return; }
  try {
    res.status(200).json(await searchImages(q));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
