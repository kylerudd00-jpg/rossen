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

// Hard skip — completely irrelevant or always-on noise
const SKIP_PATTERNS = [
  /\binvestor\b|\bstock\b|\bearnings\b|\bshares\b|\bipo\b|\bwall\s+street\b/i,
  /\belection\b|\bcongress\b|\bsupreme\s+court\b|\bpolitics?\b|\bsenate\b|\bhouse\s+bill\b/i,
  /\bnfl\b|\bnba\b|\bnhl\b|\bmlb\b|\bnascar\b|\bsports?\s+team\b/i,
  /\bhoroscope\b|\bastrology\b|\bpsychic\b/i,
  /\breal\s+estate\b|\bmortgage\b|\bforeclosure\b/i,
  /\bcryptocurrency\b|\bcrypto\b|\bbitcoin\b|\bnft\b/i,
  /\bwar\b|\bmilitary\b|\bterror\b|\battack\b/i,
  // Generic always-on noise — not newsworthy
  /\bdigital coupons?\b/i,
  /\bweekly ad\b|\bweekly deals?\b|\bweekly savings?\b/i,
  /\bearn points?\b|\bearn rewards?\b|\bjoin.*rewards\b|\brewards program\b/i,
  /\bhow to (save|shop|get|find|use)\b/i,
  /\btips? (for|to|on)\b|\bbest ways? to\b|\bguide to\b/i,
  /\bprice match\b|\bprice matching\b/i,
  /\bbudget(ing)?\s+(tips?|advice|guide|hack)\b/i,
];

function scoreCandidate(c) {
  const text = `${c.title} ${c.rawSummary}`.toLowerCase();
  const title = c.title.toLowerCase();

  // Hard skip
  if (SKIP_PATTERNS.some((p) => p.test(text))) return -999;

  // Must be a known brand — generic "RETAIL" brand items almost never post-worthy
  if (c.brand === "RETAIL") return -999;

  let score = 0;

  // ── Tier 1: high-value, specific events (+8 to +12) ──────────────────────────
  if (/\bbogo\b|\bbuy one[,\s]+get one\b/i.test(text)) score += 12;
  if (/\brecall\b/i.test(text) && /\bfda\b|\bfsis\b|\bcpsc\b|\bfood\b|\bproduct\b|\bsafety\b/i.test(text)) score += 12;
  if (/\bfree\b.{0,30}\b(cup|scoop|cone|slice|sandwich|meal|entree|item|drink|coffee|taco|burger|chicken|pizza|fries|donut|bagel|cookie|sample)\b/i.test(text)) score += 10;
  if (/\bclosing\b|\bshutting down\b|\bbankruptcy\b|\bgoing out of business\b/i.test(text)) score += 10;
  if (/\bgrand opening\b|\bmaking a comeback\b|\bcoming back\b|\breturning to stores\b/i.test(text)) score += 8;
  if (/\$\d+(?:\.\d{2})?\s+(?:for\s+)?(?:a\s+)?(?:free\s+)?\w/i.test(text) && /\b(meal|sandwich|piece|cup|item|entree|order|box)\b/i.test(text)) score += 8;

  // ── Tier 2: solid deals (+4 to +6) ───────────────────────────────────────────
  const pctMatch = text.match(/(\d+)\s*%\s*off/i);
  if (pctMatch && parseInt(pctMatch[1]) >= 30) score += 6;
  if (/(\d[\d,]+)\s+(items?|products?|styles?)/i.test(text) && /\b(cut|lower|reduc|cheaper|off|drop)\b/i.test(text)) score += 6;
  if (/\bnew\b.{0,20}\b(menu|item|sandwich|burger|taco|pizza|drink|meal|flavor)\b/i.test(text)) score += 5;
  if (/\btrade.?in\b/i.test(text) && /\bgift\s+card\b/i.test(text)) score += 5;
  if (/\$[\d]+/i.test(text)) score += 4;
  if (/\b(through|until|thru|ends?|only on|today only|tonight only)\s+\w/i.test(text)) score += 4;

  // ── Penalties: too vague or evergreen ────────────────────────────────────────
  if (!/\$[\d]|\d+\s*%|bogo|buy one|free\s+\w|recall|opening|closing|comeback/i.test(text)) score -= 4;
  if (/\bsurvey\b|\bin the app\b/i.test(text) && !/\bfree\b|\$[\d]|\bget\s+\w/i.test(text)) score -= 3;
  if (/\bcoupon\b|\bdiscount\b|\bsavings\b/i.test(text) && !/\$[\d]|\d+\s*%|bogo|free\s+\w/i.test(text)) score -= 3;
  if (title.split(" ").length < 5) score -= 3;

  return score;
}

