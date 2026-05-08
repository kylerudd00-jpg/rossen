// Shared image search logic used by both api/images.js (Vercel) and vite-plugin-api.mjs (dev)

const RESTAURANT_BRANDS = new Set([
  "7 BREW", "APPLEBEE'S", "ARBY'S", "AROMA JOE'S", "BASKIN-ROBBINS", "BUFFALO WILD WINGS", "BURGER KING",
  "CHICK-FIL-A", "CHIPOTLE", "COLD STONE", "COOK OUT", "CRACKER BARREL",
  "DAIRY QUEEN", "DENNY'S", "DOMINO'S", "DUNKIN'", "FAZOLI'S", "FIVE GUYS",
  "FIREHOUSE SUBS", "IHOP", "IN-N-OUT", "JAMBA", "JERSEY MIKE'S",
  "KONA ICE", "KRISPY KREME", "LITTLE CAESARS", "MCDONALD'S", "PANDA EXPRESS",
  "PANERA", "PAPA JOHN'S", "PIZZA HUT", "POPEYES", "POTBELLY",
  "QDOBA", "RAISING CANE'S", "RED LOBSTER", "SHAKE SHACK", "SONIC",
  "SCOOTER'S COFFEE", "STARBUCKS", "SUBWAY", "TACO BELL", "WENDY'S", "WHATABURGER",
  "WHITE CASTLE",
  "WINGSTOP",
]);

const PHARMACY_BRANDS = new Set(["CVS", "WALGREENS"]);
const WAREHOUSE_BRANDS = new Set(["BJ'S WHOLESALE", "COSTCO", "SAM'S CLUB"]);
const ENTERTAINMENT_BRANDS = new Set(["REGAL CINEMAS"]);
const PRODUCT_FIRST_BRANDS = new Set([
  "DIRTY CHIPS", "GOURMIA", "THERMOS", "UTZ", "VIVE HEALTH", "ZAPP'S",
  "ZAPP'S / DIRTY CHIPS",
]);

const SEARCH_NAME_OVERRIDES = {
  "7 BREW": "7 Brew",
  "ALDI / WALMART": "Aldi Walmart",
  "ARBY'S": "Arbys",
  "AROMA JOE'S": "Aroma Joes",
  "BJ'S WHOLESALE": "BJs Wholesale",
  "CHICK-FIL-A": "Chick-fil-A",
  "DUNKIN'": "Dunkin",
  "FAZOLI'S": "Fazolis",
  "GOOD & GATHER": "Target Good and Gather",
  "IN-N-OUT": "In-N-Out",
  "JERSEY MIKE'S": "Jersey Mikes",
  "MCDONALD'S": "McDonalds",
  "PAPA JOHN'S": "Papa Johns",
  "RAISING CANE'S": "Raising Canes",
  "REGAL CINEMAS": "Regal Cinemas",
  "SAM'S CLUB": "Sams Club",
  "SCOOTER'S COFFEE": "Scooters Coffee",
  "ZAPP'S / DIRTY CHIPS": "Zapps Dirty potato chips",
  "7-ELEVEN": "7-Eleven",
};

const RETAILER_IMAGE_TARGETS = {
  "GOOD & GATHER": ["Target", "Good and Gather Target"],
  "ALDI / WALMART": ["Aldi", "Walmart"],
};

