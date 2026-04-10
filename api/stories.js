import { parseRssItems } from "../pipeline/lib/rss.mjs";
import { summarizeText } from "../pipeline/lib/text.mjs";
import { discoveryQueries } from "../pipeline/config/discoveryQueries.mjs";

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
  [/\braising\s+cane\b/, "RAISING CANE'S"],
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
  [/\bwingstop\b/, "WINGSTOP"],
  [/\bwhataburger\b/, "WHATABURGER"],
  [/\bpanda\s+express\b/, "PANDA EXPRESS"],
  [/\bjamba\b/, "JAMBA"],
  [/\bbaskin.?robbins\b/, "BASKIN-ROBBINS"],
  [/\bcold\s+stone\b/, "COLD STONE"],
  [/\bwayfair\b/, "WAYFAIR"],
  [/\bikea\b/, "IKEA"],
  [/\bautozone\b/, "AUTOZONE"],
  [/\bvictoria'?s\s+secret\b/, "VICTORIA'S SECRET"],
  [/\bh&m\b/, "H&M"],
  [/\bsave.?a.?lot\b/, "SAVE-A-LOT"],
  [/\bfood\s+lion\b/, "FOOD LION"],
  [/\bmeijer\b/, "MEIJER"],
  [/\bwegmans\b/, "WEGMANS"],
  [/\bbig\s+lots\b/, "BIG LOTS"],
  [/\bacademy\s+sports\b/, "ACADEMY SPORTS"],
  [/\brei\b/, "REI"],
  [/\bnike\b/, "NIKE"],
  [/\badidas\b/, "ADIDAS"],
  [/\bverizon\b/, "VERIZON"],
  [/\bat&?t\b/, "AT&T"],
  [/\bt.?mobile\b/, "T-MOBILE"],
  [/\bnetflix\b/, "NETFLIX"],
  [/\bdisney\+\b|\bdisney\s+plus\b/, "DISNEY+"],
  [/\bspotify\b/, "SPOTIFY"],
  [/\bwayfair\b/, "WAYFAIR"],
  [/\bdick'?s\s+sporting\b/, "DICK'S SPORTING GOODS"],
  [/\bross\b/, "ROSS"],
  [/\bretailmenot\b/, "RETAILMENOT"],
];

function inferBrand(text) {
  const lower = text.toLowerCase();
  for (const [pattern, brand] of BRAND_PATTERNS) {
    if (pattern.test(lower)) return brand;
  }
  return "RETAIL";
}

// ─── Candidate builder ────────────────────────────────────────────────────────

function toCandidate(item, sourceId, label, index) {
  const combined = `${item.title} ${item.rawSummary}`;
  let domain = item.sourceUrl;
  try { domain = new URL(item.sourceUrl).hostname.replace(/^www\./, ""); } catch {}
  const date = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return {
    id: `${sourceId}-${index}`,
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

async function fetchRss(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchFeed(id, url, label, limit = 10) {
  try {
    const xml = await fetchRss(url);
    return parseRssItems(xml).slice(0, limit).map((item, i) => toCandidate(item, id, label, i));
  } catch (e) {
    console.warn(`[stories] ${label} failed:`, e.message);
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
      console.warn(`[stories] Google News "${query.label}" failed:`, e.message);
    }
  }
  return allItems;
}

// ─── Scoring & filtering ──────────────────────────────────────────────────────

const DEAL_KEYWORDS = [
  /\bfree\b/i, /\bbogo\b/i, /\bbuy one\b/i, /\bdeal\b/i, /\boff\b/i,
  /\bsale\b/i, /\bsavings?\b/i, /\bcoupon\b/i, /\bdiscount\b/i,
  /\bpromo\b/i, /\boffer\b/i, /\brebate\b/i, /\bcashback\b/i,
  /\brecall\b/i, /\balert\b/i, /\bwarning\b/i, /\bgiveaway\b/i,
  /\bfreebie\b/i, /\bsample\b/i, /\breward\b/i, /\bclearance\b/i,
  /\bmarkdown\b/i, /\bprice\s+drop\b/i, /\blimited\s+time\b/i,
  /\bgrand\s+opening\b/i, /\bcoming\s+back\b/i, /\breopening\b/i,
  /\btrade.?in\b/i, /\bgift\s+card\b/i,
];

const SKIP_PATTERNS = [
  /\binvestor\b|\bstock\b|\bearnings\b|\bshares\b|\bwall\s+street\b/i,
  /\belection\b|\bcongress\b|\bsupreme\s+court\b|\bpolitics?\b/i,
  /\bnfl\b|\bnba\b|\bnhl\b|\bmlb\b|\bnascar\b/i,
  /\bhoroscope\b|\bastrology\b/i,
  /\bcryptocurrency\b|\bcrypto\b|\bbitcoin\b|\bnft\b/i,
];

function scoreCandidate(c) {
  const text = `${c.title} ${c.rawSummary}`.toLowerCase();
  if (SKIP_PATTERNS.some((p) => p.test(text))) return -999;
  let score = 0;
  for (const kw of DEAL_KEYWORDS) { if (kw.test(text)) score += 2; }
  if (c.brand !== "RETAIL") score += 3;
  if (/\$[\d]+|\d+%\s*off/i.test(text)) score += 3;
  if (/\b(today|tonight|this week|ends|through|april|may|limited)\b/i.test(text)) score += 2;
  if (/\b(food|meal|eat|restaurant|sandwich|burger|pizza|taco|chicken|coffee|ice cream|drink)\b/i.test(text)) score += 2;
  if (/\bfree\b.*\b(cup|scoop|cone|slice|item|meal|sandwich|sample)\b/i.test(text)) score += 4;
  if (c.title.split(" ").length < 4) score -= 2;
  return score;
}

function filterAndRank(candidates) {
  const seen = new Set();
  return candidates
    .filter((c) => { if (seen.has(c.sourceUrl)) return false; seen.add(c.sourceUrl); return true; })
    .map((c) => ({ ...c, _score: scoreCandidate(c) }))
    .filter((c) => c._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 40);
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
    fetchFeed("reddit-deals",  "https://www.reddit.com/r/deals/hot.rss?limit=15",                                         "r/deals",             10),
    fetchFeed("reddit-frugal", "https://www.reddit.com/r/frugal/hot.rss?limit=15",                                        "r/frugal",             8),
    fetchFeed("reddit-free",   "https://www.reddit.com/r/freebies/hot.rss?limit=15",                                      "r/freebies",          12),
    fetchFeed("reddit-coupon", "https://www.reddit.com/r/coupons/hot.rss?limit=10",                                       "r/coupons",            8),
    fetchFeed("reddit-efree",  "https://www.reddit.com/r/eFreebies/hot.rss?limit=10",                                     "r/eFreebies",          8),
  ]);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// ─── Groq rewriter ────────────────────────────────────────────────────────────

const HEADLINE_PROMPT = `You write headlines for Instagram consumer deal posts. 3 lines, ALL CAPS, poster style.

FORMAT:
LINE 1: BRAND NAME
LINE 2: MAIN DEAL / NEWS (3-5 words, the payoff)
LINE 3: DATE / PRICE / URGENCY (3-4 words — omit if nothing useful)

RULES:
- ALL CAPS always
- Each line max 5-6 words
- No sentences. No filler. No ad copy.
- Reads in 1 second while scrolling.
- Feels like a shopper alert or deal page.

EXAMPLES:
SUBWAY / BOGO FOOTLONGS / THROUGH APRIL 28
TARGET / PRICES CUT / ON 3,000 ITEMS
KONA ICE / FREE CUP / TODAY ONLY
QDOBA / FREE ENTREE / TAKE THE SURVEY
COSTCO / DEAL ALERT / $100 OFF

Return ONLY a JSON array: [{ "id": "...", "line1": "...", "line2": "...", "line3": "..." }]
line3 can be empty string. No markdown, no explanation.`;

async function rewriteWithGroq(candidates, apiKey) {
  const payload = candidates.map((c) => ({ id: c.id, brand: c.brand, title: c.title, summary: c.rawSummary }));
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        { role: "system", content: HEADLINE_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON in Groq response");
  const rewrites = JSON.parse(match[0]);
  return candidates.map((c) => {
    const r = rewrites.find((item) => item.id === c.id);
    if (!r) return c;
    return { ...c, headline: [r.line1, r.line2, r.line3].filter(Boolean).join("\n") };
  });
}

// ─── Vercel handler ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  try {
    const all = await fetchAllSources();
    const filtered = filterAndRank(all);
    console.log(`[stories] ${all.length} raw → ${filtered.length} after scoring`);

    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      try {
        const rewritten = await rewriteWithGroq(filtered, apiKey);
        return res.status(200).json(rewritten);
      } catch (e) {
        console.warn("[stories] Groq failed:", e.message);
      }
    }

    res.status(200).json(filtered);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
