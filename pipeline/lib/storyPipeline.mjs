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

// ─── Scoring & filtering ──────────────────────────────────────────────────────

const SKIP_PATTERNS = [
  /\binvestor\b|\bstock\b|\bearnings\b|\bshares\b|\bipo\b|\bwall\s+street\b/i,
  /\belection\b|\bcongress\b|\bsupreme\s+court\b|\bpolitics?\b|\bsenate\b|\bhouse\s+bill\b/i,
  /\bnfl\b|\bnba\b|\bnhl\b|\bmlb\b|\bnascar\b|\bsports?\s+team\b/i,
  /\bhoroscope\b|\bastrology\b|\bpsychic\b/i,
  /\breal\s+estate\b|\bmortgage\b|\bforeclosure\b/i,
  /\bcryptocurrency\b|\bcrypto\b|\bbitcoin\b|\bnft\b/i,
  /\bwar\b|\bmilitary\b|\bterror\b|\battack\b/i,
  /\bdigital coupons?\b/i,
  /\bweekly ad\b|\bweekly deals?\b|\bweekly savings?\b/i,
  /\bearn points?\b|\bearn rewards?\b|\bjoin.*rewards\b|\brewards program\b/i,
  /\bhow to (save|shop|get|find|use)\b/i,
  /\btips? (for|to|on)\b|\bbest ways? to\b|\bguide to\b/i,
  /\bprice match\b|\bprice matching\b/i,
  /\bbudget(ing)?\s+(tips?|advice|guide|hack)\b/i,
];

// Niche single-product categories that aren't broadly relevant to a mass audience
const NICHE_PRODUCT_PATTERNS = [
  /\b(caddy|organizer|holder|phone case|stand|bracket|mount|clip|hook|rack|bin|tray|basket)\b/i,
  /\b(rug|curtain|lamp|light bulb|extension cord|cable|adapter|charger|battery pack)\b/i,
  /\b(toothbrush|razor|shampoo|conditioner|lotion|deodorant|vitamins?|supplement)\b/i,
  /\b(luggage|suitcase|duffel|backpack|wallet|purse|handbag)\b/i,
  /\b(air fryer|blender|toaster|coffee maker|vacuum|mop|broom|trash can)\b/i,
  /\b(mattress|pillow|comforter|bedsheet|towel|shower curtain)\b/i,
];

// Brands where mass-audience deals happen — broad chains everyone visits
const MASS_AUDIENCE_BRANDS = new Set([
  "MCDONALD'S","TACO BELL","WENDY'S","BURGER KING","CHICK-FIL-A","SUBWAY","DOMINO'S",
  "PIZZA HUT","PAPA JOHN'S","LITTLE CAESARS","POPEYES","CHIPOTLE","PANERA","STARBUCKS",
  "DUNKIN'","SONIC","DAIRY QUEEN","APPLEBEE'S","IHOP","DENNY'S","CRACKER BARREL",
  "BUFFALO WILD WINGS","WINGSTOP","RAISING CANE'S","JERSEY MIKE'S","FIVE GUYS",
  "SHAKE SHACK","PANDA EXPRESS","QDOBA","JACK IN THE BOX","WHATABURGER","CHURCH'S",
  "WALMART","TARGET","COSTCO","SAM'S CLUB","KROGER","ALDI","TRADER JOE'S","PUBLIX",
  "WHOLE FOODS","CVS","WALGREENS","DOLLAR TREE","DOLLAR GENERAL","BEST BUY",
  "HOME DEPOT","LOWE'S","MACY'S","KOHL'S","NORDSTROM","TJ MAXX","MARSHALLS",
  "FIVE BELOW","BIG LOTS","BATH & BODY WORKS","ULTA","SEPHORA",
]);

