import { parseRssItems } from "./rss.mjs";
import { summarizeText } from "./text.mjs";
import { discoveryQueries } from "../config/discoveryQueries.mjs";

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
  const date = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return {
    id: item.sourceUrl ? urlToId(item.sourceUrl) : `${sourceId}-${index}`,
    title: item.title,
    sourceUrl: item.sourceUrl,
    sourceDomain: domain,
    publishedAt: date,
    rawSummary: summarizeText(item.rawSummary || item.title, 280),
    brand: inferBrand(combined),
    queryLabel: label,
  };
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
  }).slice(0, 15); // 15 candidates — small batch prevents token overrun and word-scrambling
}

// ─── Brave news search ────────────────────────────────────────────────────────

const BRAVE_SEARCH_QUERIES = [
  "consumer recall this week",
  "CPSC recall May 2026",
  "FDA recall May 2026",
  "fast food deals this week",
  "restaurant free food this week",
  "food freebies May 2026",
  "retail deals May 2026",
  "consumer lawsuit hidden fees 2026",
  "data breach customers 2026",
  "misleading label lawsuit 2026",
  "surveillance pricing lawsuit 2026",
  "teacher appreciation deals 2026",
  "nurses week deals 2026",
  "Mother's Day deals 2026",
  "free museum admission May 2026",
  "Costco news this week",
  "Walmart recall this week",
  "Target deals this week",
  "Amazon products recalled",
];

async function fetchBraveNews(apiKey) {
  const allItems = [];
  // Run a sample of queries concurrently (cap at 6 to avoid rate limits)
  const queries = BRAVE_SEARCH_QUERIES.slice(0, 6);
  const results = await Promise.allSettled(
    queries.map(async (q) => {
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
          publishedAt: item.age || null,
          rawSummary: item.description || item.title,
        },
        `brave-${q.slice(0, 20)}`,
        `Brave: ${q}`,
        i,
      ));
    })
  );
  results.forEach((r) => { if (r.status === "fulfilled") allItems.push(...r.value); });
  return allItems;
}

// ─── All sources ──────────────────────────────────────────────────────────────