function filterAndRank(candidates) {
  const seen = new Set();
  return candidates
    .filter((c) => { if (seen.has(c.sourceUrl)) return false; seen.add(c.sourceUrl); return true; })
    .map((c) => ({ ...c, _score: scoreCandidate(c) }))
    .filter((c) => c._score >= 8)   // Only items with a clear, specific deal signal
    .sort((a, b) => b._score - a._score)
    .slice(0, 20);  // Tighter set — quality over quantity
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

const HEADLINE_PROMPT = `You write poster headlines for Instagram deal posts. Think billboard, not sentence.

You are given articles about consumer deals, freebies, recalls, and retail news. Your job is to turn each one into a 3-line poster headline. The text will appear in huge bold type on a graphic. It must read instantly.

OUTPUT FORMAT — 3 lines, ALL CAPS:
line1: BRAND NAME
line2: THE MAIN PAYOFF (what you get, what happened, what's free — 3-5 words)
line3: DATE / PRICE / HOW TO GET IT (3-4 words — use "" if nothing concrete)

THE CARDINAL RULE:
Write like a poster. Not like a sentence. Not like ad copy. Not like a news headline.

WRONG (sentence thinking):
"Subway is offering a buy one get one deal on footlongs through April 28"
"Customers can get a free entree by taking a survey in the app"
"Target has reduced prices on over 3,000 items this spring"

RIGHT (poster thinking):
SUBWAY / BOGO FOOTLONGS / THROUGH APRIL 28
QDOBA / FREE ENTREE / TAKE THE SURVEY
TARGET / 3,000 ITEMS / NOW CHEAPER

MORE RIGHT EXAMPLES:
CHURCH'S / 8-PIECE CHICKEN / JUST $4.99
MCDONALD'S / $4 BREAKFAST DEAL / STARTS APRIL 21
KONA ICE / FREE SHAVED ICE / TAX DAY ONLY
AMAZON / TRADE IN OLD TECH / GET GIFT CARDS
SAM'S CLUB / SAVINGS END / APRIL 12
STARBUCKS / BUY ONE GET ONE / AFTER 3PM
DUNKIN' / FREE MEDIUM DRINK / WITH ANY PURCHASE
POTBELLY / BUY ONE SANDWICH / GET ONE FREE
WENDY'S / $4 $6 $8 DEALS / BIGGIE MEALS
TRADER JOE'S / RECALL / ALERT
COSTCO / $100 OFF / THIS WEEK ONLY

RULES:
- ALL CAPS on every line, always
- Max 5-6 words per line — shorter is better
- Extract the real deal from the title/summary: item name, price, date, percentage, requirement
- Never use filler: "BIG SAVINGS" "GREAT DEAL" "HOT DEAL" "DON'T MISS" "SPECIAL OFFER" "AMAZING" "CHECK IT OUT"
- Never write a full sentence
- If the deal needs the app → line3 = "IN THE APP"
- If there's a survey → line3 = "TAKE THE SURVEY"
- If free with purchase → line3 = "WITH ANY PURCHASE"
- Never invent details. Only use what's in the title and summary.

Return ONLY a JSON array: [{ "id": "...", "line1": "...", "line2": "...", "line3": "..." }]
No markdown. No explanation. Just the JSON.`;

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
