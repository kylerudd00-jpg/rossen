import { fetchStories, searchImages } from "../pipeline/lib/storyPipeline.mjs";

export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/images") {
    const q = url.searchParams.get("q") || "";
    if (!q) { res.status(200).json([]); return; }
    try {
      res.status(200).json(await searchImages(q));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  // /api/stories
  try {
    res.status(200).json(await fetchStories());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
