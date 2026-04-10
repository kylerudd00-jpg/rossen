import { readFileSync } from "fs";
import { join } from "path";
import { parseRssItems } from "./pipeline/lib/rss.mjs";
import { summarizeText } from "./pipeline/lib/text.mjs";
import { discoveryQueries } from "./pipeline/config/discoveryQueries.mjs";

// Vite doesn't push .env into process.env for plugins — load it manually
function loadDotEnv() {
  try {
    const content = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadDotEnv();

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
  [/\bibkea\b|\bikea\b/, "IKEA"],
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
  [/\bnordstrom\s+rack\b/, "NORDSTROM RACK"],
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
  [/\bsprint\b/, "SPRINT"],
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
    console.warn(`[api] ${label} failed:`, e.message);
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
      console.warn(`[api] Google News "${query.label}" failed:`, e.message);
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
  // BOGO at a named chain
  if (/\bbogo\b|\bbuy one[,\s]+get one\b/i.test(text)) score += 12;
  // Food/product recall
  if (/\brecall\b/i.test(text) && /\bfda\b|\bfsis\b|\bcpsc\b|\bfood\b|\bproduct\b|\bsafety\b/i.test(text)) score += 12;
  // Free specific named item (not just "free rewards")
  if (/\bfree\b.{0,30}\b(cup|scoop|cone|slice|sandwich|meal|entree|item|drink|coffee|taco|burger|chicken|pizza|fries|donut|bagel|cookie|sample)\b/i.test(text)) score += 10;
  // Store closing / bankruptcy
  if (/\bclosing\b|\bshutting down\b|\bbankruptcy\b|\bgoing out of business\b/i.test(text)) score += 10;
  // Grand opening or major comeback
  if (/\bgrand opening\b|\bmaking a comeback\b|\bcoming back\b|\breturning to stores\b/i.test(text)) score += 8;
  // Specific dollar deal ($X for a named item)
  if (/\$\d+(?:\.\d{2})?\s+(?:for\s+)?(?:a\s+)?(?:free\s+)?\w/i.test(text) && /\b(meal|sandwich|piece|cup|item|entree|order|box)\b/i.test(text)) score += 8;

  // ── Tier 2: solid deals (+4 to +6) ───────────────────────────────────────────
  // Significant % off (30%+)
  const pctMatch = text.match(/(\d+)\s*%\s*off/i);
  if (pctMatch && parseInt(pctMatch[1]) >= 30) score += 6;
  // Price drop on many items
  if (/(\d[\d,]+)\s+(items?|products?|styles?)/i.test(text) && /\b(cut|lower|reduc|cheaper|off|drop)\b/i.test(text)) score += 6;
  // New menu item at a chain
  if (/\bnew\b.{0,20}\b(menu|item|sandwich|burger|taco|pizza|drink|meal|flavor)\b/i.test(text)) score += 5;
  // Trade-in or gift card deal
  if (/\btrade.?in\b/i.test(text) && /\bgift\s+card\b/i.test(text)) score += 5;
  // Any specific $ price mention
  if (/\$[\d]+/i.test(text)) score += 4;
  // Date-bound deal (time pressure)
  if (/\b(through|until|thru|ends?|only on|today only|tonight only)\s+\w/i.test(text)) score += 4;

  // ── Penalties: too vague or evergreen ────────────────────────────────────────
  // Vague "savings" / "deals" without a specific item or number
  if (!/\$[\d]|\d+\s*%|bogo|buy one|free\s+\w|recall|opening|closing|comeback/i.test(text)) score -= 4;
  // Survey/app-only without a concrete reward stated
  if (/\bsurvey\b|\bin the app\b/i.test(text) && !/\bfree\b|\$[\d]|\bget\s+\w/i.test(text)) score -= 3;
  // Generic coupon / discount language without specifics
  if (/\bcoupon\b|\bdiscount\b|\bsavings\b/i.test(text) && !/\$[\d]|\d+\s*%|bogo|free\s+\w/i.test(text)) score -= 3;
  // Very short title = usually not enough info
  if (title.split(" ").length < 5) score -= 3;

  return score;
}

function filterAndRank(candidates) {
  const seen = new Set();
  return candidates
    .filter((c) => {
      if (seen.has(c.sourceUrl)) return false;
      seen.add(c.sourceUrl);
      return true;
    })
    .map((c) => ({ ...c, _score: scoreCandidate(c) }))
    .filter((c) => c._score >= 8)   // Only items with a clear, specific deal signal
    .sort((a, b) => b._score - a._score)
    .slice(0, 20);  // Tighter set — quality over quantity
}

// ─── All sources ──────────────────────────────────────────────────────────────

async function fetchAllSources() {
  const results = await Promise.allSettled([
    // Google News (broad queries)
    fetchGoogleNews(3),

    // ── Deal aggregators ──────────────────────────────────────────────────────
    fetchFeed("slickdeals",   "https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1", "Slickdeals",         12),
    fetchFeed("dealnews",     "https://dealnews.com/featured/rss.xml",                                                    "DealNews",           10),
    fetchFeed("brads-deals",  "https://www.bradsdeals.com/blog/feed/",                                                    "Brad's Deals",        8),
    fetchFeed("dealsplus",    "https://www.dealsplus.com/rss",                                                            "DealsPlus",           8),
    fetchFeed("woot",         "https://deals.woot.com/rss",                                                               "Woot",                8),

    // ── Freebie & coupon blogs ─────────────────────────────────────────────────
    fetchFeed("hip2save",       "https://hip2save.com/feed/",                         "Hip2Save",               12),
    fetchFeed("krazy-coupon",   "https://thekrazycouponlady.com/feed",                "Krazy Coupon Lady",      10),
    fetchFeed("money-mom",      "https://moneysavingmom.com/feed/",                   "Money Saving Mom",       10),
    fetchFeed("living-rich",    "https://www.livingrichwithcoupons.com/feed/",        "Living Rich w/ Coupons",  8),
    fetchFeed("hunt4freebies",  "https://www.hunt4freebies.com/feed/",                "Hunt4Freebies",          10),
    fetchFeed("freebieshark",   "https://www.freebieshark.com/feed/",                 "FreebieSHARK",           10),
    fetchFeed("freeflys",       "https://freeflys.com/feed/",                         "Freeflys",               10),
    fetchFeed("freebies2deals", "https://www.freebies2deals.com/feed/",               "Freebies2Deals",         10),
    fetchFeed("totally-free",   "https://www.totallyfreestuff.com/rss.asp",           "Totally Free Stuff",     10),
    fetchFeed("freebie-guy",    "https://www.thefreebieguy.com/feed/",                "The Freebie Guy",        10),
    fetchFeed("lord-savings",   "https://lordofsavings.com/feed/",                    "Lord of Savings",        10),
    fetchFeed("stretching-buck","https://stretchingabuck.com/feed/",                  "Stretching a Buck",       8),
    fetchFeed("southern-savers","https://www.southernsavers.com/feed/",               "Southern Savers",         8),
    fetchFeed("passion-savings","https://www.passionforsavings.com/feed/",            "Passion for Savings",     8),
    fetchFeed("saving-simple",  "https://savingsaidsimply.com/feed/",                 "Saving Said Simply",      8),
    fetchFeed("saving-dollars", "https://savingdollarsandsense.com/feed/",            "Saving Dollars & Sense",  8),
    fetchFeed("i-heart-publix", "https://www.iheartpublix.com/feed/",                "I Heart Publix",           8),
    fetchFeed("penny-hoarder",  "https://www.thepennyhoarder.com/feed/",              "The Penny Hoarder",        8),
    fetchFeed("clark-howard",   "https://clark.com/feed/",                            "Clark Howard",             8),
    fetchFeed("retailmenot",    "https://www.retailmenot.com/blog/feed",              "RetailMeNot Blog",         8),

    // ── Consumer & retail news ─────────────────────────────────────────────────
    fetchFeed("thestreet",      "https://www.thestreet.com/rss/news.rss",             "The Street",              8),
    fetchFeed("retail-dive",    "https://www.retaildive.com/feeds/news/",             "Retail Dive",             8),
    fetchFeed("grocery-dive",   "https://www.grocerydive.com/feeds/news/",            "Grocery Dive",            8),
    fetchFeed("qsr-mag",        "https://www.qsrmagazine.com/rss.xml",               "QSR Magazine",            8),
    fetchFeed("rest-business",  "https://www.restaurantbusinessonline.com/rss.xml",  "Restaurant Business",     8),
    fetchFeed("nrn",            "https://www.nrn.com/rss.xml",                       "Nation's Restaurant News", 8),
    fetchFeed("supermarket-news","https://www.supermarketnews.com/rss/news",          "Supermarket News",        6),

    // ── Reddit ────────────────────────────────────────────────────────────────
    fetchFeed("reddit-deals",    "https://www.reddit.com/r/deals/hot.rss?limit=15",     "r/deals",     10),
    fetchFeed("reddit-frugal",   "https://www.reddit.com/r/frugal/hot.rss?limit=15",   "r/frugal",    8),
    fetchFeed("reddit-freebies", "https://www.reddit.com/r/freebies/hot.rss?limit=15", "r/freebies",  12),
    fetchFeed("reddit-coupons",  "https://www.reddit.com/r/coupons/hot.rss?limit=10",  "r/coupons",   8),
    fetchFeed("reddit-efreebies","https://www.reddit.com/r/eFreebies/hot.rss?limit=10","r/eFreebies", 8),
  ]);

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// ─── AI headline rewriter ─────────────────────────────────────────────────────

const HEADLINE_SYSTEM_PROMPT = `You write poster headlines for Instagram deal posts. Think billboard, not sentence.

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

Return ONLY a JSON array. Each element: { "id": "...", "line1": "...", "line2": "...", "line3": "..." }
No markdown. No explanation. Just the JSON.`;

async function rewriteHeadlines(candidates, apiKey) {
  const payload = candidates.map((c) => ({
    id: c.id,
    brand: c.brand,
    title: c.title,
    summary: c.rawSummary,
  }));

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        { role: "system", content: HEADLINE_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) throw new Error(`Groq ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array in Groq response");

  const rewrites = JSON.parse(match[0]);
  return candidates.map((candidate) => {
    const r = rewrites.find((item) => item.id === candidate.id);
    if (!r) return candidate;
    const lines = [r.line1, r.line2, r.line3].filter(Boolean);
    return { ...candidate, headline: lines.join("\n") };
  });
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

async function fetchStories() {
  const all = await fetchAllSources();
  const filtered = filterAndRank(all);
  console.log(`[api] ${all.length} raw → ${filtered.length} after scoring`);

  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    try {
      console.log(`[api] Rewriting ${filtered.length} headlines with Groq…`);
      return await rewriteHeadlines(filtered, apiKey);
    } catch (e) {
      console.warn("[api] Groq rewrite failed, returning scored results:", e.message);
    }
  }

  return filtered;
}

// ─── Image search ─────────────────────────────────────────────────────────────

async function searchWikimediaImages(q) {
  const searchParams = new URLSearchParams({
    action: "query", list: "search", srsearch: q,
    srnamespace: "6", format: "json", srlimit: "10", origin: "*",
  });
  const searchRes = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams}`, { signal: AbortSignal.timeout(8000) });
  const searchData = await searchRes.json();
  const titles = (searchData.query?.search || []).map((r) => r.title);
  if (titles.length === 0) return [];

  const infoParams = new URLSearchParams({
    action: "query", titles: titles.join("|"),
    prop: "imageinfo", iiprop: "url|mime", iiurlwidth: "1200",
    format: "json", origin: "*",
  });
  const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`, { signal: AbortSignal.timeout(8000) });
  const infoData = await infoRes.json();

  return Object.values(infoData.query?.pages || {})
    .filter((page) => { const m = page.imageinfo?.[0]?.mime || ""; return m === "image/jpeg" || m === "image/png" || m === "image/webp"; })
    .map((page) => page.imageinfo?.[0]?.thumburl)
    .filter(Boolean);
}

// ─── Vite plugin ──────────────────────────────────────────────────────────────

export function apiPlugin() {
  return {
    name: "deal-pipeline-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://localhost");

        if (url.pathname === "/api/stories") {
          try {
            const stories = await fetchStories();
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(stories));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        if (url.pathname === "/api/images") {
          const q = url.searchParams.get("q") || "";
          if (!q) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify([])); return; }
          try {
            const images = await searchWikimediaImages(q);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(images));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        next();
      });
    },
  };
}