const CURATED_EXTERIOR_IMAGES = {
  "MCDONALD'S": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/McDonald%27s_Chicago_Flagship.jpg/1280px-McDonald%27s_Chicago_Flagship.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/McDonalds_Denton_House%2C_New_Hyde_Park%2C_NY_crop.jpg/1280px-McDonalds_Denton_House%2C_New_Hyde_Park%2C_NY_crop.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/1/1b/McDonald%27s_Festival_Supermall_exterior.jpg",
  ],
  "STARBUCKS": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Starbuckscenter.jpg/1280px-Starbuckscenter.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Starbucks_street_musician.jpg/1280px-Starbucks_street_musician.jpg",
  ],
  "TARGET": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Target_store_in_Stuart%2C_FL.jpg/1280px-Target_store_in_Stuart%2C_FL.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Target_%28Westminster_Mall%2C_California%29_-_2025.jpg/1280px-Target_%28Westminster_Mall%2C_California%29_-_2025.jpg",
  ],
  "WALMART": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Walmart_store_exterior_5266815680.jpg/1280px-Walmart_store_exterior_5266815680.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Walmart_4.jpg/1280px-Walmart_4.jpg",
  ],
  "COSTCO": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Costcoheadquarters.jpg/1280px-Costcoheadquarters.jpg",
  ],
  "SAM'S CLUB": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Sam%27s_Club_in_Onalaska.jpg/1280px-Sam%27s_Club_in_Onalaska.jpg",
  ],
  "DOLLAR TREE": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Dollar_Tree_discount_store_exterior_in_Greenville%2C_South_Carolina_02.jpg/1280px-Dollar_Tree_discount_store_exterior_in_Greenville%2C_South_Carolina_02.jpg",
  ],
  "DOLLAR GENERAL": [
    "https://upload.wikimedia.org/wikipedia/commons/a/a1/DGheadquartersTN.jpg",
  ],
  "LOWE'S": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/A_Lowe%27s_store_in_Murphy%2C_North_Carolina.jpg/1280px-A_Lowe%27s_store_in_Murphy%2C_North_Carolina.jpg",
  ],
  "TACO BELL": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Tacobellheadquartersirvine.jpg/1280px-Tacobellheadquartersirvine.jpg",
  ],
  "CHICK-FIL-A": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Chick-fil-A.jpg/1280px-Chick-fil-A.jpg",
  ],
  "WENDY'S": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Wendy%27s_flagship_restaurant_%28Dublin%2C_Ohio%29.jpg/1280px-Wendy%27s_flagship_restaurant_%28Dublin%2C_Ohio%29.jpg",
  ],
  "PANERA": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Panera_Bread_The_Villages_Florida.jpg/1280px-Panera_Bread_The_Villages_Florida.jpg",
  ],
  "OLIVE GARDEN": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/2021-08-18_19_54_47_The_exterior_front_entrance_of_the_Olive_Garden_in_the_Fair_Lakes_Shopping_Center_in_Fair_Lakes%2C_Fairfax_County%2C_Virginia_during_the_evening.jpg/1280px-thumbnail.jpg",
  ],
  "TRADER JOE'S": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Trader_Joe%27s_in_Chattanooga%2C_Tennessee.jpg/1280px-Trader_Joe%27s_in_Chattanooga%2C_Tennessee.jpg",
  ],
  "KROGER": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Cincinnati-kroger-building.jpg/1280px-Cincinnati-kroger-building.jpg",
  ],
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

const WIKIMEDIA_HEADERS = {
  "User-Agent": "DealPipeline/1.0 (https://deal-pipeline-navy.vercel.app/)",
  "Accept": "application/json",
};

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

function headlineLines(headline = "") {
  return String(headline || "")
    .split(/\n+/)
    .map((line) => cleanQuery(line))
    .filter(Boolean);
}

