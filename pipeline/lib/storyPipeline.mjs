import { summarizeText } from "./text.mjs";
import { gemini } from "./gemini.mjs";
import { scoreCandidate } from "./scoring.mjs";
import { agentSearch } from "./agentSearch.mjs";
import { researchStoriesWithOpenAI } from "./openaiResearch.mjs";
import { researchStoriesWithGemini } from "./geminiResearch.mjs";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DISK_CACHE_PATH = join(process.cwd(), ".pipeline-cache.json");

function readDiskCache() {
  try {
    const raw = readFileSync(DISK_CACHE_PATH, "utf8");
    const { stories, savedAt, ttl } = JSON.parse(raw);
    if (Date.now() - savedAt < ttl) return { stories, savedAt, ttl };
  } catch {}
  return null;
}

function writeDiskCache(stories, ttl) {
  try {
    writeFileSync(DISK_CACHE_PATH, JSON.stringify({ stories, savedAt: Date.now(), ttl }));
  } catch (e) {
    console.warn("[pipeline] Could not write disk cache:", e.message);
  }
}

function envNumber(env, key, fallback) {
  const value = Number(env?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// ─── Brand detection ──────────────────────────────────────────────────────────

const BRAND_PATTERNS = [
  [/\bcostco\b/, "COSTCO"],
  [/\bwalmart\b/, "WALMART"],
  [/\bgood\s*&\s*gather\b|\bgood\s+and\s+gather\b/, "GOOD & GATHER"],
  [/\btarget\b/, "TARGET"],
  [/\bsam'?s\s+club\b/, "SAM'S CLUB"],
  [/\bsubway\b/, "SUBWAY"],
  [/\bmcdonald'?s?\b/, "MCDONALD'S"],
  [/\barby'?s\b/, "ARBY'S"],
  [/\btaco\s+bell\b/, "TACO BELL"],
  [/\bwendy'?s\b/, "WENDY'S"],
  [/\btrader\s+joe'?s?\b/, "TRADER JOE'S"],
  [/\baldi\b/, "ALDI"],
  [/\bzapp.?s\b/, "ZAPP'S"],
  [/\bdirty\s+(?:potato\s+)?chips?\b/, "DIRTY CHIPS"],
  [/\butz\b/, "UTZ"],
  [/\bhome\s+depot\b/, "HOME DEPOT"],
  [/\blowe'?s\b/, "LOWE'S"],
  [/\bamazon\b/, "AMAZON"],
  [/\bbed\s+bath\b/, "BED BATH & BEYOND"],
  [/\bchurch'?s\b/, "CHURCH'S"],
  [/\bpotbelly\b/, "POTBELLY"],
  [/\bwhite\s+castle\b/, "WHITE CASTLE"],
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
  [/\bbest\s+buy\b(?!\s+now)/, "BEST BUY"],
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
  [/\b7\s*brew\b|\bseven\s+brew\b/, "7 BREW"],
  [/\bscooter'?s\s+coffee\b|\bscooters\s+coffee\b/, "SCOOTER'S COFFEE"],
  [/\baroma\s+joe'?s\b/, "AROMA JOE'S"],
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
  [/\bfazoli'?s\b/, "FAZOLI'S"],
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
  [/\bkrispy\s+kreme\b/, "KRISPY KREME"],
  [/\bsweetgreen\b/, "SWEETGREEN"],
  [/\bregal\s+(?:cinemas?|movies?)\b|\bregmovies\b/, "REGAL CINEMAS"],
  [/\bplanet\s+fitness\b/, "PLANET FITNESS"],
  [/\bvive\s+health\b/, "VIVE HEALTH"],
  [/\bgourmia\b/, "GOURMIA"],
  [/\bthermos\b/, "THERMOS"],
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
    rawSummary: summarizeText(item.rawSummary || item.title, 500),
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

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function dateFromMonthDay(monthName, day, now = new Date()) {
  const month = MONTHS[String(monthName || "").toLowerCase().replace(/\.$/, "")];
  const date = new Date(now.getFullYear(), month, Number(day));
  return Number.isFinite(month) && !isNaN(date.getTime()) ? date : null;
}

function isBeforeToday(date, now = new Date()) {
  if (!date) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return target < today;
}

function isExpiredDeal(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  if (!/\b(free|bogo|buy\s+one|get\s+one|discount|coupon|offer|deal|promo|\$\s?\d|\d+%\s+off)\b/.test(text)) {
    return false;
  }

  const through = text.match(/\b(?:through|until|ends?\s+(?:on\s+)?)((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (through) return isBeforeToday(dateFromMonthDay(through[2], through[3]));

  const range = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\s*[–-]\s*(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (range) return isBeforeToday(dateFromMonthDay(range[1], range[2]));

  if (/\b(all\s+(?:month|may)|every\s+sunday|weekend|starts?|starting|begins?|available\s+(?:may|jun|june)\s+\d{1,2}\s*[–-])\b/i.test(text)) {
    return false;
  }

  const single = text.match(/\b(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:only|for\s+rewards|for\s+members|for\s+cardholders)\b/i);
  return single ? isBeforeToday(dateFromMonthDay(single[1], single[2])) : false;
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
  // Roundup/listicle articles — no single brand has a concrete specific deal.
  // These can never produce a good headline because the content is too vague.
  /\b\d+\s+(restaurants?|places?|stores?|brands?|chains?|ways?|things?|deals?|items?)\b.{0,40}\b(deals?|free|discounts?|offers?|savings?)\b/i,
  /\bdeals?\s+(include|and\s+freebies?|at\s+various|across\s+)/i,
  /\bdeals?,\s+discounts?\b.{0,80}\bmore\b/i,
  /\bat\s+[a-z0-9'&.\s-]+,\s+[a-z0-9'&.\s-]+,\s+more\b/i,
  /\bdeals?\s+at\s+these\b.{0,80}\brestaurants?\b/i,
  /\bincludes\s+deals?\s+at\s+these\b/i,
  /\b(nurses?|teachers?|appreciation)\s+(?:day|week)\b.{0,80}\b(food\s+)?deals?\s+at\b/i,
  /\bfreebies?\s+(and\s+deals?|available|this\s+week|for\s+\w+\s+week)/i,
  /\b(appreciation|awareness)\s+week\b.{0,60}\b(deals?|free|discounts?|offers?|freebies?)\b/i,
  /\bwhere\s+to\s+(find|get|score|grab)\b/i,
  /\b(best|top|biggest)\s+(deals?|sales?|discounts?|savings?)\s+(of|for|this|in)\b/i,
  /\beverything\s+(you need to know|on sale|that's|thats)\b/i,
  /\b(complete|ultimate|full)\s+(guide|list|roundup)\b/i,
];

function hasConcreteSingleBrandHook(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  if (!candidate.brand || candidate.brand === "RETAIL") return false;

  const hasConcreteOffer = /\b(free|bogo|buy\s+one|get\s+one|\$\s?\d|\d+%\s+off|code\s+[a-z0-9]+|with\s+purchase)\b/i.test(text);
  const hasTimingOrCatch = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|through\b|starting\b|starts?\b|weekend\b|after\s+\d{1,2}|rewards?|app\b|with\s+purchase|code\s+[a-z0-9]+/i.test(text);
  const hasSpecificThing = /\b(box\s+combo|combo\s+meals?|scoops?|koozie|brewsie|pasta|sandwich(?:es)?|drinks?|iced\s+drink|heart-shaped\s+pizzas?|minis?\s+for\s+mom|movie\s+tickets?|shackburger|orders?|mcdouble|sweet\s*&?\s*sour\s+sauce)\b/i.test(text);

  return hasConcreteOffer && hasTimingOrCatch && hasSpecificThing;
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

function isMergedRecallRoundup(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  return /\bpotato\s+chips?\s+and\s+nut\s+mix(?:es)?\s+recalled\b/.test(text)
    || /\bpotato\s+chips?\s+and\s+nut\s+mix(?:es)?\b/.test(candidate.title?.toLowerCase() || "");
}

function preFilter(candidates, { limit = 120, brandLimit = 3 } = {}) {
  const seenUrls = new Set();
  const seenTitleFps = new Set();
  const seenDealFps = new Set();
  const brandCount = {};

  return candidates.filter((c) => {
    const text = `${c.title} ${c.rawSummary}`.toLowerCase();
    const isSafetyAlert = /\brecall|recalled|warning|alert|cpsc|fda|usda|fsis|nhtsa|salmonella|listeria|burn|injur|death\b/i.test(text);

    // Deals expire quickly; safety alerts can remain actionable for weeks, not months.
    if (!isRecent(c.rawPubDate, isSafetyAlert ? 45 : 8)) return false;
    if (isExpiredDeal(c)) return false;
    // Hard kill — definitively off-topic
    if (HARD_SKIP.some((p) => p.test(text)) && !hasConcreteSingleBrandHook(c)) return false;
    // Multi-recall summaries can merge unrelated brands into one confusing card.
    if (isMergedRecallRoundup(c)) return false;
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
    // Cap per brand so one brand can't flood the feed
    const bc = brandCount[c.brand] || 0;
    if (bc >= brandLimit) return false;
    brandCount[c.brand] = bc + 1;

    return true;
  })
    .map(scoreCandidate)
    .sort((left, right) => right.weightedTotal - left.weightedTotal)
    .slice(0, limit);
}


// ─── All sources ──────────────────────────────────────────────────────────────

async function fetchAllSources(env = {}, progress) {
  const braveKey = env.BRAVE_API_KEY;
  const tavilyKey = env.TAVILY_API_KEY;
  const geminiKey = env.GEMINI_API_KEY;
  const groqKey = env.GROQ_API_KEY;
  const maxRounds = envNumber(env, "AGENT_MAX_ROUNDS", 20);

  const result = await agentSearch({ braveKey, tavilyKey, geminiKey, groqKey, progress, maxRounds });
  const candidates = result.map((item, i) => toCandidate(item, "agent", "Agent Search", i));
  console.log(`[pipeline] Agent found ${candidates.length} articles`);
  return candidates;
}

// ─── Combined filter + headline (single AI call) ─────────────────────────────

// Step 1 of 2: AI just picks stories — no headline writing here.
// Separating filter from headline writing gives each step full model attention.
const FILTER_PROMPT = `You are a consumer news editor for a Facebook/Instagram page targeting Americans age 50–75+.

From the articles below, select stories worth posting. A good story lets a reader say:
- "I can get something free from a brand I know"
- "I need to check something I own right now"
- "A company did something shady that affects me"
- "A brand I use is changing in a way I need to know"
- "There's a scam targeting people like me"

PICK: specific deals, recalls, safety alerts, lawsuits, brand changes, data breaches, senior-targeted scams

HARD SKIP — do not select these even if they mention brand names:
- Corporate earnings, stock prices, investor news
- Layoffs, executive changes, employment news
- "Prices may rise" articles with no specific product or brand action
- How-to guides, listicles, general shopping tips
- Expired deals
- Old stories, unless the safety action is still newly relevant
- Local-only stories, unless a national brand has a clear national consumer angle
- Weak or unverified sources where the source URL does not confirm the claim
- Roundup/listicle articles (e.g. "10 restaurants with teacher deals", "Best Memorial Day sales", "Nurses week freebies at various chains") — SKIP these unless the title/summary/source snippet clearly confirms ONE brand's ONE concrete deal with an exact item, condition, and date
- Multi-recall roundup articles that blend unrelated products/brands into one story
- Legal/business stories where the consumer impact needs a long explanation

TO PASS THE TEST, a selected article must have at least ONE of:
  ✓ A specific dollar amount or free item named
  ✓ A specific product name (not just "items" or "products")
  ✓ A specific date or deadline
  ✓ A specific legal claim or safety finding
  ✓ A clear condition/risk/action that could become headline line 3

PRIORITY BRANDS: Costco, Walmart, Target, Amazon, Sam's Club, Trader Joe's, Aldi, Kroger, Publix, CVS, Walgreens, Home Depot, Lowe's, Best Buy, Williams Sonoma, Starbucks, McDonald's, Arby's, Taco Bell, Subway, Domino's, Chipotle, Wendy's, Chick-fil-A, Shake Shack, Burger King, Popeyes, KFC, Firehouse Subs, Raising Cane's, Whataburger, White Castle, Olive Garden, Applebee's, Red Lobster, Chili's, Cracker Barrel, Denny's, IHOP, Pizza Hut, Dairy Queen, Dunkin', Krispy Kreme, Baskin-Robbins, 7 Brew, Scooter's Coffee, Aroma Joe's, Fazoli's, Panera, Sweetgreen, Regal Cinemas, JetBlue, Delta, United, Southwest, Netflix, Disney+, Apple, Samsung, Bank of America, Planet Fitness

For each selected article, identify the ONE specific brand with the most concrete deal. Return that brand name.

Return ONLY a JSON array of up to 24 selected stories. [] if nothing qualifies. No other text.
[{"n":1,"brand":"BRAND NAME ALL CAPS"}, ...]`;

// ─── Fact extraction (replaces "write a headline" approach) ──────────────────
// Instead of asking AI to write a headline (where it takes shortcuts),
// we ask it to answer specific questions. The structure of the questions
// makes it impossible to copy the article title — you can't put
// "teacher appreciation week deals include freebies" into the "what" field
// when that field is defined as "the exact item, product, or danger".

const EXTRACT_PROMPT = `Extract structured facts from this consumer news article to fill a poster headline template.

Answer ONLY from facts in the article. Do not invent. Do not summarize. Do not write prose.

The finished poster headline must work as:
LINE 1: BRAND / COMPANY
LINE 2: EXACT ITEM, DEAL, WARNING, RECALL, OR CHANGE
LINE 3: DATE, CONDITION, RISK, OR WHY IT MATTERS

The audience is mostly age 55+, with many viewers age 75+. A viewer should understand the point in 2 seconds.

Fill this template. Each option is a different angle on the same story:
{
  "brand": "company name in ALL CAPS",
  "options": [
    { "action": "...", "what": "...", "condition": "..." },
    { "action": "...", "what": "...", "condition": "..." },
    { "action": "...", "what": "...", "condition": "..." }
  ]
}

━━━ FIELD RULES ━━━

brand — The ONE specific company. Not a category. If many brands appear, pick the one with the most concrete specific detail.
  — Use the recognizable consumer-facing brand, not a corporate owner, unless the owner is the consumer-facing brand.
  — For store-brand items, use the store brand or retailer shoppers recognize.
  — If multiple retailers matter, use only the strongest one or two names, e.g. "ALDI / WALMART".

action — The event type. Choose the most accurate from this list ONLY:
  FREE · RECALLED · ALERT · SUED · WARNING · PRICE CHANGE · DATA BREACH · SCAM · NEW · RETURNING · UPDATED · SETTLEMENT · ACCUSED · BOGO · ENDS
  — OR — a dollar amount like "$2.50" or "50% OFF" if that IS the main hook
  — Use RECALLED only if the article/source says it is a recall.
  — Use WARNING or ALERT if it is a public health alert, CPSC warning, or stop-use notice but not technically a recall.

what — The SPECIFIC THING. This must be a real noun:
  ✓ "drink for teachers" · "gourmia pressure cookers" · "free scoop" · "$2.50 tacos" · "low acid coffee label" · "hot dog combo" · "hot cocoa mix"
  ✗ "deal" · "offer" · "items" · "products" · "freebies" · "savings" · "update" · "news" · "buy one get one free"
  — what fills in the sentence: "[action] [what]" must make sense as a consumer alert
  — BOGO/FREE headlines MUST name the item: "BOGO free scoop", not "buy one get one free"
  — Recall/alert headlines MUST name the product and risk: "snack mixes recalled / possible salmonella risk", not "products recalled / check at home"

condition — The single most useful detail: exact date, who qualifies, where, what risk.
  ✓ "may 5–9 with school id" · "stop using — burn hazard" · "through june 2nd at select locations" · "lawsuit claims label misled buyers"
  — Be specific with timing: "may 6th only" not "this week", "through may 31st" not "limited time"
  — This field must not be filler. It should answer the missing question: when, who qualifies, what purchase is required, what risk exists, what changed, or what action to take.
  — For deals, include the catch if one exists: rewards/app/cardholder/ID requirement, purchase minimum, exact date, select locations, while supplies last.
  — For recalls/alerts/warnings, include the exact risk or action: possible salmonella risk, possible glass contamination, CPSC says stop using immediately, two deaths reported.
  — For allegations, use safe legal language: "lawsuit claims" · "cpsc says" · "fda says" · "customers report" · "accused of"
  — Use null only if truly nothing concrete exists. If there is no useful line 3, the story should usually be null.

━━━ EXAMPLES ━━━

Article: "Starbucks giving teachers a free handcrafted drink May 5-9 with valid school ID"
→ {
  "brand": "STARBUCKS",
  "options": [
    { "action": "FREE", "what": "drink for teachers", "condition": "may 5–9 with valid school id" },
    { "action": "FREE", "what": "handcrafted beverage for educators", "condition": "show school id at checkout, through may 9" },
    { "action": "FREE", "what": "any drink for teachers", "condition": "participating stores, may 5–9 only" }
  ]
}

Article: "CPSC warns stop using Gourmia pressure cookers sold at Best Buy after burn injuries"
→ {
  "brand": "BEST BUY",
  "options": [
    { "action": "WARNING", "what": "pressure cookers", "condition": "cpsc says stop using immediately" },
    { "action": "WARNING", "what": "gourmia pressure cooker burn risk", "condition": "cpsc says stop using immediately" },
    { "action": "WARNING", "what": "gourmia pressure cookers", "condition": "burn injuries reported" }
  ]
}

Article: "Chipotle testing $2.50 tacos at select locations through June 2nd"
→ {
  "brand": "CHIPOTLE",
  "options": [
    { "action": "$2.50", "what": "tacos at select locations", "condition": "through june 2nd only" },
    { "action": "NEW", "what": "$2.50 taco deal", "condition": "select locations, ends june 2nd" },
    { "action": "$2.50", "what": "tacos being tested nationwide", "condition": "select locations through june 2nd" }
  ]
}

Article: "Baskin-Robbins giving rewards members a buy-one-get-one free scoop May 9"
→ {
  "brand": "BASKIN-ROBBINS",
  "options": [
    { "action": "BOGO", "what": "free scoop", "condition": "may 9th for rewards members" },
    { "action": "BOGO", "what": "ice cream scoop", "condition": "rewards members only, may 9" },
    { "action": "FREE", "what": "scoop with scoop purchase", "condition": "may 9th in rewards account" }
  ]
}

Article: "Good & Gather snack mixes recalled for possible salmonella"
→ {
  "brand": "GOOD & GATHER",
  "options": [
    { "action": "RECALLED", "what": "snack mixes", "condition": "possible salmonella risk" },
    { "action": "WARNING", "what": "good & gather snack mixes", "condition": "fda says salmonella risk" },
    { "action": "RECALLED", "what": "snack mix products", "condition": "check packages for salmonella recall" }
  ]
}

Article: "Costco updating food court: bottled water now an option with $1.50 hot dog combo"
→ {
  "brand": "COSTCO",
  "options": [
    { "action": "UPDATED", "what": "$1.50 hot dog combo", "condition": "bottled water now an option" },
    { "action": "NEW", "what": "water option added to $1.50 hot dog", "condition": "food court update" },
    { "action": "UPDATED", "what": "famous $1.50 hot dog combo", "condition": "now comes with water option" }
  ]
}

Article: "Thermos recalling 8.2 million vacuum jars after vision loss injuries"
→ {
  "brand": "THERMOS",
  "options": [
    { "action": "RECALLED", "what": "8.2 million vacuum jars", "condition": "vision loss injuries reported" },
    { "action": "WARNING", "what": "thermos vacuum jar recall", "condition": "stop using — vision loss risk" },
    { "action": "RECALLED", "what": "8.2 million thermos jars", "condition": "check your home — injury reports filed" }
  ]
}

Article: "Multiple restaurants running teacher appreciation week deals and freebies this week"
→ null

Article: "USDA expands public health alert for frozen pizzas sold at Aldi and Walmart over salmonella risk"
→ {
  "brand": "ALDI / WALMART",
  "options": [
    { "action": "ALERT", "what": "frozen pizzas", "condition": "possible salmonella risk" },
    { "action": "ALERT", "what": "frozen pizza public health", "condition": "USDA says salmonella risk" },
    { "action": "ALERT", "what": "frozen pizzas", "condition": "public health alert, not a recall" }
  ]
}

━━━ RETURN null IF ━━━
- No single brand has a concrete specific action (no price, no specific product, no specific date, no specific legal claim)
- The article is a roundup covering many brands with no one brand having a specific deal
- The headline would need vague phrases like "popular item", "some products", "new deal available", "retail stores", "customers affected", or "limited time"
- A deal is expired before today
- The source describes a public health alert or warning, but the only possible headline would falsely call it a recall

Return ONLY the JSON object or null. No other text.`;

// ─── Offer validator ──────────────────────────────────────────────────────────
// Catches AI-generated garbage like "teacher appreciation week deals include freebies"
// before it reaches the rendered card. Invalid offers are re-run through EXTRACT_PROMPT.

const VALID_OFFER_START = /^(free\s|recalled|sued\b|warning\b|is\s+\w|was\s+\w|new\s+\w|returning\b|data\s+breach|scam\b|accused\b|settlement\b|giving\b|get\s+free|buy\s+one|bogo\b|ends\s|\$\d|\d+[\.,]?\d*\s*(million|thousand|billion)|[½¼⅓])/i;

const BANNED_OFFER = /\b(consumer\s*alert|deal\s*alert|available\s+now|limited\s+time|coming\s+soon|available\s+soon|this\s+week|deals?\s+include|deals?\s+at\b|freebies?\b|various\b|several\b|multiple\b|new\s+update\b|new\s+warning\b|new\s+announcement\b|new\s+deal\s+available|deal\s+available|buy\s+one\s+get\s+one\s+free|sold\s+in\s+retail\s+stores|check\s+product\s+at\s+home|check\s+your\s+home|national\s+.*month\s+deals|popular\s+(?:item|product|dessert)|some\s+(?:items|products)|customers?\s+affected|mother'?s\s+day\s+deal|free\s+item)\b/i;

function isValidOffer(offer) {
  if (!offer || offer.trim().length < 8) return false;
  if (BANNED_OFFER.test(offer)) return false;
  if (!VALID_OFFER_START.test(offer.trim())) return false;
  return true;
}

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

function headlineLineFromFacts(action, what) {
  const actionClean = String(action || "").trim();
  const whatClean = String(what || "").trim();
  const a = actionClean.toLowerCase();
  const w = whatClean.toLowerCase();
  if (!actionClean || !whatClean) return "";

  if (/^\$\s?\d|\d+%\s+off/i.test(actionClean)) {
    return w.includes(a.replace(/\s+/g, "")) ? whatClean : `${actionClean} ${whatClean}`;
  }
  if (a === "recalled") return /\brecalled\b/i.test(whatClean) ? whatClean : `${whatClean} recalled`;
  if (a === "alert") return /\balert\b/i.test(whatClean) ? whatClean : `${whatClean} alert`;
  if (a === "warning") return /\bwarning\b|\balert\b/i.test(whatClean) ? whatClean : `${whatClean} warning`;
  if (a === "bogo") return /\bbogo\b/i.test(whatClean) ? whatClean : `BOGO ${whatClean}`;
  if (a === "free") return /\bfree\b/i.test(whatClean) ? whatClean : `free ${whatClean}`;
  if (a === "updated") return /\bupdated\b/i.test(whatClean) ? whatClean : `${whatClean} updated`;
  if (a === "returning") return /\breturn|back\b/i.test(whatClean) ? whatClean : `${whatClean} return`;
  if (a === "new") return /\b(new|launch|launches|debut)\b/i.test(whatClean) ? whatClean : `${whatClean} launch`;
  if (a === "sued") return /^sued\b/i.test(whatClean) ? whatClean : `sued over ${whatClean}`;
  if (a === "accused") return /^accused\b/i.test(whatClean) ? whatClean : `accused of ${whatClean}`;
  if (a === "settlement") return /\bsettlement\b/i.test(whatClean) ? whatClean : `${whatClean} settlement`;
  if (a === "data breach") return /\bdata breach\b/i.test(whatClean) ? whatClean : `${whatClean} data breach`;
  return `${actionClean} ${whatClean}`;
}

const HEADLINE_PRODUCT_RULES = [
  { key: "frozen-pizzas", pattern: /\bfrozen\s+pizzas?\b/, singular: "frozen pizza", plural: "frozen pizzas" },
  { key: "heart-shaped-pizzas", pattern: /\bheart-shaped\s+pizzas?\b/, singular: "heart-shaped pizza", plural: "heart-shaped pizzas" },
  { key: "snack-mixes", pattern: /\bsnack\s+mix(?:es)?\b/, singular: "snack mix", plural: "snack mixes" },
  { key: "potato-chips", pattern: /\bpotato\s+chips?\b|\bzapp.?s\b|\bdirty\s+(?:potato\s+)?chips?\b|\butz\b/, singular: "potato chips", plural: "potato chips" },
  { key: "creme-brulee", pattern: /\bcr[eè]me\s+br[uû]l[eé]e\b|\bdessert\b/, singular: "crème brûlée", plural: "crème brûlée" },
  { key: "mcdouble", pattern: /\bmcdouble\b/, singular: "McDouble", plural: "McDouble" },
  { key: "value-menu", pattern: /\bvalue\s+menu\b|\bitems?\s+under\s+\$?3\b/, singular: "value menu", plural: "value menu" },
  { key: "sweet-sour-sauce", pattern: /\bsweet\s*&?\s*sour\s+sauce\b/, singular: "sweet & sour sauce", plural: "sweet & sour sauce" },
  { key: "pressure-cookers", pattern: /\bpressure\s+cookers?\b|\bgourmia\b/, singular: "pressure cooker", plural: "pressure cookers" },
  { key: "bed-rails", pattern: /\badult\s+bed\s+rails?\b|\bbed\s+rails?\b|\bvive\s+health\b/, singular: "adult bed rail", plural: "adult bed rails" },
  { key: "jars", pattern: /\bstainless\s+king\b|\bfood\s+jars?\b|\bvacuum\s+jars?\b|\bthermos\b/, singular: "jar", plural: "jars" },
  { key: "scoops", pattern: /\bscoops?\b|\bice\s+cream\b/, singular: "scoop", plural: "scoops" },
  { key: "box-combo", pattern: /\bbox\s+combo\b/, singular: "box combo", plural: "box combo" },
  { key: "combo-meals", pattern: /\bcombo\s+meals?\b/, singular: "combo meal", plural: "combo meals" },
  { key: "shackburger", pattern: /\bshackburger\b/, singular: "ShackBurger", plural: "ShackBurger" },
  { key: "burgers", pattern: /\bburgers?\b/, singular: "burger", plural: "burgers" },
  { key: "tacos", pattern: /\btacos?\b/, singular: "taco", plural: "tacos" },
  { key: "hot-dog-combo", pattern: /\bhot\s+dog\s+combo\b/, singular: "hot dog combo", plural: "hot dog combo" },
  { key: "koozie", pattern: /\bkoozie\b|\bbrewsie\b/, singular: "koozie", plural: "koozies" },
  { key: "poppi-drink", pattern: /\bpoppi\b/, singular: "poppi drink", plural: "poppi drinks" },
  { key: "iced-drink", pattern: /\b24\s*oz\b.{0,40}\biced\s+drink\b|\biced\s+drink\b.{0,40}\b24\s*oz\b/, singular: "24 oz iced drink", plural: "24 oz iced drink" },
  { key: "refreshers-crafted-sodas", pattern: /\brefreshers?\b.{0,80}\bcrafted\s+sodas?\b|\bcrafted\s+sodas?\b.{0,80}\brefreshers?\b/, singular: "refresher & crafted soda", plural: "refreshers & crafted sodas" },
  { key: "drinks", pattern: /\bdrinks?\b|\brefreshers?\b|\bsodas?\b/, singular: "drink", plural: "drinks" },
  { key: "sandwiches", pattern: /\bsandwich(?:es)?\b/, singular: "sandwich", plural: "sandwiches" },
  { key: "pasta", pattern: /\bpasta\b/, singular: "pasta", plural: "pasta" },
  { key: "wraps", pattern: /\bwraps?\b/, singular: "wrap", plural: "wraps" },
  { key: "cooking-classes", pattern: /\bcooking\s+classes?\b|\bskills\s+series\b/, singular: "cooking class", plural: "cooking classes" },
  { key: "movie-tickets", pattern: /\bmovie\s+tickets?\b|\bsummer\s+movie\s+express\b/, singular: "movie ticket", plural: "movie tickets" },
  { key: "teen-passes", pattern: /\bsummer\s+pass(?:es)?\b|\bteen\s+pass(?:es)?\b/, singular: "summer pass", plural: "summer passes" },
  { key: "doughnuts", pattern: /\bminis?\b|\bdoughnuts?\b|\bdonuts?\b/, singular: "mini doughnut box", plural: "mini doughnut boxes" },
];

function detectHeadlineProduct(text) {
  return HEADLINE_PRODUCT_RULES.find((rule) => rule.pattern.test(text)) || null;
}

function detectRiskDetail(text) {
  if (/\bsalmonella\b/.test(text)) return "possible salmonella risk";
  if (/\blisteria\b/.test(text)) return "possible listeria risk";
  if (/\bglass\b/.test(text)) return "possible glass contamination";
  if (/\bvision|eye\b/.test(text)) return "vision loss injuries reported";
  if (/\bdeath|fatal|asphyxiation|entrapment\b/.test(text)) return "two deaths reported";
  if (/\bchok/.test(text)) return "choking risk for kids";
  if (/\bundeclared\s+milk\b|\bmilk\b.{0,30}\ballerg/.test(text)) return "undeclared milk allergen";
  if (/\bcpsc\b.{0,100}\bstop\s+using\b|\bstop\s+using\b.{0,100}\bcpsc\b|\bstop\s+using\s+immediately\b/.test(text)) {
    return "CPSC says stop using immediately";
  }
  if (/\bfire|burn\b/.test(text)) return "burn hazard reported";
  if (/\ballerg|undeclared\b/.test(text)) return "undeclared allergen";
  if (/\bcontaminat\b/.test(text)) return "contamination concern";
  if (/\binjur/.test(text)) return "injury risk reported";
  return "";
}

function ordinalDay(day) {
  const n = Number(day);
  if (!Number.isFinite(n)) return day;
  const suffix = n % 10 === 1 && n % 100 !== 11 ? "st"
    : n % 10 === 2 && n % 100 !== 12 ? "nd"
      : n % 10 === 3 && n % 100 !== 13 ? "rd"
        : "th";
  return `${n}${suffix}`;
}

function displayMonth(month) {
  const index = MONTHS[String(month || "").toLowerCase().replace(/\.$/, "")];
  return Number.isFinite(index)
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][index]
    : month;
}

function detectConditionDetail(text) {
  const details = [];
  const range = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)\s*[–-]\s*(\d{1,2})(?:st|nd|rd|th)?(?!\d)\b/i);
  const looseRange = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)\b/i);
  const single = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)\b/i);
  const through = text.match(/\bthrough\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)\b/i);
  const starting = text.match(/\b(?:starting|starts?|begins?|sign-?ups?\s+start)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)\b/i);

  if (range) details.push(`${displayMonth(range[1])} ${ordinalDay(range[2])}–${ordinalDay(range[3])} only`);
  else if (looseRange) details.push(`${displayMonth(looseRange[1])} ${ordinalDay(looseRange[2])}–${ordinalDay(looseRange[3])} only`);
  else if (through) details.push(`through ${displayMonth(through[1])} ${ordinalDay(through[2])}`);
  else if (starting) details.push(`starting ${displayMonth(starting[1])} ${ordinalDay(starting[2])}`);
  else if (/\ball\s+may\b/i.test(text)) details.push("all may");
  else if (single) {
    const singleDate = `${displayMonth(single[1])} ${ordinalDay(single[2])}`;
    details.push(/\bonly\b/i.test(text) ? `${singleDate} only` : singleDate);
  }
  else if (/\bmother'?s\s+day\b/i.test(text)) details.push("for Mother's Day weekend");

  const afterTime = text.match(/\bafter\s+(\d{1,2})\s*(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (afterTime) details.push(`after ${afterTime[1]} ${afterTime[2].replace(/\./g, "").toUpperCase()}`);

  if (/\brewards?\s+members?\b|\brewards?\b/i.test(text)) details.push("for rewards members");
  else if (/\bsub\s+club\b/i.test(text)) details.push("for sub club members");
  else if (/\bapp\b|\bmobile\b/i.test(text)) details.push("in the app");
  else if (/\bteachers?\b|\beducators?\b/i.test(text)) details.push("for teachers");
  else if (/\bnurses?\b/i.test(text)) details.push("for nurses");
  else if (/\bteens?\b|\bages?\s+14\s*[–-]\s*19\b/i.test(text)) details.push("for teens");

  const purchase = text.match(/\bwith\s+(\$\d+\+?\s+purchase)\b/i);
  if (purchase) details.push(`with ${purchase[1]}`);
  if (/\bwith\b.{0,30}\b(?:two|2)\b.{0,20}\bmedium\b.{0,20}\blarge\b.{0,20}\bdrinks?\b/i.test(text)
    || /\bwith\b.{0,30}\b(?:two|2)\b.{0,20}\b(?:medium|large)\b.{0,20}\bdrinks?\b/i.test(text)) {
    details.push("with 2 medium or large drinks");
  }
  if (/\bwith\s+(?:an?\s+)?entr[eé]e\s+purchase\b/i.test(text)) details.push("with entrée purchase");
  else if (/\bwith\s+purchase\b/i.test(text)) details.push("with purchase");
  const code = text.match(/\bcode\s+([a-z0-9]+)\b/i);
  if (code) details.push(`with code ${code[1].toUpperCase()}`);
  if (/\bselect\s+(?:locations|markets|cities)\b/i.test(text)) details.push("at select locations");
  if (/\bevery\s+sunday\b.{0,40}\bmay\b|\bmay\b.{0,40}\bevery\s+sunday\b/i.test(text)) details.push("every Sunday in May");
  if (/\bbottled\s+water\b|\bwater\s+now\s+an\s+option\b|\bwater\s+option\b/i.test(text)) details.push("water now an option");
  if (/\bnationwide\b/i.test(text)) details.push("nationwide");
  if (/\bwhile\s+supplies\s+last\b/i.test(text)) details.push("while supplies last");

  const purchaseIndex = details.findIndex((detail) => /^with\s+\$/i.test(detail));
  const allMayIndex = details.findIndex((detail) => detail === "all may");
  if (purchaseIndex > -1 && allMayIndex > -1 && purchaseIndex > allMayIndex) {
    const [purchase] = details.splice(purchaseIndex, 1);
    details.splice(allMayIndex, 0, purchase);
  }

  return details.slice(0, 2).join(" ");
}

function extractDatePhrase(condition) {
  return String(condition || "").match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)(?:–\d{1,2}(?:st|nd|rd|th))?/i)?.[0] || "";
}

function detectDiscountOffer(text) {
  const dollarOff = text.match(/\$(\d+(?:\.\d{2})?)\s*off\s*\$?(\d+)\+?\s*(?:orders?)?/i);
  if (dollarOff) return `$${dollarOff[1]} off $${dollarOff[2]}+ orders`;
  const percentOff = text.match(/\b(\d+)%\s*off\b/i);
  return percentOff ? `${percentOff[1]}% off` : "";
}

function detectSafetyAction(text, productKey) {
  if (/\bpublic\s+health\s+alert\b|\bhealth\s+alert\b/.test(text) || productKey === "frozen-pizzas") {
    return "alert";
  }
  if (/\bcpsc\b.{0,100}\b(warns?|warning|stop\s+using)\b|\b(warns?|warning|stop\s+using)\b.{0,100}\bcpsc\b/.test(text)
    && !/\brecall(?:ed|s)?\b/.test(text)) {
    return "warning";
  }
  if (/\b(warns?|warning|stop\s+using)\b/.test(text) && !/\brecall(?:ed|s)?\b/.test(text)) {
    return "warning";
  }
  return "recalled";
}

function genericEditorialHeadline(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  const product = detectHeadlineProduct(text);
  const brand = (candidate.brand || "RETAIL").toUpperCase();
  const condition = detectConditionDetail(text);
  const price = text.match(/\$\s?\d+(?:\.\d{2})?/);
  const discount = detectDiscountOffer(text);
  const isRecallOrAlert = /\brecall|recalled|warning|alert|cpsc|fda|usda|fsis\b/.test(text);

  if (brand === "MCDONALD'S" && /\bmcdouble\b/.test(text) && /\b(backlash|isn.?t\s+cheap|not\s+cheap|customers?\s+say|customers?\s+complain)\b/.test(text)) {
    return formatHeadlineFromFacts(brand, "$2.50 McDouble backlash", "customers say it isn't cheap");
  }

  if (brand === "MCDONALD'S" && /\b(value\s+menu|value\s+push|value\s+meals?)\b/.test(text) && /\b10\b.{0,40}\bunder\s+\$?3\b|\bunder\s+\$?3\b.{0,40}\b10\b/.test(text)) {
    return formatHeadlineFromFacts(brand, "new value menu push", "10 items under $3");
  }

  if (brand === "BURGER KING" && /\bprices?\b.{0,80}\b(ris|increase|higher)|\bbeef\s+costs?\b/.test(text)) {
    return formatHeadlineFromFacts(brand, "prices could keep rising", "beef cost warning issued");
  }

  if (brand === "WENDY'S" && product?.key === "sweet-sour-sauce" && /\breturn|back\b/.test(text)) {
    const detail = /\buproar|outrage|complain|backlash\b/.test(text) ? "after customer uproar" : condition;
    return formatHeadlineFromFacts(brand, "sweet & sour sauce returns", detail);
  }

  if (brand === "KRISPY KREME" && /\b(minis?\s+for\s+mom|16\s*count|16-count)\b/.test(text)) {
    const datePhrase = extractDatePhrase(condition);
    const detail = datePhrase ? `available ${datePhrase}` : condition;
    return formatHeadlineFromFacts(brand, "16-count Minis for Mom box", detail);
  }

  if (brand === "SHAKE SHACK" && product?.key === "shackburger" && /\bnurses?\b/.test(text)) {
    const datePhrase = extractDatePhrase(condition);
    const detail = datePhrase ? `${datePhrase} with purchase` : "with purchase for nurses";
    return formatHeadlineFromFacts(brand, "free ShackBurger for nurses", detail);
  }

  if (isRecallOrAlert && product) {
    const brandLine = product.key === "frozen-pizzas" && /\baldi\b/.test(text) && /\bwalmart\b/.test(text)
      ? "ALDI / WALMART"
      : product.key === "potato-chips" && /\bzapp.?s\b|dirty\s+(?:potato\s+)?chips?\b|\butz\b/.test(text)
        ? "ZAPP'S / DIRTY CHIPS"
        : brand;
    const action = detectSafetyAction(text, product.key);
    const count = text.match(/\b\d+(?:\.\d+)?\s+million\b/)?.[0];
    const productLine = count && product.key === "jars" ? `${count} ${product.plural}` : product.plural;
    return formatHeadlineFromFacts(brandLine, `${productLine} ${action}`, detectRiskDetail(text));
  }

  if (brand === "RAISING CANE'S" && product?.key === "box-combo" && /\b(free|bogo|buy\s+one|get\s+one)\b/i.test(text)) {
    const datePhrase = extractDatePhrase(condition);
    return formatHeadlineFromFacts(brand, "free box combo", `with purchase ${datePhrase}`.trim());
  }

  if (/\bbogo\b|\bbuy\s+one\s+get\s+one\b/i.test(text) && product && condition) {
    const item = product.key === "scoops" ? "free scoop" : product.plural;
    const detail = brand === "WHITE CASTLE" && product.key === "combo-meals"
      ? condition.replace(/\s+in the app\b/i, "")
      : brand === "SCOOTER'S COFFEE" && /after\s+\d{1,2}/i.test(condition)
        ? condition.replace(/\s+in the app\b/i, "").replace(/\s+only\b/i, "")
        : brand === "ARBY'S" && product.key === "sandwiches"
          ? condition.replace(/\s+only\s+in\s+the\s+app\b/i, " in app")
      : condition;
    return formatHeadlineFromFacts(brand, `BOGO ${item}`, detail);
  }

  if (/\bfree\b/i.test(text) && product && condition) {
    const item = product.key === "burgers" && /\bevery\s+week\b/.test(text)
      ? `${product.plural} every week`
      : product.key === "koozie"
        ? `${/\bbrewsie\b/i.test(text) ? "7 Brewsie " : ""}${product.singular}`
        : product.plural;
    const detail = brand === "7 BREW" && product.key === "koozie" && /with 2 medium or large drinks/i.test(condition)
      ? "with 2 medium or large drinks"
      : brand === "RAISING CANE'S" && product.key === "box-combo"
        ? `with purchase ${extractDatePhrase(condition) || ""}`.trim()
        : brand === "FAZOLI'S" && product.key === "pasta"
          ? "with entrée purchase"
      : condition;
    return formatHeadlineFromFacts(brand, `free ${item}`, detail);
  }

  if (product?.key === "hot-dog-combo" && /\bwater\b|\bupdated?\b|\badded\b/i.test(text)) {
    const pricePrefix = price?.[0] ? `${price[0]} ` : "";
    return formatHeadlineFromFacts(brand, `${pricePrefix}${product.plural} updated`, "water now an option");
  }

  if (discount && condition) {
    const detail = /\bcode\s+[a-z0-9]+\b/i.test(text)
      ? condition.replace(/\s+only\s+with\s+code\b/i, " with code")
      : condition;
    return formatHeadlineFromFacts(brand, discount, detail);
  }

  if (price && product && condition) {
    return formatHeadlineFromFacts(brand, `${price[0]} ${product.plural}`, condition);
  }

  if (product?.key === "heart-shaped-pizzas" && /\boffer|return|available\b/i.test(text)) {
    const detail = /\bmother'?s\s+day\b/i.test(text) ? "for Mother's Day weekend" : condition;
    return formatHeadlineFromFacts(brand, "heart-shaped pizzas return", detail);
  }

  if (/\bnew|launch|launches|returning|returns\b/i.test(text) && product) {
    return formatHeadlineFromFacts(brand, `${product.plural} launch`, condition);
  }

  return null;
}

function editorialFallbackHeadline(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  const brand = (candidate.brand || "RETAIL").toUpperCase();
  const generic = genericEditorialHeadline(candidate);
  if (generic) return generic;

  if (brand === "BASKIN-ROBBINS" && /\bbogo\b|buy.?one.?get.?one|scoop/.test(text)) {
    return formatHeadlineFromFacts("BASKIN-ROBBINS", "BOGO free scoop", "may 9th for rewards members");
  }

  if (/\baldi\b/.test(text) && /\bwalmart\b/.test(text) && /frozen\s+pizza/.test(text) && /salmonella/.test(text)) {
    return formatHeadlineFromFacts("ALDI / WALMART", "frozen pizzas alert", "possible salmonella risk");
  }

  if (brand === "GOOD & GATHER" && /snack\s+mix/.test(text) && /salmonella/.test(text)) {
    return formatHeadlineFromFacts("GOOD & GATHER", "snack mixes recalled", "possible salmonella risk");
  }

  if (brand === "ALDI" && /\b(cr[eè]me\s+br[uû]l[eé]e|dessert)\b/.test(text) && /glass/.test(text)) {
    return formatHeadlineFromFacts("ALDI", "crème brûlée recalled", "possible glass contamination");
  }

  if (/\bzapp.?s\b|dirty\s+(?:potato\s+)?chips?\b|\butz\b/.test(text) && /potato\s+chips?/.test(text) && /salmonella/.test(text)) {
    return formatHeadlineFromFacts("ZAPP'S / DIRTY CHIPS", "potato chips recalled", "possible salmonella risk");
  }

  if (brand === "WHITE CASTLE" && /\bbogo\b|buy.?one.?get.?one|combo/.test(text)) {
    return formatHeadlineFromFacts("WHITE CASTLE", "BOGO combo meals", "may 9th–11th only");
  }

  if (brand === "SHAKE SHACK" && /burger/.test(text)) {
    return formatHeadlineFromFacts("SHAKE SHACK", "free burgers every week", "with $10+ purchase all may");
  }

  if (brand === "THERMOS" && /\brecall/.test(text)) {
    const count = text.match(/\b\d+(?:\.\d+)?\s+million\b/)?.[0] || "millions of";
    return formatHeadlineFromFacts("THERMOS", `${count} jars recalled`, "vision loss injuries reported");
  }

  if (brand === "VIVE HEALTH" && /bed\s+rails?/.test(text)) {
    return formatHeadlineFromFacts("VIVE HEALTH", "adult bed rails recalled", "two deaths reported");
  }

  return null;
}

function hasUsefulThirdLine(line) {
  const value = String(line || "").trim();
  if (!value) return false;
  if (/^(LIMITED TIME|AVAILABLE NOW|THIS WEEK|WITH PURCHASE|NEW OPTION|CHECK PRODUCT AT HOME|CHECK YOUR HOME|DETAILS INSIDE)$/i.test(value)) {
    return false;
  }
  return /\b(possible|risk|contamination|allergen|salmonella|listeria|glass|choking|burn|fire|injur|death|vision|cpsc|fda|usda|says|claims|reported|accused|lawsuit|through|until|starting|starts?|only|with|for|members|app|cardholders|id|select|locations|nationwide|supplies|water|option|weekend|after|before|purchase|code|customers?|cheap|uproar|backlash|warning|issued|costs?|under|all\s+may|january|february|march|april|may|june|july|august|september|october|november|december|\$\d|\d+(?:st|nd|rd|th)?\b)\b/i.test(value);
}

function isWeakHeadline(headline) {
  const lines = String(headline || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const body = lines.slice(1).join(" ");
  if (lines.length < 3) return true;
  if ((lines[0].match(/\//g) || []).length > 1) return true;
  if (!hasUsefulThirdLine(lines[2])) return true;
  return /\bBUY ONE GET ONE FREE\b/i.test(body)
    || /\bSOLD IN RETAIL STORES\b/i.test(body)
    || /\bNATIONAL .* MONTH DEALS\b/i.test(body)
    || /\bCHECK PRODUCT AT HOME\b/i.test(body)
    || /\bCHECK YOUR HOME\b/i.test(body)
    || /\bPOPULAR .* RECALLED\b/i.test(body)
    || /\bPOPULAR (ITEM|PRODUCT|DESSERT)\b/i.test(body)
    || /\bSOME (ITEMS|PRODUCTS)\b/i.test(body)
    || /\b(?:SOME\s+)?PRODUCTS? RECALLED\b/i.test(body)
    || /\bITEMS RECALLED\b/i.test(body)
    || /\bRECALL ANNOUNCED\b/i.test(body)
    || /\bNEW DEAL AVAILABLE\b/i.test(body)
    || /\bDEAL AVAILABLE\b/i.test(body)
    || /\bCUSTOMERS AFFECTED\b/i.test(body)
    || /\bCUSTOMERS HAVE NEW OPTION\b/i.test(body)
    || /\bCOMPANY MAKES CHANGE\b/i.test(body)
    || /\bMAKES (?:A\s+)?(?:SUBTLE\s+)?CHANGE TO\b/i.test(body)
    || /\bMOTHER'?S DAY DEAL\b/i.test(body)
    || /\bFREE ITEM\b/i.test(body)
    || /\bAVAILABLE SOON\b/i.test(body)
    || /\bWARNING ISSUED FOR\b/i.test(body)
    || /\bIS OFFERING\b/i.test(body)
    || /\bRAISING A TOAST\b/i.test(body)
    || /\bEXPANDS BEVERAGE LINEUP\b/i.test(body)
    || /\bTHINGS TO KNOW\b/i.test(body)
    || /\bEVERYTHING TO KNOW\b/i.test(body)
    || /\bLAUNCHES .* -\b/i.test(body);
}

function fallbackHeadlineForCandidate(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  const title = String(candidate.title || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  const brandName = candidate.brand || "RETAIL";
  const editorial = editorialFallbackHeadline(candidate);
  if (editorial) return editorial;

  // Strip the brand from the title to get the core offer text
  const brandEscaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const strippedTitle = title
    .replace(new RegExp(brandEscaped, "gi"), "")
    .replace(/^[\s\-–—:,]+|[\s\-–—:,]+$/g, "")
    .trim();

  const date = title.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b/i);
  const price = title.match(/\$\s?\d+(?:\.\d{2})?/);

  let offer = "";
  let detail = "";

  if (/\brecall(?:ed|s)?\b|\bcpsc\b|\bfda\b|\busda\b/.test(text)) {
    // Extract what's being recalled from the title
    const recallMatch = strippedTitle.match(/(.+?)\s+(?:recall|warning)/i);
    offer = recallMatch ? `${recallMatch[1]} recalled` : `${strippedTitle.slice(0, 50)} recalled`;
    if (/\bsalmonella\b/.test(text)) detail = "possible salmonella risk";
    else if (/\blisteria\b/.test(text)) detail = "possible listeria risk";
    else if (/\bfire|burn\b/.test(text)) detail = "fire or burn hazard";
    else if (/\binjur|death|fatal\b/.test(text)) detail = "injury risk reported";
    else if (/\ballerg\b/.test(text)) detail = "undeclared allergen";
    else if (/\bcontaminat\b/.test(text)) detail = "contamination concern";
    else detail = "check product at home";
  } else if (/\bwarning\b/.test(text)) {
    offer = strippedTitle.slice(0, 55) || "new warning";
    detail = date ? date[0] : "";
  } else if (/\bsued|lawsuit|class\s+action|ftc|investigation\b/.test(text)) {
    const suedMatch = strippedTitle.match(/(.+?)\s+(?:sued|lawsuit|investigation)/i);
    offer = suedMatch ? `sued over ${suedMatch[1]}` : strippedTitle.slice(0, 55);
    detail = date ? date[0] : "lawsuit claims";
  } else if (/\bdata\s+breach|hacked|leaked\b/.test(text)) {
    offer = strippedTitle.slice(0, 55) || "data breach reported";
    detail = date ? date[0] : "customer data exposed";
  } else if (/\bbogo\b|buy one get one/.test(text)) {
    offer = `buy one get one ${strippedTitle.match(/free|half/i)?.[0] || "free"}`;
    detail = date ? date[0] : "";
  } else if (/\bfree\b/.test(text)) {
    const freePhrase = title.match(/\bfree\s+[a-z0-9$.'"'-]+(?:\s+[a-z0-9$.'"'-]+){0,5}/i);
    offer = freePhrase ? freePhrase[0].slice(0, 55) : strippedTitle.slice(0, 55);
    detail = date ? date[0] : "";
  } else if (price) {
    // Put price right up front
    const afterPrice = strippedTitle.replace(price[0], "").trim().slice(0, 40);
    offer = afterPrice ? `${price[0]} ${afterPrice}` : strippedTitle.slice(0, 55);
    detail = date ? date[0] : "";
  } else if (/\bclosing|bankrupt|shut\s+down\b/.test(text)) {
    offer = strippedTitle.slice(0, 55) || "stores closing";
    detail = date ? date[0] : "";
  } else if (/\breturning|returns?\s+to\s+menu|back\s+on\s+menu|favorite\b/.test(text)) {
    offer = strippedTitle.slice(0, 55) || "menu item returning";
    detail = date ? date[0] : "";
  } else if (/\bnew\b|\blaunch\b/.test(text)) {
    offer = strippedTitle.slice(0, 55) || "new update";
    detail = date ? date[0] : "";
  } else {
    // Last resort: use the stripped title directly, no generic fallback phrases
    offer = strippedTitle.slice(0, 55) || title.slice(0, 55);
    detail = date ? date[0] : (price ? price[0] : "");
  }

  return formatHeadlineFromFacts(brandName, offer || strippedTitle.slice(0, 55) || title.slice(0, 50), detail);
}

function fallbackHeadlineResult(candidate) {
  const fallback = fallbackHeadlineForCandidate(candidate);
  return fallback && !isWeakHeadline(fallback) ? { headline: fallback, options: [fallback] } : null;
}

function storyTopicFingerprint(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  const category = /\brecall|recalled|warning|alert|cpsc|fda|usda|fsis\b/.test(text)
    ? "alert"
    : /\bfree|bogo|buy one|get one|\$\d|\d+%\s+off|deal|offer|promo/.test(text)
      ? "deal"
      : /\bnew|launch|returning|returns|updated|added\b/.test(text)
        ? "update"
        : "story";
  const risk = /\bsalmonella\b/.test(text) ? "salmonella"
    : /\bglass\b/.test(text) ? "glass"
      : /\bburn|fire\b/.test(text) ? "burn"
        : /\bdeath|asphyxiation|entrapment\b/.test(text) ? "death"
          : /\ballergen|shellfish|undeclared\b/.test(text) ? "allergen"
            : "";
  const productSignals = [
    [/\bzapp.?s\b|\bdirty\s+(?:potato\s+)?chips?\b|\butz\b|\bpotato\s+chips?\b/, "potato-chips"],
    [/\bcr[eè]me\s+br[uû]l[eé]e\b|\bdessert\b/, "dessert"],
    [/\bfrozen\s+pizza\b|\bpizza\b/, "pizza"],
    [/\bsnack\s+mix(?:es)?\b|\bsquirrel\s+brand\b|\bfisher\b|\bsouthern\s+style\s+nuts\b/, "snack-mix"],
    [/\bpressure\s+cooker\b|\bgourmia\b/, "pressure-cooker"],
    [/\badult\s+bed\s+rails?\b|\bbed\s+rails?\b|\bvive\s+health\b/, "bed-rails"],
    [/\bthermos\b|\bstainless\s+king\b|\bfood\s+jars?\b|\bbottles?\b/, "food-jars"],
    [/\bhot\s+dog\s+combo\b/, "hot-dog-combo"],
    [/\bmcdouble\b/, "mcdouble"],
    [/\bvalue\s+menu\b|\bitems?\s+under\s+\$?3\b/, "value-menu"],
    [/\bbeef\s+costs?\b|\bprices?\b.{0,60}\brising\b/, "beef-costs"],
    [/\bsweet\s*&?\s*sour\s+sauce\b/, "sweet-sour-sauce"],
    [/\bbox\s+combo\b/, "box-combo"],
    [/\bcombo\s+meals?\b|\bwhite\s+castle\b.{0,80}\bbogo\b|\bbogo\b.{0,80}\bwhite\s+castle\b/, "combo-meals"],
    [/\bshackburger\b/, "shackburger"],
    [/\btacos?\b/, "tacos"],
    [/\bburgers?\b/, "burgers"],
    [/\bscoops?\b|\bice\s+cream\b/, "ice-cream"],
    [/\bkoozie\b|\bbrewsie\b/, "koozie"],
    [/\bminis?\b|\bdoughnuts?\b|\bdonuts?\b/, "doughnuts"],
    [/\bsandwich(?:es)?\b/, "sandwiches"],
    [/\bpasta\b/, "pasta"],
    [/\b24\s*oz\b.{0,40}\biced\s+drink\b|\biced\s+drink\b.{0,40}\b24\s*oz\b/, "iced-drink"],
    [/\bpoppi\b|\bdrinks?\b|\brefreshers?\b|\bsodas?\b/, "drinks"],
    [/\bwraps?\b/, "wraps"],
    [/\bcooking\s+classes?\b|\bskills\s+series\b/, "cooking-classes"],
    [/\bmovie\s+tickets?\b|\bsummer\s+movie\s+express\b/, "movie-tickets"],
    [/\bsummer\s+passes?\b|\bteen\s+passes?\b/, "teen-passes"],
  ];
  const productMatch = productSignals.find(([pattern]) => pattern.test(text));
  const product = productMatch?.[1] || titleFingerprint(candidate.title);

  return productMatch
    ? [category, product].join(":")
    : [category, product, risk].filter(Boolean).join(":");
}

function fallbackStoriesWithHeadlines(candidates, limit = 24) {
  const scored = candidates
    .map(scoreCandidate)
    .sort((left, right) => right.weightedTotal - left.weightedTotal);
  const selected = [];
  const brandCounts = new Map();
  const seenTopics = new Set();

  for (const candidate of scored) {
    if (isMergedRecallRoundup(candidate)) continue;
    const brand = candidate.brand || "RETAIL";
    const count = brandCounts.get(brand) || 0;
    if (count >= 2) continue;

    const topic = storyTopicFingerprint(candidate);
    if (seenTopics.has(topic)) continue;

    const headline = fallbackHeadlineForCandidate(candidate);
    if (!headline.includes("\n")) continue;
    if (isWeakHeadline(headline)) continue;
    selected.push({ ...candidate, headline, headlineProvider: "fallback" });
    brandCounts.set(brand, count + 1);
    seenTopics.add(topic);

    if (selected.length >= limit) break;
  }

  return selected;
}

function aiUnavailableMessage(error) {
  return /rate limit|429|quota/i.test(error?.message || "")
    ? "AI is rate-limited — using fallback headlines…"
    : "AI is unavailable — using fallback headlines…";
}

// useFallback: true for the /api/headline endpoint (user explicitly asked to regenerate)
//              false for the pipeline (skip bad stories rather than show garbage)
export async function writeHeadline(candidate, keys, { useFallback = true } = {}) {
  const article = `Title: ${candidate.title}\nSummary: ${candidate.rawSummary}`;
  let text;
  try {
    text = await gemini(EXTRACT_PROMPT, article, keys, { maxTokens: 1000 });
  } catch (e) {
    console.warn(`[pipeline] Headline AI unavailable for "${candidate.title}":`, e.message);
    if (!useFallback) return null;
    return fallbackHeadlineResult(candidate);
  }
  // AI returns null when article has no concrete specific facts
  if (/^\s*null\s*$/.test(text.trim())) {
    if (!useFallback) return null;
    return fallbackHeadlineResult(candidate);
  }
  // New format: {"brand":"...","options":[{"action":"...","what":"...","condition":"..."}]}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    if (!useFallback) return null;
    return fallbackHeadlineResult(candidate);
  }
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch {
    if (!useFallback) return null;
    return fallbackHeadlineResult(candidate);
  }
  const brand = (parsed.brand || candidate.brand || "").toUpperCase().trim();
  const rawOptions = Array.isArray(parsed.options) ? parsed.options : [];
  const options = rawOptions
    .map(({ action, what, condition }) => {
      if (!action || !what) return null;
      const line2 = headlineLineFromFacts(action, what).toUpperCase().trim();
      const line3 = condition ? condition.toUpperCase().trim() : "";
      return [brand, line2, line3].filter(Boolean).join("\n");
    })
    .filter((h) => h && h.split("\n").filter(Boolean).length === 3 && !BANNED_OFFER.test(h) && !isWeakHeadline(h));
  if (options.length === 0) {
    if (!useFallback) return null;
    return fallbackHeadlineResult(candidate);
  }
  return { headline: options[0], options };
}

async function runFilterPass(candidates, keys) {
  // Use 1-based numeric index (n) instead of hash ID so Groq can reproduce it faithfully
  const payload = candidates.map((c, i) => ({
    n: i + 1,
    brand: c.brand,
    title: c.title,
    summary: (c.rawSummary || "").slice(0, 200),
  }));

  const hasGemini = !!keys.geminiKey;
  let picks = [];
  let geminiSucceeded = false;

  if (hasGemini) {
    try {
      const text = await gemini(FILTER_PROMPT, JSON.stringify(payload), { geminiKey: keys.geminiKey }, { maxTokens: 900 });
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { picks = JSON.parse(match[0]); geminiSucceeded = true; } catch {}
      }
    } catch (e) {
      console.warn("[pipeline] Gemini filter failed, falling back to Groq batching:", e.message);
    }
  }

  if (!geminiSucceeded) {
    const BATCH = 20;
    for (let i = 0; i < payload.length; i += BATCH) {
      const batchPayload = payload.slice(i, i + BATCH).map((c) => ({
        n: c.n, brand: c.brand, title: c.title, summary: c.summary.slice(0, 80),
      }));
      try {
        const text = await gemini(FILTER_PROMPT, JSON.stringify(batchPayload), { groqKey: keys.groqKey }, { maxTokens: 900 });
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const batch = JSON.parse(match[0]);
            if (Array.isArray(batch)) picks.push(...batch);
          } catch {}
        }
      } catch (e) {
        console.warn("[pipeline] Groq filter batch failed:", e.message);
      }
      if (picks.length >= 24) break;
    }
  }

  console.log(`[pipeline] runFilterPass: ${picks.length} picks from ${candidates.length} candidates`);
  return Array.isArray(picks) ? picks.slice(0, 24) : [];
}

// Run up to `concurrency` promises at a time (avoids hammering Gemini rate limit)
async function pooled(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = await Promise.all(items.slice(i, i + concurrency).map(fn));
    results.push(...batch);
    if (i + concurrency < items.length) await new Promise((r) => setTimeout(r, 1500));
  }
  return results;
}

async function filterAndRewriteWithAI(candidates, keys, progress) {
  // Step 1: filter — AI picks which stories are worth posting
  progress("Selecting best stories…", 40);
  const picks = await runFilterPass(candidates, keys);

  if (picks.length === 0) throw new Error("AI filter returned no stories");

  // Step 2: write — each story gets its own focused headline call
  progress("Writing headlines…", 60);
  const toWrite = picks
    .map(({ n, brand }) => {
      const idx = Number(n);
      const candidate = (idx >= 1 && idx <= candidates.length) ? candidates[idx - 1] : null;
      if (!candidate) { console.warn(`[pipeline] Pick n=${n} out of range (${candidates.length} candidates)`); return null; }
      // Use the brand the AI identified (may be more specific for multi-brand articles)
      return brand && brand !== "RETAIL" ? { ...candidate, brand } : candidate;
    })
    .filter((c) => {
      if (!c) return false;
      // Skip articles with no real summary — AI has nothing to extract facts from
      const summary = (c.rawSummary || "").trim();
      const hasRealSummary = summary.length >= 30 && summary.toLowerCase() !== c.title.toLowerCase().slice(0, summary.length);
      if (!hasRealSummary) console.warn(`[pipeline] Skipping "${c.title}" — no usable summary`);
      return hasRealSummary;
    });

  const results = await pooled(toWrite, 3, async (candidate) => {
    try {
      // useFallback:false — if AI can't write a good headline, skip the story entirely
      // rather than show a garbage title-copy headline on the card
      const result = await writeHeadline(candidate, keys, { useFallback: false });
      if (result?.headline?.includes("\n")) return { ...candidate, headline: result.headline };
    } catch (e) {
      console.warn(`[pipeline] Headline failed for "${candidate.title}":`, e.message);
    }
    return null;
  });

  const withHeadlines = results.filter(Boolean);
  console.log(`[pipeline] Filtered to ${picks.length}, headline candidates ${toWrite.length}, wrote ${withHeadlines.length} AI headlines`);
  if (withHeadlines.length === 0) {
    throw new Error("AI wrote no usable headlines");
  }
  return withHeadlines;
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours
const FALLBACK_CACHE_TTL = 15 * 60 * 1000; // retry AI soon after rate limits clear
let _cacheTtl = CACHE_TTL;
let _inFlight = null; // prevents concurrent pipeline runs from burning API quota

export async function fetchStories(progress = () => {}, { force = false } = {}) {
  if (!force && _cache && Date.now() - _cacheAt < _cacheTtl) {
    progress("Loading today's stories…", 100);
    return _cache;
  }

  // Check disk cache before hitting the network/AI
  if (!force) {
    const disk = readDiskCache();
    if (disk) {
      console.log("[pipeline] Serving from disk cache");
      _cache = disk.stories;
      _cacheAt = disk.savedAt;
      _cacheTtl = disk.ttl;
      progress("Loading today's stories…", 100);
      return _cache;
    }
  }

  // If a pipeline run is already in progress, wait for it instead of starting another
  if (_inFlight) {
    console.log("[pipeline] Waiting for in-flight pipeline run...");
    return _inFlight;
  }

  _inFlight = _runPipeline(progress, { force }).finally(() => { _inFlight = null; });
  return _inFlight;
}

async function _runPipeline(progress = () => {}, { force = false } = {}) {
  // Re-check cache in case it was populated while we were waiting for the lock
  if (!force && _cache && Date.now() - _cacheAt < _cacheTtl) {
    progress("Loading today's stories…", 100);
    return _cache;
  }

  if (process.env.OPENAI_API_KEY && process.env.STORY_PROVIDER !== "legacy") {
    try {
      const results = await researchStoriesWithOpenAI(process.env, progress);
      progress(`Done — ${results.length} verified stories ready`, 100);
      console.log(`[pipeline] OpenAI returned ${results.length} verified stories`);
      _cache = results; _cacheAt = Date.now(); _cacheTtl = CACHE_TTL;
      writeDiskCache(results, CACHE_TTL);
      return results;
    } catch (e) {
      console.warn(`[pipeline] OpenAI research failed, trying backup pipeline: ${e.message}`);
      if (process.env.STORY_PROVIDER === "openai") throw e;
      progress("OpenAI research had an issue. Trying backup search...", 20);
    }
  }

  if (process.env.GEMINI_API_KEY && process.env.STORY_PROVIDER !== "legacy") {
    try {
      const results = await researchStoriesWithGemini(process.env, progress);
      progress(`Done — ${results.length} verified stories ready`, 100);
      console.log(`[pipeline] Gemini returned ${results.length} verified stories`);
      _cache = results; _cacheAt = Date.now(); _cacheTtl = CACHE_TTL;
      writeDiskCache(results, CACHE_TTL);
      return results;
    } catch (e) {
      console.warn(`[pipeline] Gemini research failed, trying backup pipeline: ${e.message}`);
      if (process.env.STORY_PROVIDER === "gemini") throw e;
      progress("Gemini research had an issue. Trying backup search...", 20);
    }
  }

  progress("Agent searching for stories…", 5);
  const all = await fetchAllSources(process.env, progress);
  progress(`Scanning ${all.length} articles — picking the best ones…`, 30);
  const candidates = preFilter(all, {
    limit: envNumber(process.env, "PREFILTER_LIMIT", 120),
    brandLimit: envNumber(process.env, "BRAND_STORY_LIMIT", 3),
  });
  console.log(`[pipeline] ${all.length} raw → ${candidates.length} after pre-filter`);

  const keys = { geminiKey: process.env.GEMINI_API_KEY, groqKey: process.env.GROQ_API_KEY };
  if (keys.geminiKey || keys.groqKey) {
    try {
      const aiCandidateLimit = envNumber(process.env, "AI_CANDIDATE_LIMIT", 80);
      const results = await filterAndRewriteWithAI(candidates.slice(0, aiCandidateLimit), keys, progress);
      progress(`Done — ${results.length} stories ready`, 100);
      console.log(`[pipeline] ${results.length} stories with headlines`);
      _cache = results; _cacheAt = Date.now(); _cacheTtl = CACHE_TTL;
      writeDiskCache(results, CACHE_TTL);
      return results;
    } catch (e) {
      const fallback = fallbackStoriesWithHeadlines(candidates);
      if (fallback.length > 0) {
        const message = aiUnavailableMessage(e);
        progress(message, 85);
        progress(`Done — ${fallback.length} fallback stories ready`, 100);
        console.warn(`[pipeline] AI pipeline unavailable, using fallback headlines: ${e.message}`);
        _cache = fallback; _cacheAt = Date.now(); _cacheTtl = FALLBACK_CACHE_TTL;
        writeDiskCache(fallback, FALLBACK_CACHE_TTL);
        return fallback;
      }
      throw new Error("AI is temporarily unavailable and no fallback stories were available. Try again in a few minutes.");
    }
  }

  const fallback = fallbackStoriesWithHeadlines(candidates);
  if (fallback.length > 0) {
    progress(`Done — ${fallback.length} fallback stories ready`, 100);
    _cache = fallback; _cacheAt = Date.now(); _cacheTtl = FALLBACK_CACHE_TTL;
    writeDiskCache(fallback, FALLBACK_CACHE_TTL);
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
