export default async function handler(req, res) {
  const q = new URL(req.url, "http://localhost").searchParams.get("q") || "";
  if (!q) {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify([]));
  }

  try {
    const images = await searchWikimediaImages(q);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(images));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
}

async function searchWikimediaImages(q) {
  const searchParams = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: q,
    srnamespace: "6",
    format: "json",
    srlimit: "10",
    origin: "*",
  });

  const searchRes = await fetch(
    `https://commons.wikimedia.org/w/api.php?${searchParams}`,
    { signal: AbortSignal.timeout(8000) }
  );
  const searchData = await searchRes.json();
  const titles = (searchData.query?.search || []).map((r) => r.title);
  if (titles.length === 0) return [];

  const infoParams = new URLSearchParams({
    action: "query",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "1200",
    format: "json",
    origin: "*",
  });

  const infoRes = await fetch(
    `https://commons.wikimedia.org/w/api.php?${infoParams}`,
    { signal: AbortSignal.timeout(8000) }
  );
  const infoData = await infoRes.json();

  return Object.values(infoData.query?.pages || {})
    .filter((page) => {
      const m = page.imageinfo?.[0]?.mime || "";
      return m === "image/jpeg" || m === "image/png" || m === "image/webp";
    })
    .map((page) => page.imageinfo?.[0]?.thumburl)
    .filter(Boolean);
}