function stripHeadlineAction(value) {
  return cleanQuery(value)
    .replace(/\b(RECALLED|PUBLIC HEALTH ALERT|ALERT|WARNING|WARNINGS?|RETURNS?|RETURNING|UPDATED|UPDATE|LAUNCH(?:ES)?|BACKLASH|PUSH|DEAL)\b/gi, " ")
    .replace(/\b(POSSIBLE|RISK|CONTAMINATION|CUSTOMERS?|SAYS?|ISN'?T|ISN’T|CHEAP|AFTER|WITH|FOR|ONLY|STARTING|AVAILABLE|THROUGH|IN APP|IN THE APP)\b/gi, " ")
    .replace(/\b(FREE|BOGO)\b/gi, " ")
    .replace(/\$\d+(?:\.\d{2})?\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractProductPhrase(options = {}) {
  const lines = headlineLines(options.headline);
  const line2 = lines[1] || "";
  const cleanedLine = stripHeadlineAction(line2);
  if (cleanedLine && cleanedLine.length >= 4) return cleanedLine;

  const text = cleanQuery(`${options.title || ""} ${options.summary || ""}`);
  const patterns = [
    /\b(cr[eè]me\s+br[uû]l[eé]e)\b/i,
    /\b(snack\s+mix(?:es)?)\b/i,
    /\b(potato\s+chips?)\b/i,
    /\b(frozen\s+pizzas?)\b/i,
    /\b(pressure\s+cookers?)\b/i,
    /\b(adult\s+bed\s+rails?)\b/i,
    /\b(?:thermos\s+)?((?:stainless\s+king\s+)?(?:food|vacuum)\s+jars?)\b/i,
    /\b(ShackBurger)\b/i,
    /\b(16[-\s]?count\s+Minis\s+for\s+Mom\s+box)\b/i,
    /\b(24\s*oz\s+iced\s+drink)\b/i,
    /\b(sweet\s*&?\s*sour\s+sauce)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanQuery(match[1]);
  }
  return "";
}

function isProductOrSafetyStory(brand, options = {}) {
  const normalizedBrand = brand.toUpperCase();
  const text = normalizeText([options.headline, options.title, options.summary].filter(Boolean).join(" "));
  return PRODUCT_FIRST_BRANDS.has(normalizedBrand)
    || /\b(recall|recalled|public\s+health\s+alert|warning|cpsc|fda|usda|salmonella|listeria|glass\s+contamination|injur|death)\b/.test(text);
}

function inferImageIntent(brand, options = {}) {
  const normalizedBrand = brand.toUpperCase();
  const text = normalizeText([brand, options.headline, options.title, options.summary].filter(Boolean).join(" "));

  if (PRODUCT_FIRST_BRANDS.has(normalizedBrand)) return "product";
  if (ENTERTAINMENT_BRANDS.has(normalizedBrand)) return "venue";
  if (/\b(movie\s+tickets?|cinemas?|theater|theatre)\b/.test(text)) return "venue";
  if (/\b(recall|recalled|public\s+health\s+alert|warning|cpsc|fda|usda|salmonella|listeria|glass\s+contamination)\b/.test(text)) {
    return "hybrid";
  }
  return "venue";
}

function brandSearchTargets(brand, options = {}) {
  const normalizedBrand = brand.toUpperCase();
  const override = RETAILER_IMAGE_TARGETS[normalizedBrand];
  const rawTargets = override
    ? (Array.isArray(override) ? override : [override])
    : String(brand || "")
      .split(/\s+\/\s+|,\s*/)
      .map((part) => part.trim())
      .filter(Boolean);

  const productPhrase = extractProductPhrase(options);
  const targets = rawTargets.length > 0 ? rawTargets : [brand];
  const names = targets.map((target) => brandToSearchName(target));

  if (normalizedBrand === "GOOD & GATHER") names.unshift("Good and Gather Target");
  if (normalizedBrand === "ZAPP'S / DIRTY CHIPS") names.unshift("Zapp's Dirty potato chips");
  if (normalizedBrand === "ALDI / WALMART" && productPhrase) names.unshift(`Aldi Walmart ${productPhrase}`);

  return [...new Set(names.map(cleanQuery).filter(Boolean))];
}

function inferVenueDescriptor(brand, context = "") {
  const normalizedBrand = brand.toUpperCase();
  const text = normalizeText(`${brand} ${context}`);

  if (ENTERTAINMENT_BRANDS.has(normalizedBrand) || /\b(movie\s+tickets?|cinemas?|theater|theatre)\b/.test(text)) {
    return "movie theater exterior marquee";
  }
  if (/\b(coffee|brew|espresso|iced\s+drink|drive[-\s]?thru)\b/.test(text)) {
    return "coffee shop drive thru exterior";
  }
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
  const context = [options.headline, options.title, options.summary].filter(Boolean).join(" ");
  const descriptor = inferVenueDescriptor(brand, context);
  const intent = inferImageIntent(brand, options);
  const targets = brandSearchTargets(brand, options);
  const productPhrase = extractProductPhrase(options);

  const queries = [
    options.aiQuery,
    options.aiQuery2,
  ];

  if (productPhrase && intent !== "venue") {
    for (const target of targets.slice(0, 2)) {
      queries.push(`${target} ${productPhrase} package photo`);
      queries.push(`${target} ${productPhrase} product photo`);
    }
    if (isProductOrSafetyStory(brand, options)) queries.push(`${productPhrase} recall product photo`);
  }

  if (intent !== "product") {
    for (const target of targets.slice(0, 2)) {
      queries.push(`${target} ${descriptor} photo`);
      queries.push(`${target} storefront exterior`);
      queries.push(`${target} building entrance sign`);
    }
  }

  if (intent === "product" && !productPhrase) {
    for (const target of targets.slice(0, 2)) queries.push(`${target} product package photo`);
  }

  return [...new Set(queries.map(cleanQuery).filter(Boolean))].slice(0, options.maxQueries || 4);
}

function buildFallbackQueries(brand, options = {}) {
  const context = [options.headline, options.title, options.summary].filter(Boolean).join(" ");
  const descriptor = inferVenueDescriptor(brand, context);
  const targets = brandSearchTargets(brand, options);
  const searchName = targets[0] || brandToSearchName(brand);
  const productPhrase = extractProductPhrase(options);
  const intent = inferImageIntent(brand, options);
  const isRestaurant = descriptor.includes("restaurant");
  const isTheater = descriptor.includes("theater");
  const isPharmacy = descriptor.includes("pharmacy");
  const isWarehouse = descriptor.includes("warehouse");
  const venueWord = isTheater ? "theater" : isRestaurant ? "restaurant" : isPharmacy ? "pharmacy" : isWarehouse ? "warehouse" : "store";

  const queries = [
    `${searchName} ${venueWord}`,
    `${searchName} ${venueWord} exterior`,
    `${searchName} storefront`,
    `${searchName} building`,
    `${searchName} ${descriptor}`,
  ];

  if (productPhrase && intent !== "venue") {
    queries.unshift(`${searchName} ${productPhrase} package`);
    queries.unshift(`${searchName} ${productPhrase} product`);
  }

  return [...new Set(queries.map(cleanQuery).filter(Boolean))];
}

function curatedExteriorCandidates(brand) {
  const normalizedBrand = brand.toUpperCase();
  const targetNames = [
    normalizedBrand,
    ...(RETAILER_IMAGE_TARGETS[normalizedBrand] || []),
  ].map((target) => String(target).toUpperCase());
  const seen = new Set();
  return targetNames.flatMap((targetName) =>
    (CURATED_EXTERIOR_IMAGES[targetName] || []).map((url, index) => {
      if (seen.has(url)) return null;
      seen.add(url);
      return {
        url,
        title: `${brandToSearchName(targetName)} exterior`,
        sourceDomain: "wikimedia.org",
        source: "curated",
        queryIndex: index,
      };
    }).filter(Boolean)
  );
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

function toAbsoluteUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function isPublicHttpUrl(value) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return !/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|0\.0\.0\.0)$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function extractMetaContent(html, keyPattern) {
  const re = /<meta\b[^>]*(?:property|name|itemprop)=["']?([^"'>\s]+)["']?[^>]*content=["']([^"']+)["'][^>]*>|<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']?([^"'>\s]+)["']?[^>]*>/gi;
  const matches = [];
  let match;
  while ((match = re.exec(html))) {
    const key = match[1] || match[4] || "";
    const content = match[2] || match[3] || "";
    if (keyPattern.test(key) && content) matches.push(content.replace(/&amp;/g, "&"));
  }
  return matches;
}

function extractSourceImageUrls(html, sourceUrl) {
  const urls = [
    ...extractMetaContent(html, /^(og:image|og:image:url|twitter:image|twitter:image:src|image)$/i),
  ];

  const linkRe = /<link\b[^>]*rel=["'][^"']*image_src[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let linkMatch;
  while ((linkMatch = linkRe.exec(html))) urls.push(linkMatch[1]);

  const jsonImageRe = /"image"\s*:\s*(?:"([^"]+)"|\[\s*"([^"]+)")/gi;
  let jsonMatch;
  while ((jsonMatch = jsonImageRe.exec(html))) urls.push(jsonMatch[1] || jsonMatch[2]);

  return [...new Set(urls
    .map((url) => toAbsoluteUrl(url, sourceUrl))
    .filter(Boolean)
    .filter((url) => !/\.(svg|gif)(\?|$)/i.test(url))
  )].slice(0, 6);
}

async function fetchSourceImageCandidates(sourceUrl, options = {}) {
  if (!isPublicHttpUrl(sourceUrl)) return [];
  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RossenReportsImageSearch/1.0)" },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res?.ok) return [];
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return [];
  const html = (await res.text()).slice(0, 1_500_000);
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || options.title || "source image";
  let sourceDomain = "";
  try { sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, ""); } catch {}

  return extractSourceImageUrls(html, sourceUrl).map((url, index) => ({
    url,
    title,
    snippet: options.summary,
    contextUrl: sourceUrl,
    sourceDomain,
    source: "source-page",
    query: sourceUrl,
    queryIndex: index,
  }));
}

function includesTerm(text, term) {
  const escapedWords = term
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(^|[^a-z0-9])${escapedWords.join("[\\s-]+")}([^a-z0-9]|$)`, "i").test(text);
}

function scoreCandidate(candidate, brand, queryIndex, options = {}) {
  const titleCase = brandToTitleCase(brand).toLowerCase();
  const searchName = brandToSearchName(brand).toLowerCase();
  const targets = brandSearchTargets(brand, options).join(" ").toLowerCase();
  const productPhrase = extractProductPhrase(options).toLowerCase();
  const weakWords = new Set(["and", "the", "for", "good", "store", "stores", "restaurant", "coffee"]);
  const intent = inferImageIntent(brand, options);
  const brandWords = [...new Set(`${titleCase} ${searchName} ${targets}`.split(/\s+/))]
    .filter((word) => word.length > 1 && !weakWords.has(word));
  const productWords = [...new Set(productPhrase.split(/\s+/))]
    .filter((word) => word.length > 2 && !["for", "mom", "box"].includes(word));
  const text = normalizeText([
    candidate.url,
    candidate.title,
    candidate.snippet,
    candidate.contextUrl,
    candidate.sourceDomain,
  ].join(" "));
  const imageText = normalizeText([
    candidate.url,
    candidate.sourceDomain,
  ].join(" "));

  let score = candidate.source === "source-page" ? 52
    : candidate.source === "google" ? 45
    : candidate.source === "pexels" ? 44
    : candidate.source === "brave" ? 42
    : candidate.source === "commons" ? 16
    : 10;

  score += Math.max(0, 8 - queryIndex * 3);
  const hasBrandWord = brandWords.some((word) => text.includes(word));
  const hasProductWord = productWords.some((word) => text.includes(word));
  if (hasBrandWord) score += 14;
  if (productWords.length > 0 && hasProductWord) score += 14;

  const positiveTerms = intent === "product"
    ? ["package", "packaging", "product", "item", "recall", "recalled", "box", "bag", "jar", "chips", "snack", "mix", "pizza", "pressure cooker"]
    : POSITIVE_TERMS;
  const negativeTerms = intent === "product"
    ? NEGATIVE_TERMS.filter((term) => !["packaging", "product"].includes(term))
    : NEGATIVE_TERMS;

  for (const term of positiveTerms) {
    if (includesTerm(text, term)) score += 8;
  }
  for (const term of negativeTerms) {
    if (includesTerm(text, term)) score -= 14;
  }

  if (intent === "hybrid") {
    if (/\b(package|packaging|product|recall|recalled|storefront|exterior|building|sign)\b/i.test(text)) score += 6;
  }

  if (intent === "venue" && !hasBrandWord) score -= 14;
  if (intent !== "venue" && productWords.length > 0 && !hasProductWord && !hasBrandWord) score -= 22;

  if (/\.(svg|gif)(\?|$)/i.test(candidate.url)) score -= 45;
  if (/\b(logo|icon|coupon|promo|transparent|vector|clipart)\b/i.test(candidate.url)) score -= 35;
  if (intent === "venue" && /\b(menu|product|packaging)\b/i.test(candidate.url)) score -= 20;
  if (/\b(seeklogo|worldvectorlogo|logowik|brandfetch|1000logos|pngimg|pngitem|cleanpng|favpng|stickpng|clipart|pinterest|facebook|instagram|tiktok|reddit)\b/i.test(text)) score -= 24;
  if (/\b(ubereats|doordash|grubhub|postmates|seamless|menuwithprice|fastfoodmenuprices)\b/i.test(text)) score -= 18;
  if (candidate.source === "source-page") {
    const imageHasBrandOrProduct = [...brandWords, ...productWords].some((word) => imageText.includes(word));
    if (/\b(social[-_]?graphic|share[-_]?image|default[-_]?image|placeholder|site[-_]?logo|logo|favicon|icon)\b/i.test(imageText) && !imageHasBrandOrProduct) {
      score -= 90;
    }
  }

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

async function fetchPexelsImageCandidates(query, apiKey, queryIndex = 0) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape&size=large`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.photos || []).map((item) => ({
    url: item.src?.large2x || item.src?.large || item.src?.original,
    title: item.alt || query,
    snippet: item.alt,
    contextUrl: item.url,
    sourceDomain: "pexels.com",
    source: "pexels",
    query,
    queryIndex,
  })).filter((item) => item.url);
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
    headers: WIKIMEDIA_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!searchRes.ok || !searchRes.headers.get("content-type")?.includes("json")) return [];
  const searchData = await searchRes.json();
  const searchRows = searchData.query?.search || [];
  const titles = searchRows.map((r) => r.title);
  if (titles.length === 0) return [];

  const infoParams = new URLSearchParams({
    action: "query", titles: titles.join("|"),
    prop: "imageinfo", iiprop: "url|mime|size|thumburl", iiurlwidth: "1200",
    format: "json", origin: "*",
  });
  const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`, {
    headers: WIKIMEDIA_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!infoRes.ok || !infoRes.headers.get("content-type")?.includes("json")) return [];
  const infoData = await infoRes.json();
  const titleText = new Map(searchRows.map((row) => [row.title, row.snippet]));

  return Object.values(infoData.query?.pages || {})
    .filter((page) => isUsableImage(page.imageinfo?.[0]))
    .map((page) => ({
      url: page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url,
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

async function fetchWikipediaSearchCandidates(query, queryIndex = 80) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "8",
    prop: "pageimages",
    pithumbsize: "1200",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: WIKIMEDIA_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return [];
  const data = await res.json();
  return Object.values(data.query?.pages || {})
    .map((page) => ({
      url: page.thumbnail?.source,
      title: page.title,
      sourceDomain: "wikipedia.org",
      source: "wikipedia-search",
      query,
      queryIndex,
    }))
    .filter((item) => item.url);
}

async function fetchWikipediaThumbnailCandidates(brandName) {
  const params = new URLSearchParams({
    action: "query", titles: brandName,
    prop: "pageimages", pithumbsize: "1200",
    format: "json", origin: "*",
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: WIKIMEDIA_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return [];
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

async function fetchFallbackCandidates(brand, options = {}) {
  const queries = buildFallbackQueries(brand, options).slice(0, 3);
  const searches = [
    fetchCommonsImageCandidates(queries[0]).then((items) =>
      items.map((item) => ({ ...item, query: queries[0], queryIndex: 50 }))
    ),
    fetchCommonsImageCandidates(queries[1]).then((items) =>
      items.map((item) => ({ ...item, query: queries[1], queryIndex: 51 }))
    ),
    fetchWikipediaSearchCandidates(queries[0], 70),
  ];
  const results = await Promise.allSettled(searches);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// aiQuery is used as the first Google/Brave query, but deterministic exterior
// queries follow it so weak AI queries do not dominate the result set.
export async function searchImagesForBrand(brand, env = {}, optionsOrAiQuery = null) {
  const { GOOGLE_API_KEY: googleKey, GOOGLE_CSE_ID: cseId, BRAVE_API_KEY: braveKey, PEXELS_API_KEY: pexelsKey } = env;
  const options = typeof optionsOrAiQuery === "string"
    ? { aiQuery: optionsOrAiQuery }
    : (optionsOrAiQuery || {});
  const titleCase = brandToTitleCase(brand);
  const intent = inferImageIntent(brand, options);
  const queries = buildExteriorQueries(brand, {
    ...options,
    maxQueries: Number(env.IMAGE_QUERY_LIMIT) || 5,
  });

  const webSearches = queries.flatMap((query, queryIndex) => [
    googleKey && cseId ? fetchGoogleImageCandidates(query, googleKey, cseId, queryIndex) : Promise.resolve([]),
    braveKey           ? fetchBraveImageCandidates(query, braveKey, queryIndex)          : Promise.resolve([]),
    pexelsKey          ? fetchPexelsImageCandidates(query, pexelsKey, queryIndex)        : Promise.resolve([]),
  ]);

  const [sourceResults, webResults] = await Promise.all([
    fetchSourceImageCandidates(options.sourceUrl, options).catch(() => []),
    Promise.allSettled(webSearches),
  ]);
  const scored = [
    ...sourceResults,
    ...webResults.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
  ]
    .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, brand, candidate.queryIndex || 0, options) }))
    .filter((candidate) => candidate.score >= 20)
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
  const webCandidateCount = merged.length;

  const curated = intent === "product" ? [] : curatedExteriorCandidates(brand);
  curated.forEach(addCandidate);

  if (curated.length > 0 && (webCandidateCount === 0 || merged.length >= 3)) {
    return merged.slice(0, 8);
  }

  if (merged.length < 4) {
    const fallbackResults = await Promise.allSettled([
      fetchFallbackCandidates(brand, options),
      fetchWikipediaThumbnailCandidates(titleCase),
    ]);
    fallbackResults
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, brand, candidate.queryIndex || 99, options) }))
      .filter((candidate) => candidate.score >= 16)
      .sort((a, b) => b.score - a.score)
      .forEach(addCandidate);
  }

  return merged.slice(0, 8);
}
