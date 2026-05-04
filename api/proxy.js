const PRIVATE_HOSTNAME_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|::1|0\.0\.0\.0)$/i;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function validateImageUrl(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { return "invalid URL"; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "non-http scheme";
  if (PRIVATE_HOSTNAME_RE.test(parsed.hostname)) return "private hostname";
  return null;
}

export default async function handler(req, res) {
  const raw = new URL(req.url, "http://localhost").searchParams.get("url");
  if (!raw) return res.status(400).json({ error: "missing url param" });

  const err = validateImageUrl(raw);
  if (err) return res.status(400).json({ error: err });

  try {
    const upstream = await fetch(raw, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return res.status(502).end();

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      upstream.body?.cancel();
      return res.status(415).json({ error: "upstream is not an image" });
    }

    const chunks = [];
    let total = 0;
    for await (const chunk of upstream.body) {
      total += chunk.length;
      if (total > MAX_BYTES) {
        return res.status(502).json({ error: "upstream too large" });
      }
      chunks.push(chunk);
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(Buffer.concat(chunks));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
