// Shared image search logic used by both api/images.js (Vercel) and vite-plugin-api.mjs (dev)

const RESTAURANT_BRANDS = new Set([
  "APPLEBEE'S", "BASKIN-ROBBINS", "BUFFALO WILD WINGS", "BURGER KING",
  "CHICK-FIL-A", "CHIPOTLE", "COLD STONE", "COOK OUT", "CRACKER BARREL",
  "DAIRY QUEEN", "DENNY'S", "DOMINO'S", "DUNKIN'", "FIVE GUYS",
  "FIREHOUSE SUBS", "IHOP", "IN-N-OUT", "JAMBA", "JERSEY MIKE'S",
  "KONA ICE", "LITTLE CAESARS", "MCDONALD'S", "PANDA EXPRESS",
  "PANERA", "PAPA JOHN'S", "PIZZA HUT", "POPEYES", "POTBELLY",
  "QDOBA", "RAISING CANE'S", "RED LOBSTER", "SHAKE SHACK", "SONIC",
  "STARBUCKS", "SUBWAY", "TACO BELL", "WENDY'S", "WHATABURGER",
  "WINGSTOP",
]);

const PHARMACY_BRANDS = new Set(["CVS", "WALGREENS"]);
const WAREHOUSE_BRANDS = new Set(["BJ'S WHOLESALE", "COSTCO", "SAM'S CLUB"]);

const SEARCH_NAME_OVERRIDES = {
  "BJ'S WHOLESALE": "BJs Wholesale",
  "CHICK-FIL-A": "Chick-fil-A",
  "DUNKIN'": "Dunkin",
  "IN-N-OUT": "In-N-Out",
  "JERSEY MIKE'S": "Jersey Mikes",
  "MCDONALD'S": "McDonalds",
  "PAPA JOHN'S": "Papa Johns",
  "RAISING CANE'S": "Raising Canes",
  "SAM'S CLUB": "Sams Club",
  "7-ELEVEN": "7-Eleven",
};

const POSITIVE_TERMS = [
  "building", "drive thru", "drive-thru", "entrance", "exterior", "location",
  "restaurant exterior", "sign", "store exterior", "storefront", "street view",
];

const NEGATIVE_TERMS = [
  "ad", "app", "coupon", "deal", "flyer", "gift card", "icon", "logo", "menu",
  "packaging", "png", "product", "promo", "promotion", "screenshot", "svg",
  "transparent", "vector",
];

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

function hasUsableDimensions(width, height) {
  if (!width || !height) return true;
  const ratio = height / width;
  return ratio >= 0.3 && ratio <= 2.5 && width >= 500;
}

export function brandToTitleCase(brand) {
  return brand
    .replace(/[^a-zA-Z0-9'& ]/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function brandToSearchName(brand) {
  const override = SEARCH_NAME_OVERRIDES[brand.toUpperCase()];
  if (override) return override;
  return brand
    .replace(/&/g, " and ")
    .replace(/[''`]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function cleanQuery(query) {
  return String(query || "")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferVenueDescriptor(brand, context = "") {
  const normalizedBrand = brand.toUpperCase();
  const text = normalizeText(`${brand} ${context}`);

  if (RESTAURANT_BRANDS.has(normalizedBrand) || /\b(restaurant|fast food|menu|burger|pizza|taco|coffee|sandwich|drive[-\s]?thru)\b/.test(text)) {
    return "restaurant exterior storefront";
  }
  if (PHARMACY_BRANDS.has(normalizedBrand) || /\b(pharmacy|drugstore)\b/.test(text)) {
    return "pharmacy store exterior";
  }
  if (WAREHOUSE_BRANDS.has(normalizedBrand) || /\b(warehouse|club|wholesale)\b/.test(text)) {
    return "warehouse store exterior";
  }
  return "retail store exterior storefront";
}

function buildExteriorQueries(brand, options = {}) {
  const searchName = brandToSearchName(brand);
  const context = [options.headline, options.title, options.summary].filter(Boolean).join(" ");
  const descriptor = inferVenueDescriptor(brand, context);
  const queries = [
    options.aiQuery,
    `${searchName} ${descriptor} photo`,
    `${searchName} storefront exterior`,
    `${searchName} building entrance sign`,
  ]
    .map(cleanQuery)
    .filter(Boolean);

  return [...new Set(queries)].slice(0, options.maxQueries || 2);
}

function candidateKey(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function includesTerm(text, term) {
  const escapedWords = term
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(^|[^a-z0-9])${escapedWords.join("[\\s-]+")}([^a-z0-9]|$)`, "i").test(text);
}

function scoreCandidate(candidate, brand, queryIndex) {
  const titleCase = brandToTitleCase(brand).toLowerCase();
  const searchName = brandToSearchName(brand).toLowerCase();
  const brandWords = [...new Set(`${titleCase} ${searchName}`.split(/\s+/))]
    .filter((word) => word.length > 1);
  const text = normalizeText([
    candidate.url,
    candidate.title,
    candidate.snippet,
    candidate.contextUrl,
    candidate.sourceDomain,
  ].join(" "));

  let score = candidate.source === "google" ? 45
    : candidate.source === "brave" ? 42
    : candidate.source === "commons" ? 16
    : 10;

  score += Math.max(0, 8 - queryIndex * 3);
  if (brandWords.some((word) => text.includes(word))) score += 10;

  for (const term of POSITIVE_TERMS) {
    if (includesTerm(text, term)) score += 8;
  }
  for (const term of NEGATIVE_TERMS) {
    if (includesTerm(text, term)) score -= 14;
  }
  if (/\.(svg|gif)(\?|$)/i.test(candidate.url)) score -= 45;
  if (/\b(logo|icon|coupon|menu|product|promo)\b/i.test(candidate.url)) score -= 28;

  return score;
}

function toUrlList(candidates) {
  return candidates.map((candidate) => candidate.url).filter(Boolean);
}

async function fetchGoogleImageCandidates(query, apiKey, cseId, queryIndex = 0) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&searchType=image&num=8&imgSize=large&imgType=photo&safe=active`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || [])
    .filter((item) => {
      const { width, height } = item.image || {};
      return hasUsableDimensions(width, height);
    })
    .map((item) => ({
      url: item.link,
      title: item.title,
      snippet: item.snippet,
      contextUrl: item.image?.contextLink,
      sourceDomain: item.displayLink,
      source: "google",
      query,
      queryIndex,
    }))
    .filter((item) => item.url);
}

export async function fetchGoogleImages(query, apiKey, cseId) {
  return toUrlList(await fetchGoogleImageCandidates(query, apiKey, cseId));
}

async function fetchBraveImageCandidates(query, apiKey, queryIndex = 0) {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=8&safesearch=moderate`;
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
      return hasUsableDimensions(width, height);
    })
    .map((item) => ({
      url: item.url,
      title: item.title,
      snippet: item.description,
      contextUrl: item.page_url,
      sourceDomain: item.source,
      source: "brave",
      query,
      queryIndex,
    }))
    .filter((item) => item.url);
}

