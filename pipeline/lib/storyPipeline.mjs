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

// ─── All sources ──────────────────────────────────────────────────────────────

async function fetchAllSources() {
  const results = await Promise.allSettled([
    fetchGoogleNews(3),
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

const FILTER_PROMPT = `You are the content curator for a major Instagram deal page with 500k+ followers.

You will receive a JSON array of articles. For each one, decide: is this worth posting?

POST IT if it is a specific, actionable deal that everyday shoppers care about:
✓ BOGO at a major chain
✓ Free specific item or free food event
✓ Unusually low price (e.g. 67¢ burgers, $1 menu items)
✓ Real dollar savings on something popular (e.g. Vitamix $100 off at Costco)
✓ Bundle deal with clear value
✓ Time-limited offer with a date
✓ Consumer recall people need to act on
✓ Major brand closing / bankruptcy
✓ Annual freebie event (Free Cone Day, Tax Day deals, National food days)
✓ 30%+ off at a store everyone shops at

SKIP IT if:
✗ Vague "brand is having a sale" with no specific item, price, or date
✗ Random single-SKU product discount ($5 off a shoe)
✗ Generic brand news with no consumer deal
✗ How-to / tips / listicle content
✗ Niche audience deals

If multiple articles cover the exact same deal, mark only the best one as relevant.

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

// ─── Pass 2: headline writer (one story at a time) ────────────────────────────

const HEADLINE_PROMPT = `You write captions for an Instagram deal page. Each caption goes on a static slide and must be understood in one glance.

─── STRUCTURE ────────────────────────────────────────────────────────────────

Every caption follows this order:
  Line 1: BRAND
  Line 2: THE DEAL or NEWS
  Line 3: DATE / PRICE / HOW TO GET IT

─── THE MOST IMPORTANT RULE: BE LOGICAL ──────────────────────────────────────

The words must read naturally from top to bottom. Each line must make sense:
  - by itself
  - with the line above it
  - with the line below it

Line breaks must group words that belong together. Never split a thought
in the wrong place. The reader should instantly understand: who, what, why now.

─── CORRECT EXAMPLES ─────────────────────────────────────────────────────────

SUBWAY
BUY ONE FOOTLONG
GET ONE FREE

CHURCH'S
8-PIECE CHICKEN
JUST $4.99

WENDY'S
JR. FROSTY FOR A YEAR
$3 KEY TAG

BEN & JERRY'S
FREE CONE DAY
APRIL 14

COSTCO
VITAMIX $100 OFF
THIS WEEK ONLY

SAM'S CLUB
SAVINGS END
APRIL 12

AMAZON
GET GIFT CARDS
FOR OLD TECH

POTBELLY
BUY ONE SANDWICH
GET ONE FREE

─── WRONG EXAMPLES (do not do this) ─────────────────────────────────────────

WENDY'S            ← BAD: splits "JR. FROSTY FOR A YEAR" across lines
JR. FROSTY
FOR A YEAR $3 KEY TAG

BUY ONE            ← BAD: splits "BUY ONE FOOTLONG" across lines
FOOTLONG GET
ONE FREE

─── RULES ────────────────────────────────────────────────────────────────────

- ALL CAPS always
- Short, direct, logical — reads like a stacked sign or consumer alert
- Each line is a complete thought or natural phrase chunk
- Only use facts from the article — never invent prices, dates, or details
- No filler: "BIG SAVINGS", "GREAT DEAL", "DON'T MISS", "AMAZING OFFER"
- No full sentences — compressed headline style only
- The strongest information comes first

─── OUTPUT ───────────────────────────────────────────────────────────────────

Return ONLY a JSON object, no other text:
{"line1":"...","line2":"...","line3":"..."}`;

async function writeHeadline(candidate, apiKey) {
  const article = `Brand: ${candidate.brand}\nTitle: ${candidate.title}\nSummary: ${candidate.rawSummary}`;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 32768,
      messages: [
        { role: "system", content: HEADLINE_PROMPT },
        { role: "user", content: article },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Groq headline ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in headline response");
  const { line1, line2, line3 } = JSON.parse(match[0]);
  const lines = [line1, line2, line3].filter(Boolean);
  if (lines.length === 0) throw new Error("Empty headline");
  return lines.join("\n");
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
  const all = await fetchAllSources();
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
