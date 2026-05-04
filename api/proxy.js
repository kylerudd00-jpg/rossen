export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost").searchParams.get("url");
  if (!url) return res.status(400).end();

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return res.status(upstream.status).end();

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