async function fetchCommonsImageCandidates(query) {
  const searchParams = new URLSearchParams({
    action: "query", list: "search", srsearch: query,
    srnamespace: "6", format: "json", srlimit: "20", origin: "*",
  });
  const searchRes = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams}`, {
    signal: AbortSignal.timeout(8000),
  });
  const searchData = await searchRes.json();
  const searchRows = searchData.query?.search || [];
  const titles = searchRows.map((r) => r.title);
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
  const titleText = new Map(searchRows.map((row) => [row.title, row.snippet]));

  return Object.values(infoData.query?.pages || {})
    .filter((page) => isUsableImage(page.imageinfo?.[0]))
    .map((page) => ({
      url: page.imageinfo?.[0]?.url,
      title: page.title,
      snippet: titleText.get(page.title),
      sourceDomain: "commons.wikimedia.org",
      source: "commons",
      queryIndex: 99,
    }))
    .filter((item) => item.url);
}

export async function fetchCommonsImages(query) {
  return toUrlList(await fetchCommonsImageCandidates(query));
}

async function fetchWikipediaThumbnailCandidates(brandName) {
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
  return pages
    .map((page) => ({
      url: page.thumbnail?.source,
      title: page.title,
      sourceDomain: "wikipedia.org",
      source: "wikipedia",
      queryIndex: 99,
    }))
    .filter((item) => item.url);
}

export async function fetchWikipediaThumbnail(brandName) {
  return toUrlList(await fetchWikipediaThumbnailCandidates(brandName));
}

// aiQuery is used as the first Google/Brave query, but deterministic exterior
// queries follow it so weak AI queries do not dominate the result set.
export async function searchImagesForBrand(brand, env = {}, optionsOrAiQuery = null) {
  const { GOOGLE_API_KEY: googleKey, GOOGLE_CSE_ID: cseId, BRAVE_API_KEY: braveKey } = env;
  const options = typeof optionsOrAiQuery === "string"
    ? { aiQuery: optionsOrAiQuery }
    : (optionsOrAiQuery || {});
  const titleCase = brandToTitleCase(brand);
  const queries = buildExteriorQueries(brand, {
    ...options,
    maxQueries: Number(env.IMAGE_QUERY_LIMIT) || 2,
  });
  const fallbackQuery = `${brandToSearchName(brand)} ${inferVenueDescriptor(brand, [options.headline, options.title, options.summary].join(" "))}`;

  const webSearches = queries.flatMap((query, queryIndex) => [
    googleKey && cseId ? fetchGoogleImageCandidates(query, googleKey, cseId, queryIndex) : Promise.resolve([]),
    braveKey           ? fetchBraveImageCandidates(query, braveKey, queryIndex)          : Promise.resolve([]),
  ]);

  const webResults = await Promise.allSettled(webSearches);
  const scored = webResults
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, brand, candidate.queryIndex || 0) }))
    .filter((candidate) => candidate.score >= 28)
    .sort((a, b) => b.score - a.score);

  const seen = new Set();
  const merged = [];
  const addCandidate = (candidate) => {
    if (!candidate?.url) return;
    const key = candidateKey(candidate.url);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(candidate.url);
  };

  scored.forEach(addCandidate);

  if (merged.length < 4) {
    const fallbackResults = await Promise.allSettled([
      fetchCommonsImageCandidates(fallbackQuery),
      fetchWikipediaThumbnailCandidates(titleCase),
    ]);
    fallbackResults
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, brand, candidate.queryIndex || 99) }))
      .filter((candidate) => candidate.score >= 10)
      .sort((a, b) => b.score - a.score)
      .forEach(addCandidate);
  }

  return merged.slice(0, 8);
}