async function fetchAllSources(env = {}) {
  const braveKey = env.BRAVE_API_KEY;
  const results = await Promise.allSettled([
    fetchGoogleNews(3),
    braveKey ? fetchBraveNews(braveKey) : Promise.resolve([]),
    fetchFeed("slickdeals",    "https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1", "Slickdeals",          12),
    fetchFeed("dealnews",      "https://dealnews.com/featured/rss.xml",                                                    "DealNews",            10),
    fetchFeed("brads-deals",   "https://www.bradsdeals.com/blog/feed/",                                                    "Brad's Deals",         8),
    fetchFeed("dealsplus",     "https://www.dealsplus.com/rss",                                                            "DealsPlus",            8),
    fetchFeed("woot",          "https://deals.woot.com/rss",                                                               "Woot",                 8),
    fetchFeed("hip2save",      "https://hip2save.com/feed/",                                                               "Hip2Save",            12),
    fetchFeed("krazy-coupon",  "https://thekrazycouponlady.com/feed",                                                      "Krazy Coupon Lady",   10),
    fetchFeed("money-mom",     "https://moneysavingmom.com/feed/",                                                         "Money Saving Mom",    10),
    fetchFeed("living-rich",   "https://www.livingrichwithcoupons.com/feed/",                                              "Living Rich",          8),
    fetchFeed("hunt4freebies", "https://www.hunt4freebies.com/feed/",                                                      "Hunt4Freebies",       10),
    fetchFeed("freebieshark",  "https://www.freebieshark.com/feed/",                                                       "FreebieSHARK",        10),
    fetchFeed("freeflys",      "https://freeflys.com/feed/",                                                               "Freeflys",            10),
    fetchFeed("freebies2deals","https://www.freebies2deals.com/feed/",                                                     "Freebies2Deals",      10),
    fetchFeed("totally-free",  "https://www.totallyfreestuff.com/rss.asp",                                                 "Totally Free Stuff",  10),
    fetchFeed("freebie-guy",   "https://www.thefreebieguy.com/feed/",                                                      "The Freebie Guy",     10),
    fetchFeed("lord-savings",  "https://lordofsavings.com/feed/",                                                          "Lord of Savings",     10),
    fetchFeed("stretching",    "https://stretchingabuck.com/feed/",                                                        "Stretching a Buck",    8),
    fetchFeed("southern",      "https://www.southernsavers.com/feed/",                                                     "Southern Savers",      8),
    fetchFeed("passion",       "https://www.passionforsavings.com/feed/",                                                  "Passion for Savings",  8),
    fetchFeed("saving-simple", "https://savingsaidsimply.com/feed/",                                                       "Saving Said Simply",   8),
    fetchFeed("saving-dollars","https://savingdollarsandsense.com/feed/",                                                  "Saving Dollars",       8),
    fetchFeed("iheart-publix", "https://www.iheartpublix.com/feed/",                                                       "I Heart Publix",       8),
    fetchFeed("penny-hoarder", "https://www.thepennyhoarder.com/feed/",                                                    "The Penny Hoarder",    8),
    fetchFeed("clark-howard",  "https://clark.com/feed/",                                                                  "Clark Howard",         8),
    fetchFeed("retailmenot",   "https://www.retailmenot.com/blog/feed",                                                    "RetailMeNot Blog",     8),
    fetchFeed("thestreet",     "https://www.thestreet.com/rss/news.rss",                                                   "The Street",           8),
    fetchFeed("retail-dive",   "https://www.retaildive.com/feeds/news/",                                                   "Retail Dive",          8),
    fetchFeed("grocery-dive",  "https://www.grocerydive.com/feeds/news/",                                                  "Grocery Dive",         8),
    fetchFeed("qsr-mag",       "https://www.qsrmagazine.com/rss.xml",                                                     "QSR Magazine",         8),
    fetchFeed("rest-business", "https://www.restaurantbusinessonline.com/rss.xml",                                        "Restaurant Business",  8),
    fetchFeed("nrn",           "https://www.nrn.com/rss.xml",                                                             "Nation's Restaurant News", 8),
    fetchFeed("supermarket-news","https://www.supermarketnews.com/rss/news",                                               "Supermarket News",     6),
    fetchFeed("reddit-deals",  "https://www.reddit.com/r/deals/hot.rss?limit=15",                                         "r/deals",             10),
    fetchFeed("reddit-frugal", "https://www.reddit.com/r/frugal/hot.rss?limit=15",                                        "r/frugal",             8),
    fetchFeed("reddit-free",   "https://www.reddit.com/r/freebies/hot.rss?limit=15",                                      "r/freebies",          12),
    fetchFeed("reddit-coupon", "https://www.reddit.com/r/coupons/hot.rss?limit=10",                                       "r/coupons",            8),
    fetchFeed("reddit-efree",  "https://www.reddit.com/r/eFreebies/hot.rss?limit=10",                                     "r/eFreebies",          8),
    // ── Fast food & restaurant deal news ──────────────────────────────────────
    fetchFeed("brand-eating",  "https://www.brandeating.com/feeds/posts/default",                                         "Brand Eating",        12),
    fetchFeed("chew-boom",     "https://www.chewboom.com/feed/",                                                          "Chew Boom",           12),
    fetchFeed("fast-food-post","https://www.fastfoodpost.com/feed/",                                                      "Fast Food Post",      10),
  ]);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// ─── AI headline rewriter ─────────────────────────────────────────────────────

// ─── Pass 1: relevance filter ─────────────────────────────────────────────────

const FILTER_PROMPT = `You are the content curator for a Facebook/Instagram consumer news page targeting viewers age 50+ (many 75+).

You will receive a JSON array of articles. For each one, decide: is this worth posting as a single-slide graphic?

POST IT if it fits one of these categories:

1. BIG BRAND DEALS: free food, BOGO, $1 deals, free items with purchase, rewards member offers, teacher/nurse/senior/military appreciation deals, holiday or seasonal promos, deals active for several days or weeks
2. CONSUMER ALERTS: recalls involving household products, food safety, child safety — especially burn, choking, poisoning, contamination, injury, fire, or vision-loss risks; "check your pantry/medicine cabinet/home" stories
3. BRAND NEWS PEOPLE CAN USE: new menu items, famous deals changing, major company rule changes, rewards changes, pricing changes, delivery or return policy changes, store access/membership changes
4. CONSUMER CONTROVERSY: hidden fees, AI pricing, surveillance pricing, misleading labels, fake discounts, data breaches, scam ads, overcharge claims, lawsuits involving recognizable companies
5. FREE LOCAL-STYLE NATIONAL EVENTS: free museum admission, kids workshops, free store events, free classes, teen summer passes, free collectibles

PRIORITIZE these brands: Costco, Walmart, Target, Amazon, Sam's Club, Trader Joe's, Aldi, Kroger, Publix, CVS, Walgreens, Home Depot, Lowe's, Best Buy, Starbucks, McDonald's, Taco Bell, Subway, Domino's, Chipotle, Wendy's, Chick-fil-A, Shake Shack, Burger King, Popeyes, KFC, Cinnabon, Firehouse Subs, Insomnia Cookies, Raising Cane's, Whataburger, Olive Garden, Applebee's, Red Lobster, TGI Fridays, Chili's, Pizza Hut, Dairy Queen, Dunkin', Krispy Kreme, Panera, JetBlue, Delta, United, Southwest, Uber, DoorDash, Netflix, Disney+, Apple, Samsung, Bank of America, Planet Fitness, LEGO

SKIP IT if:
✗ Vague trend with no specific brand, product, price, or date
✗ Expired deal
✗ Tiny niche coupon code or weak discount
✗ Complicated antitrust story with no clear consumer impact
✗ How-to / tips / listicle content
✗ No clear consumer impact for everyday people
✗ Hyperlocal story unless it involves a very recognizable national brand

If multiple articles cover the exact same deal, mark only the best-sourced one as relevant.

FINAL CHECK: Ask yourself — "Would a 65-year-old understand this instantly and care enough to click, share, or save it?" Only mark relevant:true if yes.

Return ONLY a JSON array, one entry per input item, no other text:
[{"id":"...","relevant":true},{"id":"...","relevant":false}]`;

async function filterRelevance(candidates, apiKey) {
  const payload = candidates.map((c) => ({ id: c.id, brand: c.brand, title: c.title, summary: c.rawSummary }));
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 32768,
      messages: [
        { role: "system", content: FILTER_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Groq filter ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON in filter response");
  return JSON.parse(match[0]);
}

// ─── Pass 2: fact extractor — AI extracts raw facts, code formats them ────────

const EXTRACT_PROMPT = `You write on-image headline text for a consumer news Facebook/Instagram page targeting viewers age 50+ (many 75+).

Given an article, extract two plain-English phrases that will become lines 2 and 3 of a 3-line ALL CAPS graphic headline. Line 1 is always the brand name (handled separately).

- "offer": line 2 — the core deal, alert, or news hook in 3–7 words. No punctuation, no caps. Be specific — use the exact product name, price, or action. Never vague.
- "detail": line 3 — the key condition, date, location, or context in 2–6 words. No punctuation, no caps. Use exact dates when available. Empty string if nothing meaningful to add.

LINE BREAK RULES (critical):
- Each line must be a complete chunk of meaning
- Never split a number from what it describes ("$2.50 tacos" stays together)
- Never cut a phrase mid-thought

STYLE RULES:
- Be blunt and specific. Name the exact product/price/danger
- For recalls: name the exact product and danger (e.g. "possible salmonella risk" not "health concerns")
- For lawsuits: use "lawsuit claims" / "accused of" / "state claims" — never state allegations as proven
- For safety: reference the authority when relevant (e.g. "cpsc says stop using" / "fda warning issued")
- Avoid: "prices are rising" / "stores are changing" / "consumers are upset" / "limited time" (use real dates)

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

Only use facts from the article. Return ONLY valid JSON, no other text: {"offer":"...","detail":"..."}`;

// Format the AI-extracted facts into a clean 3-line headline
function formatHeadlineFromFacts(brand, offer, detail) {
  const up = (s) => s.toUpperCase().trim();

  // Clean up common spoken-English artifacts from the AI output
  const cleanOffer = offer
    .replace(/\b(\d+)\s+dollars?\b/gi, "$$1")
    .replace(/\bjust\s+(\d)/gi, "$$1")
    .trim();
  const cleanDetail = detail
    .replace(/\b(\d+)\s+dollars?\b/gi, "$$1")
    .replace(/\bjust\s+(\d)/gi, "$$1")
    .trim();

  const offerUp = up(cleanOffer);
  const detailUp = up(cleanDetail);

  // Try to split a long offer line at a natural break point
  // so it reads as two clean lines instead of one crowded line
  const SPLIT_AT = ["GET ONE FREE", "GET ONE", "FOR A YEAR", "FOR FREE", "FOR LIFE", "OR FREE", "AND GET", "PLUS FREE"];
  let line2 = offerUp;
  let line3 = detailUp || null;

  if (offerUp.length > 22) {
    for (const pivot of SPLIT_AT) {
      const idx = offerUp.indexOf(pivot);
      if (idx > 0) {
        // Put what comes before the pivot on line2, the pivot itself starts line3
        const before = offerUp.slice(0, idx).trim();
        const after = offerUp.slice(idx).trim();
        if (before && after) {
          line2 = before;
          line3 = detailUp ? `${after}\n${detailUp}` : after;
          break;
        }
      }
    }
  }

  const lines = [up(brand), line2, line3].filter(Boolean);
  return lines.join("\n");
}

async function writeHeadline(candidate, apiKey) {
  const article = `Title: ${candidate.title}\nSummary: ${candidate.rawSummary}`;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 32768,
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: article },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Groq headline ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error("No JSON in headline response");
  const { offer, detail } = JSON.parse(match[0]);
  if (!offer) throw new Error("Empty offer in headline response");
  return formatHeadlineFromFacts(candidate.brand, offer, detail || "");
}

async function filterAndRewriteWithAI(candidates, apiKey) {
  // Pass 1: batch relevance filter (cheap — just yes/no per story)
  const filterResults = await filterRelevance(candidates, apiKey);
  const approved = candidates.filter((c) => {
    const r = filterResults.find((item) => item.id === c.id);
    return r?.relevant === true;
  });
  console.log(`[pipeline] AI approved ${approved.length} / ${candidates.length} candidates`);

  // Pass 2: write each headline individually (focused call = no word scrambling)
  const withHeadlines = await Promise.all(
    approved.map(async (c) => {
      try {
        const headline = await writeHeadline(c, apiKey);
        return { ...c, headline };
      } catch (e) {
        console.warn(`[pipeline] Headline failed for "${c.title}":`, e.message);
        return null;
      }
    })
  );
  return withHeadlines.filter(Boolean);
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function fetchStories() {
  const all = await fetchAllSources(process.env);
  const candidates = preFilter(all);
  console.log(`[pipeline] ${all.length} raw → ${candidates.length} after pre-filter`);

  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    try {
      console.log(`[pipeline] Sending ${candidates.length} candidates to AI for relevance + rewrite…`);
      const results = await filterAndRewriteWithAI(candidates, apiKey);
      console.log(`[pipeline] AI approved ${results.length} stories`);
      return results;
    } catch (e) {
      console.warn("[pipeline] AI filter failed, returning pre-filtered candidates:", e.message);
    }
  }

  // Fallback if no API key — return pre-filtered candidates without headlines
  return candidates.slice(0, 20);
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
