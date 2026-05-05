import { parseRssItems } from "./rss.mjs";
import { summarizeText } from "./text.mjs";
import { discoveryQueries } from "../config/discoveryQueries.mjs";
import { gemini } from "./gemini.mjs";
import { scoreCandidate } from "./scoring.mjs";

// ─── Brand detection ──────────────────────────────────────────────────────────

const BRAND_PATTERNS = [
  [/\bcostco\b/, "COSTCO"],
  [/\bwalmart\b/, "WALMART"],
  [/\btarget\b/, "TARGET"],
  [/\bsam'?s\s+club\b/, "SAM'S CLUB"],
  [/\bsubway\b/, "SUBWAY"],
  [/\bmcdonald'?s?\b/, "MCDONALD'S"],
  [/\btaco\s+bell\b/, "TACO BELL"],
  [/\bwendy'?s\b/, "WENDY'S"],
  [/\btrader\s+joe'?s?\b/, "TRADER JOE'S"],
  [/\baldi\b/, "ALDI"],
  [/\bhome\s+depot\b/, "HOME DEPOT"],
  [/\blowe'?s\b/, "LOWE'S"],
  [/\bamazon\b/, "AMAZON"],
  [/\bbed\s+bath\b/, "BED BATH & BEYOND"],
  [/\bchurch'?s\b/, "CHURCH'S"],
  [/\bpotbelly\b/, "POTBELLY"],
  [/\bkroger\b/, "KROGER"],
  [/\bpublix\b/, "PUBLIX"],
  [/\bwhole\s+foods\b/, "WHOLE FOODS"],
  [/\bcvs\b/, "CVS"],
  [/\bwalgreens\b/, "WALGREENS"],
  [/\bdollar\s+tree\b/, "DOLLAR TREE"],
  [/\bdollar\s+general\b/, "DOLLAR GENERAL"],
  [/\bfive\s+below\b/, "FIVE BELOW"],
  [/\btj\s*maxx\b/, "TJ MAXX"],
  [/\bmarshalls\b/, "MARSHALLS"],
  [/\bross\s+dress\b|\bross\s+store\b/, "ROSS"],
  [/\bnordstrom\s+rack\b/, "NORDSTROM RACK"],
  [/\bnordstrom\b/, "NORDSTROM"],
  [/\bmacy'?s\b/, "MACY'S"],
  [/\bkohl'?s\b/, "KOHL'S"],
  [/\bbest\s+buy\b/, "BEST BUY"],
  [/\bstarbucks\b/, "STARBUCKS"],
  [/\bdunkin'?\b/, "DUNKIN'"],
  [/\bchick.?fil.?a\b/, "CHICK-FIL-A"],
  [/\bpanera\b/, "PANERA"],
  [/\bchipotle\b/, "CHIPOTLE"],
  [/\bdomino'?s\b/, "DOMINO'S"],
  [/\bpizza\s+hut\b/, "PIZZA HUT"],
  [/\bburger\s+king\b/, "BURGER KING"],
  [/\bpopeyes\b/, "POPEYES"],
  [/\bdick'?s\s+sporting\b/, "DICK'S SPORTING GOODS"],
  [/\bold\s+navy\b/, "OLD NAVY"],
  [/\bjcpenney\b|jcp\b/, "JCPENNEY"],
  [/\bsprouts\b/, "SPROUTS"],
  [/\bsafeway\b/, "SAFEWAY"],
  [/\balbertsons\b/, "ALBERTSONS"],
  [/\bh.?e.?b\b/, "HEB"],
  [/\blidl\b/, "LIDL"],
  [/\bcircle\s*k\b/, "CIRCLE K"],
  [/\b7.?eleven\b/, "7-ELEVEN"],
  [/\bpetco\b/, "PETCO"],
  [/\bpetsmart\b/, "PETSMART"],
  [/\bulta\b/, "ULTA"],
  [/\bsephora\b/, "SEPHORA"],
  [/\bbath\s+&?\s*body\b/, "BATH & BODY WORKS"],
  [/\bgap\b/, "GAP"],
  [/\bbj'?s\s+wholesale\b/, "BJ'S WHOLESALE"],
  [/\bkona\s+ice\b/, "KONA ICE"],
  [/\bqdoba\b/, "QDOBA"],
  [/\bcane'?s\b|\braising\s+cane\b/, "RAISING CANE'S"],
  [/\bsonic\b/, "SONIC"],
  [/\bdairy\s+queen\b/, "DAIRY QUEEN"],
  [/\bbuffalo\s+wild\s+wings\b|\bbww\b/, "BUFFALO WILD WINGS"],
  [/\bapplebee'?s\b/, "APPLEBEE'S"],
  [/\bdenny'?s\b/, "DENNY'S"],
  [/\bihop\b/, "IHOP"],
  [/\bcracker\s+barrel\b/, "CRACKER BARREL"],
  [/\bpapa\s+john'?s\b/, "PAPA JOHN'S"],
  [/\blittle\s+caesar'?s\b/, "LITTLE CAESARS"],
  [/\bjersey\s+mike'?s\b/, "JERSEY MIKE'S"],
  [/\bfive\s+guys\b/, "FIVE GUYS"],
  [/\bshake\s+shack\b/, "SHAKE SHACK"],
  [/\bin.?n.?out\b/, "IN-N-OUT"],
  [/\bwingstop\b/, "WINGSTOP"],
  [/\bcook\s*out\b/, "COOK OUT"],
  [/\bwhataburger\b/, "WHATABURGER"],
  [/\bpanda\s+express\b/, "PANDA EXPRESS"],
  [/\bjamba\b/, "JAMBA"],
  [/\bbaskin.?robbins\b/, "BASKIN-ROBBINS"],
  [/\bcold\s+stone\b/, "COLD STONE"],
  [/\bdollar\s+shave\b/, "DOLLAR SHAVE CLUB"],
  [/\bwayfair\b/, "WAYFAIR"],
  [/\boverstock\b/, "OVERSTOCK"],
  [/\bikea\b/, "IKEA"],
  [/\bcrate\s+&?\s*barrel\b/, "CRATE & BARREL"],
  [/\bwilliams.?sonoma\b/, "WILLIAMS SONOMA"],
  [/\bpottery\s+barn\b/, "POTTERY BARN"],
  [/\bwest\s+elm\b/, "WEST ELM"],
  [/\bautozone\b/, "AUTOZONE"],
  [/\bo'reilly\b/, "O'REILLY AUTO"],
  [/\bvictoria'?s\s+secret\b/, "VICTORIA'S SECRET"],
  [/\bh&m\b/, "H&M"],
  [/\bzara\b/, "ZARA"],
  [/\buniqlo\b/, "UNIQLO"],
  [/\bsave.?a.?lot\b/, "SAVE-A-LOT"],
  [/\bwinn.?dixie\b/, "WINN-DIXIE"],
  [/\bfood\s+lion\b/, "FOOD LION"],
  [/\bmeijer\b/, "MEIJER"],
  [/\bhyvee\b|hy-vee\b/, "HY-VEE"],
  [/\bwegmans\b/, "WEGMANS"],
  [/\bsaks\b/, "SAKS"],
  [/\bneiman\s+marcus\b/, "NEIMAN MARCUS"],
  [/\bbig\s+lots\b/, "BIG LOTS"],
  [/\bbig\s+5\b/, "BIG 5"],
  [/\bacademy\s+sports\b/, "ACADEMY SPORTS"],
  [/\brei\b/, "REI"],
  [/\bpatagonia\b/, "PATAGONIA"],
  [/\bnike\b/, "NIKE"],
  [/\badidas\b/, "ADIDAS"],
  [/\bunder\s+armour\b/, "UNDER ARMOUR"],
  [/\bverizon\b/, "VERIZON"],
  [/\bat&?t\b/, "AT&T"],
  [/\bt.?mobile\b/, "T-MOBILE"],
  [/\bboost\s+mobile\b/, "BOOST MOBILE"],
  [/\bnetflix\b/, "NETFLIX"],
  [/\bdisney\+\b|\bdisney\s+plus\b/, "DISNEY+"],
  [/\bhulu\b/, "HULU"],
  [/\bspotify\b/, "SPOTIFY"],
  [/\byoutube\s+premium\b/, "YOUTUBE PREMIUM"],
  [/\bapple\s+tv\b/, "APPLE TV+"],
  [/\bpeacock\b/, "PEACOCK"],
  [/\bmax\b|\bhbo\s+max\b/, "MAX"],
];

function inferBrand(text) {
  const lower = text.toLowerCase();
  for (const [pattern, brand] of BRAND_PATTERNS) {
    if (pattern.test(lower)) return brand;
  }
  return "RETAIL";
}

// ─── Candidate builder ────────────────────────────────────────────────────────

function urlToId(url) {
  let s = 0;
  for (let i = 0; i < url.length; i++) s = (Math.imul(31, s) + url.charCodeAt(i)) | 0;
  return (s >>> 0).toString(36);
}

function toCandidate(item, sourceId, label, index) {
  const combined = `${item.title} ${item.rawSummary}`;
  let domain = item.sourceUrl;
  try { domain = new URL(item.sourceUrl).hostname.replace(/^www\./, ""); } catch {}
  const rawPubDate = item.publishedAt || null;
  let displayDate;
  try {
    const d = new Date(rawPubDate);
    displayDate = !rawPubDate || isNaN(d.getTime())
      ? new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    displayDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  return {
    id: item.sourceUrl ? urlToId(item.sourceUrl) : `${sourceId}-${index}`,
    title: item.title,
    sourceUrl: item.sourceUrl,
    sourceDomain: domain,
    publishedAt: displayDate,
    rawPubDate,
    rawSummary: summarizeText(item.rawSummary || item.title, 280),
    brand: inferBrand(combined),
    queryLabel: label,
  };
}

// Drop anything published more than 8 days ago — no expired deals
function isRecent(rawPubDate, maxDays = 8) {
  if (!rawPubDate) return true;
  const d = new Date(rawPubDate);
  if (isNaN(d.getTime())) return true; // unparseable = let through
  return (Date.now() - d.getTime()) < maxDays * 24 * 60 * 60 * 1000;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchRss(url, timeoutMs = 8000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchFeed(id, url, label, limit = 10) {
  try {
    const xml = await fetchRss(url);
    return parseRssItems(xml).slice(0, limit).map((item, i) => toCandidate(item, id, label, i));
  } catch (e) {
    console.warn(`[pipeline] ${label} failed:`, e.message);
    return [];
  }
}

async function fetchGoogleNews(maxPerQuery = 3) {
  const allItems = [];
  for (const query of discoveryQueries) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query.query)}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const xml = await fetchRss(url);
      const items = parseRssItems(xml).slice(0, maxPerQuery).map((item, i) => toCandidate(item, query.id, query.label, i));
      allItems.push(...items);
    } catch (e) {
      console.warn(`[pipeline] Google News "${query.label}" failed:`, e.message);
    }
  }
  return allItems;
}

// ─── Pre-filter (hard kills only — AI handles relevance judgment) ─────────────

// Only cut things that are definitively off-topic — no deal on earth makes these relevant
const HARD_SKIP = [
  /\binvestor\b|\bstock\b|\bearnings\b|\bshares\b|\bipo\b|\bwall\s+street\b/i,
  /\belection\b|\bcongress\b|\bsupreme\s+court\b|\bpolitics?\b|\bsenate\b|\bhouse\s+bill\b/i,
  /\bnfl\b|\bnba\b|\bnhl\b|\bmlb\b|\bnascar\b/i,
  /\breal\s+estate\b|\bmortgage\b|\bforeclosure\b/i,
  /\bcryptocurrency\b|\bcrypto\b|\bbitcoin\b|\bnft\b/i,
  /\bwar\b|\bmilitary\b|\bterror\b|\battack\b/i,
  /\bhow to (save|shop|get|find|use)\b/i,
  /\btips? (for|to|on)\b|\bbest ways? to\b|\bguide to\b/i,
  /\bbudget(ing)?\s+(tips?|advice|guide|hack)\b/i,
];

function titleFingerprint(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => !["a","an","the","to","in","on","at","for","of","and","or","is","are","with","get","how","you","your"].includes(w))
    .slice(0, 6)
    .join(" ");
}

// Build a "deal fingerprint" — brand + the core deal words — to catch duplicate
// coverage of the same event from different outlets (e.g. 3 sites all posting about
// Dairy Queen free cone day → keep only the first one).
function dealFingerprint(candidate) {
  const stopWords = new Set(["a","an","the","to","in","on","at","for","of","and","or","is","are","with","get","how","you","your","its","this","that","from","by","be","was","were","has","have","will","can","all","new","one","two","per","day","week","now","just","via","over","up","off","out","into","free","deal","deals","offer","offers","promotion","limited","time","today","tomorrow"]);
  const words = candidate.title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => !stopWords.has(w) && w.length > 2)
    .slice(0, 5)
    .join(" ");
  return `${candidate.brand}:${words}`;
}

function preFilter(candidates) {
  const seenUrls = new Set();
  const seenTitleFps = new Set();
  const seenDealFps = new Set();
  const brandCount = {};

  return candidates.filter((c) => {
    const text = `${c.title} ${c.rawSummary}`.toLowerCase();

    // Hard date cutoff — nothing older than 8 days
    if (!isRecent(c.rawPubDate)) return false;
    // Hard kill — definitively off-topic
    if (HARD_SKIP.some((p) => p.test(text))) return false;
    // Must be a recognized brand
    if (c.brand === "RETAIL") return false;
    // URL dedup
    if (seenUrls.has(c.sourceUrl)) return false;
    seenUrls.add(c.sourceUrl);
    // Title similarity dedup
    const titleFp = titleFingerprint(c.title);
    if (seenTitleFps.has(titleFp)) return false;
    seenTitleFps.add(titleFp);
    // Same-deal dedup across outlets — cap at 1 article per brand+deal combo
    const dealFp = dealFingerprint(c);
    if (seenDealFps.has(dealFp)) return false;
    seenDealFps.add(dealFp);
    // Cap at 2 stories per brand so one brand can't flood the feed
    const bc = brandCount[c.brand] || 0;
    if (bc >= 2) return false;
    brandCount[c.brand] = bc + 1;

    return true;
  }).slice(0, 25);
}

// ─── Brave news search ────────────────────────────────────────────────────────

function braveQueries() {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const my = `${month} ${year}`;
  return [
    // New menu items & returning favorites
    `restaurant "new menu" OR "new item" OR "launches" OR "debuts" ${my}`,
    `"coming back" OR "returns to menu" OR "back permanently" restaurant ${my}`,
    `fast food "limited edition" OR "themed menu" OR "collab" ${my}`,
    // Free food & deals
    `free food restaurant deal promotion ${my}`,
    `"free" food "named" OR "nurses" OR "teachers" OR "military" restaurant ${my}`,
    `"national" day free food restaurant deal ${my}`,
    `"free taco" OR "free burger" OR "free pizza" OR "free sandwich" ${my}`,
    `BOGO OR "buy one get one" restaurant fast food ${my}`,
    `"$1" OR "$2" OR "$3" meal deal restaurant fast food ${my}`,
    // Brand-specific
    `McDonald's new deal promotion launch ${my}`,
    `Starbucks deal BOGO free promotion ${my}`,
    `Costco deal new item price change ${my}`,
    `Chipotle Popeyes "Burger King" "Shake Shack" deal promotion ${my}`,
    `"Red Lobster" OR "Olive Garden" OR "Applebee's" deal promo ${my}`,
    // Recalls & safety
    `FDA CPSC recall consumer food product safety ${my}`,
    `food recall contamination salmonella allergy warning ${my}`,
    // Store & service news
    `"store closing" OR bankruptcy OR "going out of business" retail ${year}`,
    `"price increase" OR "membership fee" OR "now free" major brand ${my}`,
    `"new partnership" OR "now delivers" OR "available on" brand store ${my}`,
    // Seasonal
    `"Mother's Day" free food deal restaurant ${year}`,
    `"nurses week" OR "teacher appreciation" free deal restaurant ${year}`,
  ];
}

async function fetchBraveNews(apiKey) {
  const queries = braveQueries();
  // Run in batches of 10 to avoid rate limits
  const allItems = [];
  for (let i = 0; i < queries.length; i += 10) {
    const batch = queries.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(async (q) => {
        const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(q)}&count=5&freshness=pw`;
        const res = await fetch(url, {
          headers: { "Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": apiKey },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []).map((item, i) => toCandidate(
          {
            title: item.title,
            sourceUrl: item.url,
            // Brave "age" can be "3 hours ago" (unparseable) or an ISO string.
            // If it can't be parsed as a date, substitute today — freshness=pw
            // already guarantees results are ≤7 days old.
            publishedAt: (() => {
              if (!item.age) return null;
              const d = new Date(item.age);
              return isNaN(d.getTime()) ? new Date().toISOString() : item.age;
            })(),
            rawSummary: item.description || item.title,
          },
          `brave-${q.slice(0, 20)}`,
          `Brave: ${q}`,
          i,
        ));
      })
    );
    results.forEach((r) => { if (r.status === "fulfilled") allItems.push(...r.value); });
  }
  return allItems;
}

// ─── All sources ──────────────────────────────────────────────────────────────

async function fetchAllSources(env = {}) {
  const braveKey = env.BRAVE_API_KEY;
  const results = await Promise.allSettled([
    fetchGoogleNews(3),
    braveKey ? fetchBraveNews(braveKey) : Promise.resolve([]),
    // ── High-quality consumer news outlets ────────────────────────────────────
    fetchFeed("people-food",   "https://people.com/food/feed/",                               "People Food",         15),
    fetchFeed("people-shop",   "https://people.com/shopping/feed/",                           "People Shopping",     10),
    fetchFeed("today-food",    "https://feeds.today.com/rss/food",                            "Today Food",          10),
    fetchFeed("delish",        "https://www.delish.com/rss/all.xml",                          "Delish",              10),
    fetchFeed("eater",         "https://www.eater.com/rss/index.xml",                         "Eater",               10),
    fetchFeed("good-house",    "https://www.goodhousekeeping.com/food-news/rss/",             "Good Housekeeping",    8),
    // ── Restaurant & fast food news ───────────────────────────────────────────
    fetchFeed("brand-eating",  "https://www.brandeating.com/feeds/posts/default",             "Brand Eating",        15),
    fetchFeed("chew-boom",     "https://www.chewboom.com/feed/",                              "Chew Boom",           15),
    fetchFeed("fast-food-post","https://www.fastfoodpost.com/feed/",                          "Fast Food Post",      12),
    // ── Consumer deals & advocacy ─────────────────────────────────────────────
    fetchFeed("clark-howard",  "https://clark.com/feed/",                                     "Clark Howard",        10),
    fetchFeed("penny-hoarder", "https://www.thepennyhoarder.com/feed/",                       "The Penny Hoarder",   10),
    fetchFeed("hip2save",      "https://hip2save.com/feed/",                                  "Hip2Save",            12),
    fetchFeed("slickdeals",    "https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1", "Slickdeals", 12),
    fetchFeed("dealnews",      "https://dealnews.com/featured/rss.xml",                       "DealNews",            10),
    fetchFeed("retailmenot",   "https://www.retailmenot.com/blog/feed",                       "RetailMeNot Blog",     8),
    fetchFeed("krazy-coupon",  "https://thekrazycouponlady.com/feed",                         "Krazy Coupon Lady",   10),
  ]);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// ─── Combined filter + headline (single AI call) ─────────────────────────────

const COMBINED_PROMPT = `You are a consumer news researcher and copywriter for a Facebook/Instagram page targeting viewers age 50+ (many age 75+).

You receive a JSON array of recent news articles. In ONE pass: pick the best ones AND write the Instagram headline for each.

PICK IT if it's one of these:
1. Big brand deals: free food, BOGO, $1 deals, free items, rewards/app deals, teacher/nurse/military/senior appreciation, holiday promos
2. Consumer alerts: food or product recalls — burn, choking, poisoning, contamination, injury, fire, vision loss
3. Brand news people care about: new menu items, returning favorites, price changes, store closings, membership changes, policy changes
4. Consumer controversy: hidden fees, surveillance pricing, misleading labels, data breaches, class action lawsuits
5. Free events: free admission, free store classes, free workshops

PRIORITIZE: Costco, Walmart, Target, Amazon, McDonald's, Starbucks, Chipotle, Chick-fil-A, Taco Bell, Burger King, Subway, Wendy's, Domino's, Pizza Hut, Popeyes, Shake Shack, Red Lobster, Applebee's, Olive Garden, Dairy Queen, Dunkin', Krispy Kreme, CVS, Walgreens, Home Depot, Lowe's, Best Buy, Disney+, Netflix

SKIP IT if: expired deal, vague/no brand, coupon code, how-to listicle, B2B industry news, hyperlocal

HEADLINE FORMAT for each picked story — 3 plain-English phrases, one per JSON field:
- "brand": the brand name in ALL CAPS (e.g. "CHIPOTLE"). Multi-retailer recall/sale: "AMAZON / WALMART / TARGET"
- "offer": 3–7 words, the core deal/news hook. Specific product/price/action. No punctuation. Lowercase.
- "detail": 2–6 words, the key condition/date/location. No punctuation. Lowercase. Empty string "" if nothing concrete.

RULES:
- Use exact prices, products, and dates from the article — never invent
- Never repeat the brand name in offer or detail
- For recalls: name the exact product and danger plainly ("possible salmonella risk" not "health concerns")
- For lawsuits: "lawsuit claims" / "accused of" — never state allegations as fact
- For deals with no specific end date: use "" for detail rather than guessing

EXAMPLES:
"McDonald's launches Stranger Things Happy Meal on May 5th"
→ {"id":"...","brand":"MCDONALD'S","offer":"stranger things happy meal","detail":"launches may 5th"}

"Chipotle testing $2.50 tacos through June 2nd at select Tampa/Orlando/KC locations"
→ {"id":"...","brand":"CHIPOTLE","offer":"2.50 tacos","detail":"through june 2nd select locations"}

"Red Lobster brings back Endless Shrimp after bankruptcy"
→ {"id":"...","brand":"RED LOBSTER","offer":"endless shrimp is back","detail":"for a limited time"}

"Firehouse Subs giving free subs to anyone named Mike on May 6th only"
→ {"id":"...","brand":"FIREHOUSE SUBS","offer":"free subs for people named mike","detail":"may 6th only"}

"Shake Shack free burger weekly in May with any $10+ purchase"
→ {"id":"...","brand":"SHAKE SHACK","offer":"free burgers every week","detail":"with 10 dollar plus purchase all may"}

"Thermos recalling 8.2 million jars after vision loss injuries"
→ {"id":"...","brand":"THERMOS","offer":"8.2 million jars recalled","detail":"vision loss injuries reported"}

"Costco updating $1.50 hot dog combo — water now an option"
→ {"id":"...","brand":"COSTCO","offer":"1.50 hot dog combo updated","detail":"water now an option"}

Return ONLY a JSON array of the stories you picked (max 12). Empty array [] if nothing qualifies. No other text.
[{"id":"...","brand":"...","offer":"...","detail":"..."}, ...]`;

// ─── Headline formatter (used by pipeline + /api/headline endpoint) ───────────

const EXTRACT_PROMPT = `You write on-image headline text for a consumer news Facebook/Instagram page targeting viewers age 50+ (many 75+).

Given an article, extract two plain-English phrases that will become lines 2 and 3 of a 3-line ALL CAPS graphic headline. Line 1 is always the brand name (handled separately).

- "brand": line 1 — the brand name(s) in ALL CAPS. If one brand, just that name (e.g. "CHIPOTLE"). If a product is sold or recalled at multiple major retailers, list up to 3 separated by " / " (e.g. "AMAZON / WALMART / TARGET"). Use the shortest recognizable form.
- "offer": line 2 — the core deal, alert, or news hook in 3–7 words. No punctuation, no caps. Be specific — use the exact product name, price, or action. Never vague.
- "detail": line 3 — the key condition, date, location, or context in 2–6 words. No punctuation, no caps. Use exact dates when available. Empty string if nothing meaningful to add.

LINE BREAK RULES (critical):
- Each line must be a complete chunk of meaning
- Never split a number from what it describes ("$2.50 tacos" stays together)
- Never cut a phrase mid-thought

STYLE RULES:
- Be blunt and specific. Name the exact product/price/danger
- For recalls: name the exact product and danger in plain language (e.g. "possible salmonella risk" not "health concerns"); include where sold if relevant
- For lawsuits: use "lawsuit claims" / "accused of" / "state claims" / "customers report" — NEVER state allegations as proven
- For safety: reference the authority when relevant (e.g. "cpsc says stop using" / "fda warning issued")
- For deals: include exact dates, purchase requirement, app/rewards/ID requirement, "select locations" when applicable
- Avoid: "prices are rising" / "stores are changing" / "consumers are upset" / "limited time" unless no better date exists
- NEVER repeat the brand name in offer or detail — it is already on line 1
- NEVER invent facts, dates, or conditions not in the article
- If there is no meaningful detail (no date, location, or condition), return an empty string for detail — do NOT pad with "available now" or "at participating locations" unless the article says so

BAD vs GOOD EXAMPLES:

Bad: {"offer": "chocolate products recall", "detail": "allergy risk"}
Good: {"offer": "hot cocoa mixes recalled", "detail": "possible salmonella risk"}

Bad: {"offer": "ticket prices changing", "detail": "travelers may pay more"}
Good: {"offer": "sued for surveillance pricing", "detail": "fares may change based on your data"}

Bad: {"offer": "2.50", "detail": "tacos through june 2nd"}
Good: {"offer": "2.50 tacos", "detail": "through june 2nd at select locations"}

EXAMPLES (showing offer → detail pairs):

Article: "Shake Shack is giving away a free burger every week in May with any $10+ purchase"
→ {"offer": "free burgers every week", "detail": "with 10 dollar plus purchase all may"}

Article: "Chipotle is testing $2.50 tacos through June 2nd at select locations"
→ {"offer": "2.50 tacos", "detail": "through june 2nd at select locations"}

Article: "CPSC warns consumers to immediately stop using Gourmia pressure cookers sold at Best Buy after burn injuries"
→ {"offer": "pressure cookers warning", "detail": "cpsc says stop using immediately"}

Article: "Thermos is recalling 8.2 million jars after reports of vision loss injuries"
→ {"offer": "8.2 million jars recalled", "detail": "vision loss injuries reported"}

Article: "Trader Joe's is being sued over its low acid coffee label, with the lawsuit claiming it misled buyers"
→ {"offer": "sued over low acid coffee", "detail": "lawsuit claims label misled buyers"}

Article: "Bank of America cardholders get free admission to 150+ museums May 2nd–3rd"
→ {"offer": "free admission to 150 plus museums", "detail": "may 2nd and 3rd for cardholders"}

Article: "Firehouse Subs is giving free subs to anyone named Mike on May 6th only"
→ {"offer": "free subs for people named mike", "detail": "may 6th only"}

Article: "Costco is updating the $1.50 hot dog combo — water is now an option instead of soda"
→ {"offer": "1.50 hot dog combo updated", "detail": "water now an option"}

Article: "Instacart is ending AI pricing tests after a Consumer Reports investigation"
→ {"offer": "ends ai pricing tests", "detail": "after consumer reports investigation"}

Only use facts from the article. Return ONLY valid JSON, no other text: {"brand":"...","offer":"...","detail":"..."}`;

function formatHeadlineFromFacts(brand, offer, detail) {
  const up = (s) => s.toUpperCase().trim();

  const normalize = (s) => s
    .replace(/\b(\d+)\s+dollars?\b/gi, "$$1")
    .replace(/\bjust\s+(\d)/gi, "$$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Only strip the brand name from offer/detail if the result is still non-empty
  const brandEscaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const brandRe = new RegExp(`^\\s*${brandEscaped}\\s*$`, "i");

  const offerClean = normalize(offer);
  const detailClean = normalize(detail);

  // Drop offer/detail only if it's SOLELY the brand name repeated — not if brand appears mid-phrase
  const offerUp = brandRe.test(offerClean) ? "" : up(offerClean);
  const detailUp = brandRe.test(detailClean) ? "" : up(detailClean);

  const lines = [up(brand), offerUp || null, detailUp || null].filter(Boolean);
  return lines.join("\n");
}

function fallbackHeadlineForCandidate(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  const title = String(candidate.title || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  const price = title.match(/\$\s?\d+(?:\.\d{2})?/);
  const date = title.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b/i);

  let offer = "consumer alert";
  let detail = "";

  if (/\brecall(?:ed|s)?\b|\bcpsc\b|\bfda\b|\bwarning\b/.test(text)) {
    offer = "recall alert";
    detail = /\bsalmonella|listeria|allergy|contamination|burn|injury|fire\b/.test(text)
      ? "check your home"
      : "new warning issued";
  } else if (/\bbogo\b|buy one get one/.test(text)) {
    offer = "bogo deal";
    detail = date ? date[0] : "limited time";
  } else if (/\bfree\b/.test(text)) {
    const freePhrase = title.match(/\bfree\s+[a-z0-9$.'-]+(?:\s+[a-z0-9$.'-]+){0,4}/i);
    offer = freePhrase ? freePhrase[0] : "free deal";
    detail = date ? date[0] : "limited time";
    if (date && offer.toLowerCase().includes(date[0].toLowerCase())) {
      offer = offer.replace(new RegExp(date[0], "i"), "").replace(/\s+/g, " ").trim();
    }
  } else if (price) {
    offer = `${price[0].replace(/\s+/g, "")} deal`;
    detail = date ? date[0] : "available now";
  } else if (/\bclosing|bankruptcy|shutting down\b/.test(text)) {
    offer = "stores closing";
    detail = "new list released";
  } else if (/\bnew\b|\blaunch|\breturns?\b|\bback\b/.test(text)) {
    offer = /\bmenu\b|restaurant|burger|taco|pizza|coffee|sandwich/.test(text)
      ? "new menu update"
      : "new update";
    detail = date ? date[0] : "available now";
  } else if (/\bdeal|discount|save|sale|offer|promo/.test(text)) {
    offer = "deal alert";
    detail = date ? date[0] : "available now";
  }

  return formatHeadlineFromFacts(candidate.brand, offer, detail);
}

function fallbackStoriesWithHeadlines(candidates, limit = 12) {
  const scored = candidates
    .map(scoreCandidate)
    .sort((left, right) => right.weightedTotal - left.weightedTotal);
  const selected = [];
  const brandCounts = new Map();

  for (const candidate of scored) {
    const brand = candidate.brand || "RETAIL";
    const count = brandCounts.get(brand) || 0;
    if (count >= 2) continue;

    const headline = fallbackHeadlineForCandidate(candidate);
    if (!headline.includes("\n")) continue;
    selected.push({ ...candidate, headline, headlineProvider: "fallback" });
    brandCounts.set(brand, count + 1);

    if (selected.length >= limit) break;
  }

  return selected;
}

function aiUnavailableMessage(error) {
  return /rate limit|429|quota/i.test(error?.message || "")
    ? "AI is rate-limited — using fallback headlines…"
    : "AI is unavailable — using fallback headlines…";
}

export async function writeHeadline(candidate, keys) {
  const article = `Title: ${candidate.title}\nSummary: ${candidate.rawSummary}`;
  let text;
  try {
    text = await gemini(EXTRACT_PROMPT, article, keys, { maxTokens: 300 });
  } catch (e) {
    console.warn(`[pipeline] Headline AI unavailable for "${candidate.title}":`, e.message);
    return fallbackHeadlineForCandidate(candidate);
  }
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error("No JSON in headline response");
  const { brand, offer, detail } = JSON.parse(match[0]);
  if (!offer) throw new Error("Empty offer in headline response");
  const headline = formatHeadlineFromFacts(brand || candidate.brand, offer, detail || "");
  if (!headline.includes("\n")) throw new Error("Headline collapsed to single line");
  return headline;
}

async function filterAndRewriteWithAI(candidates, keys, progress) {
  progress("Reading today's stories…", 40);
  const payload = candidates.map((c) => ({ id: c.id, brand: c.brand, title: c.title, summary: c.rawSummary }));
  const text = await gemini(COMBINED_PROMPT, JSON.stringify(payload), keys, { maxTokens: 3000 });
  progress("Formatting headlines…", 80);

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array in AI response");
  const picked = JSON.parse(match[0]);
  if (!Array.isArray(picked)) throw new Error("AI response was not an array");

  const withHeadlines = [];
  for (const item of picked) {
    const candidate = candidates.find((c) => c.id === item.id);
    if (!candidate || !item.offer) continue;
    try {
      const headline = formatHeadlineFromFacts(item.brand || candidate.brand, item.offer, item.detail || "");
      if (!headline.includes("\n")) continue;
      withHeadlines.push({ ...candidate, headline });
    } catch (e) {
      console.warn(`[pipeline] Headline format failed for "${candidate.title}":`, e.message);
    }
  }
  console.log(`[pipeline] AI picked ${withHeadlines.length} / ${candidates.length} candidates`);
  return withHeadlines;
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours
const FALLBACK_CACHE_TTL = 15 * 60 * 1000; // retry AI soon after rate limits clear
let _cacheTtl = CACHE_TTL;

export async function fetchStories(progress = () => {}) {
  if (_cache && Date.now() - _cacheAt < _cacheTtl) {
    progress("Loading today's stories…", 100);
    return _cache;
  }

  progress("Scanning news feeds…", 5);
  const all = await fetchAllSources(process.env);
  progress(`Scanning ${all.length} articles — picking the best ones…`, 30);
  const candidates = preFilter(all);
  console.log(`[pipeline] ${all.length} raw → ${candidates.length} after pre-filter`);

  const keys = { geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
  if (keys.geminiKey || keys.groqKey) {
    try {
      const results = await filterAndRewriteWithAI(candidates, keys, progress);
      progress(`Done — ${results.length} stories ready`, 100);
      console.log(`[pipeline] ${results.length} stories with headlines`);
      _cache = results;
      _cacheAt = Date.now();
      _cacheTtl = CACHE_TTL;
      return results;
    } catch (e) {
      const fallback = fallbackStoriesWithHeadlines(candidates);
      if (fallback.length > 0) {
        const message = aiUnavailableMessage(e);
        progress(message, 85);
        progress(`Done — ${fallback.length} fallback stories ready`, 100);
        console.warn(`[pipeline] AI pipeline unavailable, using fallback headlines: ${e.message}`);
        _cache = fallback;
        _cacheAt = Date.now();
        _cacheTtl = FALLBACK_CACHE_TTL;
        return fallback;
      }
      throw new Error("AI is temporarily unavailable and no fallback stories were available. Try again in a few minutes.");
    }
  }

  const fallback = fallbackStoriesWithHeadlines(candidates);
  if (fallback.length > 0) {
    progress(`Done — ${fallback.length} fallback stories ready`, 100);
    _cache = fallback;
    _cacheAt = Date.now();
    _cacheTtl = FALLBACK_CACHE_TTL;
    return fallback;
  }

  throw new Error("No AI API key configured and no fallback stories were available.");
}

// ─── Image search ─────────────────────────────────────────────────────────────

function isUsableImage(info) {
  if (!info) return false;
  const mime = info.mime || "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return false;
  const { width, height } = info;
  if (width && height) {
    const ratio = height / width;
    if (ratio < 0.25 || ratio > 3) return false; // skip extreme panoramas / tall crops
    if (width < 400) return false; // skip low-res
  }
  return true;
}

// Source 1: Wikipedia page images — very reliable for major brands
async function fetchWikipediaImages(brandName) {
  const params = new URLSearchParams({
    action: "query",
    titles: brandName,
    prop: "pageimages|images",
    pithumbsize: "1200",
    pilimit: "3",
    imlimit: "20",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  const urls = [];
  for (const page of pages) {
    // Main thumbnail
    if (page.thumbnail?.source) urls.push(page.thumbnail.source);
  }
  return urls;
}

// Source 2: Wikimedia Commons text search
async function fetchCommonsImages(query) {
  const searchParams = new URLSearchParams({
    action: "query", list: "search", srsearch: query,
    srnamespace: "6", format: "json", srlimit: "20", origin: "*",
  });
  const searchRes = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams}`, { signal: AbortSignal.timeout(8000) });
  const searchData = await searchRes.json();
  const titles = (searchData.query?.search || []).map((r) => r.title);
  if (titles.length === 0) return [];

  const infoParams = new URLSearchParams({
    action: "query", titles: titles.join("|"),
    prop: "imageinfo", iiprop: "url|mime|size|thumburl", iiurlwidth: "1200",
    format: "json", origin: "*",
  });
  const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`, { signal: AbortSignal.timeout(8000) });
  const infoData = await infoRes.json();

  return Object.values(infoData.query?.pages || {})
    .filter((page) => isUsableImage(page.imageinfo?.[0]))
    .map((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url)
    .filter(Boolean);
}

export async function searchImages(q) {
  // q is the brand name (e.g. "MCDONALD'S" or "DAIRY QUEEN")
  // Normalize to title case for Wikipedia lookup
  const brandName = q.replace(/[^a-zA-Z0-9'& ]/g, " ").trim();
  const titleCase = brandName.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

  const [wikiUrls, commonsUrls] = await Promise.allSettled([
    fetchWikipediaImages(titleCase),
    fetchCommonsImages(brandName),
  ]).then((results) => results.map((r) => (r.status === "fulfilled" ? r.value : [])));

  // Merge, deduplicate, cap at 8
  const seen = new Set();
  const merged = [];
  for (const url of [...wikiUrls, ...commonsUrls]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    merged.push(url);
    if (merged.length >= 8) break;
  }
  return merged;
}
