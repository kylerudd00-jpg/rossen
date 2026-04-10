import { fetchStories } from "../pipeline/lib/storyPipeline.mjs";

export default async function handler(req, res) {
  try {
    res.status(200).json(await fetchStories());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
