// Shared image search logic used by both api/images.js (Vercel) and vite-plugin-api.mjs (dev)

function isUsableImage(info) {
  if (!info) return false;
  const mime = info.mime || "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return false;
  const { width, height } = info;
  if (width && height) {
    const ratio = height / width;
    if (ratio < 0.3 || ratio > 2.5) return false;
    if (width < 500) return false;
  }
  return true;
}

export function brandToTitleCase(brand) {
  return brand
    .replace(/[^a-zA-Z0-9'& ]/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function fetchGoogleImages(query, apiKey, cseId) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&searchType=image&num=6&imgSize=large&imgType=photo&safe=active`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || [])
    .filter((item) => {
      const { width, height } = item.image || {};
      if (width && height) {
        const ratio = height / width;
        if (ratio < 0.3 || ratio > 2.5) return false;
        if (width < 500) return false;
      }
      return true;
    })
    .map((item) => item.link);
}

async function fetchBraveImages(query, apiKey) {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=6&safesearch=moderate`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .filter((item) => {
      const { width, height } = item.properties || {};
      if (width && height) {
        const ratio = height / width;
        if (ratio < 0.3 || ratio > 2.5) return false;
        if (width < 500) return false;
      }
      return true;
    })
    .map((item) => item.url)
    .filter(Boolean);
}

export async function fetchCommonsImages(query) {
  const searchParams = new URLSearchParams({
    action: "query", list: "search", srsearch: query,
    srnamespace: "6", format: "json", srlimit: "20", origin: "*",
  });
  const searchRes = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams}`, {
    signal: AbortSignal.timeout(8000),
  });
  const searchData = await searchRes.json();
  const titles = (searchData.query?.search || []).map((r) => r.title);
  if (titles.length === 0) return [];

  const infoParams = new URLSearchParams({
    action: "query", titles: titles.join("|"),
    prop: "imageinfo", iiprop: "url|mime|size", iiurlwidth: "1200",
    format: "json", origin: "*",
  });
  const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`, {
    signal: AbortSignal.timeout(8000),
  });
  const infoData = await infoRes.json();

  return Object.values(infoData.query?.pages || {})
    .filter((page) => isUsableImage(page.imageinfo?.[0]))
    .map((page) => page.imageinfo?.[0]?.url)
    .filter(Boolean);
}

export async function fetchWikipediaThumbnail(brandName) {
  const params = new URLSearchParams({
    action: "query", titles: brandName,
    prop: "pageimages", pithumbsize: "1200",
    format: "json", origin: "*",
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  return pages.flatMap((p) => (p.thumbnail?.source ? [p.thumbnail.source] : []));
}

// aiQuery: AI-generated search string (preferred). Falls back to "<Brand> store exterior".
export async function searchImagesForBrand(brand, env = {}, aiQuery = null) {
  const { GOOGLE_API_KEY: googleKey, GOOGLE_CSE_ID: cseId, BRAVE_API_KEY: braveKey } = env;
  const titleCase = brandToTitleCase(brand);
  const query = aiQuery || `${titleCase} store exterior`;

  const results = await Promise.allSettled([
    googleKey && cseId ? fetchGoogleImages(query, googleKey, cseId) : Promise.resolve([]),
    braveKey           ? fetchBraveImages(query, braveKey)          : Promise.resolve([]),
    fetchCommonsImages(query),
    fetchWikipediaThumbnail(titleCase),
  ]);

  const [googleUrls, braveUrls, commonsUrls, wikiUrls] = results.map((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  const seen = new Set();
  const merged = [];
  for (const url of [...googleUrls, ...braveUrls, ...commonsUrls, ...wikiUrls]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    merged.push(url);
    if (merged.length >= 8) break;
  }
  return merged;
}