function scoreCandidate(c) {
  const text = `${c.title} ${c.rawSummary}`.toLowerCase();
  const title = c.title.toLowerCase();

  if (SKIP_PATTERNS.some((p) => p.test(text))) return -999;
  if (c.brand === "RETAIL") return -999;

  // Kill niche single-product deals immediately — not relevant for a mass audience
  if (NICHE_PRODUCT_PATTERNS.some((p) => p.test(text))) return -999;

  let score = 0;

  // ── Tier 1: high-value, universally relevant events (+8 to +12) ──────────────
  if (/\bbogo\b|\bbuy one[,\s]+get one\b/i.test(text)) score += 12;
  if (/\brecall\b/i.test(text) && /\bfda\b|\bfsis\b|\bcpsc\b|\bfood\b|\bproduct\b|\bsafety\b/i.test(text)) score += 12;
  if (/\bfree\b.{0,30}\b(cup|scoop|cone|slice|sandwich|meal|entree|item|drink|coffee|taco|burger|chicken|pizza|fries|donut|bagel|cookie|sample)\b/i.test(text)) score += 10;
  if (/\bclosing\b|\bshutting down\b|\bbankruptcy\b|\bgoing out of business\b/i.test(text)) score += 10;
  if (/\bgrand opening\b/i.test(text)) score += 8;

  // "Coming back" only counts if a specific PRODUCT/ITEM is returning — not just a brand
  // Good: "McRib is coming back", "Pumpkin Spice Latte returns"
  // Bad: "Dairy Queen is coming back" (too vague — a location reopening, not a deal)
  if (/\bcoming back\b|\breturns?\b|\breturning\b|\bmaking a comeback\b/i.test(text)) {
    if (/\b(sandwich|burger|taco|pizza|wrap|bowl|salad|shake|drink|latte|frap|menu item|flavor|treat|dessert|fries|nuggets|chicken|steak|dish|recipe|product)\b/i.test(text)) {
      score += 8; // specific item returning — great content
    }
    // No bonus for vague brand comebacks
  }

  if (/\$\d+(?:\.\d{2})?\s+(?:for\s+)?(?:a\s+)?(?:free\s+)?\w/i.test(text) && /\b(meal|sandwich|piece|cup|item|entree|order|box)\b/i.test(text)) score += 8;

  // ── Tier 2: solid broadly-relevant deals (+4 to +6) ──────────────────────────
  const pctMatch = text.match(/(\d+)\s*%\s*off/i);
  if (pctMatch && parseInt(pctMatch[1]) >= 30) score += 6;
  if (/(\d[\d,]+)\s+(items?|products?|styles?)/i.test(text) && /\b(cut|lower|reduc|cheaper|off|drop)\b/i.test(text)) score += 6;
  if (/\bnew\b.{0,20}\b(menu|item|sandwich|burger|taco|pizza|drink|meal|flavor)\b/i.test(text)) score += 5;
  if (/\btrade.?in\b/i.test(text) && /\bgift\s+card\b/i.test(text)) score += 5;
  if (/\$[\d]+/i.test(text)) score += 4;
  if (/\b(through|until|thru|ends?|only on|today only|tonight only)\s+\w/i.test(text)) score += 4;

  // Boost deals from chains everyone goes to — a McDonald's deal is relevant to everyone
  if (MASS_AUDIENCE_BRANDS.has(c.brand)) score += 3;

  // ── Penalties ────────────────────────────────────────────────────────────────
  if (!/\$[\d]|\d+\s*%|bogo|buy one|free\s+\w|recall|opening|closing|comeback/i.test(text)) score -= 4;
  if (/\bsurvey\b|\bin the app\b/i.test(text) && !/\bfree\b|\$[\d]|\bget\s+\w/i.test(text)) score -= 3;
  if (/\bcoupon\b|\bdiscount\b|\bsavings\b/i.test(text) && !/\$[\d]|\d+\s*%|bogo|free\s+\w/i.test(text)) score -= 3;
  if (title.split(" ").length < 5) score -= 3;

  // Amazon deals are only worth showing if they're a major event — not a random product discount
  if (c.brand === "AMAZON" && !/\bprime\s+(day|deal|sale)\b|\bgift\s+card\b|\bwhole\s+foods\b|\bsitewide\b/i.test(text)) score -= 6;

  return score;
}

function titleFingerprint(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => !["a","an","the","to","in","on","at","for","of","and","or","is","are","with","get","how","you","your"].includes(w))
    .slice(0, 6)
    .join(" ");
}

function filterAndRank(candidates) {
  const seenUrls = new Set();
  const seenFingerprints = new Set();

  return candidates
    .filter((c) => {
      if (seenUrls.has(c.sourceUrl)) return false;
      seenUrls.add(c.sourceUrl);
      const fp = titleFingerprint(c.title);
      if (seenFingerprints.has(fp)) return false;
      seenFingerprints.add(fp);
      return true;
    })
    .map((c) => ({ ...c, _score: scoreCandidate(c) }))
    .filter((c) => c._score >= 10)
    .sort((a, b) => b._score - a._score)
    .slice(0, 20);
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
  ]);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// ─── AI headline rewriter ─────────────────────────────────────────────────────

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

async function rewriteHeadlines(candidates, apiKey) {
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

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function fetchStories() {
  const all = await fetchAllSources();
  const filtered = filterAndRank(all);
  console.log(`[pipeline] ${all.length} raw → ${filtered.length} after scoring`);

  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    try {
      console.log(`[pipeline] Rewriting ${filtered.length} headlines with Groq…`);
      return await rewriteHeadlines(filtered, apiKey);
    } catch (e) {
      console.warn("[pipeline] Groq rewrite failed:", e.message);
    }
  }

  return filtered;
}

// ─── Image search ─────────────────────────────────────────────────────────────

export async function searchImages(q) {
  const searchParams = new URLSearchParams({
    action: "query", list: "search", srsearch: q,
    srnamespace: "6", format: "json", srlimit: "20", origin: "*",
  });
  const searchRes = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams}`, { signal: AbortSignal.timeout(8000) });
  const searchData = await searchRes.json();
  const titles = (searchData.query?.search || []).map((r) => r.title);
  if (titles.length === 0) return [];

  const infoParams = new URLSearchParams({
    action: "query", titles: titles.join("|"),
    prop: "imageinfo", iiprop: "url|mime|size", iiurlwidth: "1200",
    format: "json", origin: "*",
  });
  const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`, { signal: AbortSignal.timeout(8000) });
  const infoData = await infoRes.json();

  return Object.values(infoData.query?.pages || {})
    .filter((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return false;
      const mime = info.mime || "";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return false;
      const { width, height } = info;
      if (width && height) {
        const ratio = height / width;
        if (ratio < 0.3 || ratio > 2.5) return false; // skip extreme panoramas/tall crops
        if (width < 600) return false; // skip low-res
      }
      return true;
    })
    .map((page) => page.imageinfo?.[0]?.thumburl)
    .filter(Boolean)
    .slice(0, 8);
}
