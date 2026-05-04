import { fetchStories } from "../pipeline/lib/storyPipeline.mjs";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  try {
    const stories = await fetchStories((message, percent) => {
      send({ type: "progress", message, percent });
    });
    send({ type: "done", stories });
  } catch (e) {
    send({ type: "error", message: e.message });
  }
  res.end();
}
