import { parseRssItems } from "../pipeline/lib/rss.mjs";

// POST { mode: 'discover'|'search'|'bundle'|'inspire', query?: string }
// Streams SSE: progress events then a done event with segments array

export const config = { maxDuration: 60 };

const ROSSEN_IDEA_PATTERNS = [
  {
    title: "Hidden Fees Are Everywhere: How to Spot Junk Fees Before You Pay",
    keywords: "hidden fees junk fees ticket fees hotel fees delivery fees FTC rules",
  },
  {
    title: "Amazon Scam Alerts: Fake Texts, Fake Emails, and Fake Recall Notices",
    keywords: "Amazon scams fake Amazon text Amazon recall scam phishing warning",
  },
  {
    title: "Grocery Prices: Why Your Food Bill Still Feels Too High",
    keywords: "grocery prices food inflation supermarket deals save money on groceries",
  },
  {
    title: "Product Recalls You Need to Check This Week",
    keywords: "product recalls FDA recalls CPSC recalls food recalls check your home",
  },
  {
    title: "Senior Scam Alert: Calls, Texts, Emails, and Fake Refunds Targeting Older Adults",
    keywords: "senior scams Medicare scams Social Security scams FTC scam alert",
  },
  {
    title: "Travel Deals and Traps: Flights, Hotels, Baggage Fees, and Booking Sites",
    keywords: "travel deals airline fees hotel hidden fees booking scams cheap flights",
  },
  {
    title: "Best Freebies and Deals This Weekend",
    keywords: "weekend freebies restaurant deals free food BOGO deals family deals",
  },
  {
    title: "Restaurant Value Wars: Who Has the Best Cheap Meals Right Now?",
    keywords: "fast food deals value menu cheap meals McDonald's deals Taco Bell deals",
  },
  {
    title: "Store Return Policies Are Changing: What Shoppers Need to Know",
    keywords: "return policy changes Target return policy Walmart returns Amazon returns",
  },
  {
    title: "Credit Card Scam Alert: Fake Lower-Rate Calls and Debt Relief Traps",
    keywords: "credit card scams lower interest rate scam debt relief scam FTC warning",
  },
  {
    title: "Membership Clubs Compared: Costco vs Sam's Club vs BJ's",
    keywords: "Costco vs Sam's Club warehouse club deals membership savings BJ's",
  },
  {
    title: "Delivery Apps Exposed: Fees, Markups, Tips, and Sneaky Charges",
    keywords: "DoorDash fees Uber Eats fees food delivery hidden fees Instacart prices",
  },
  {
    title: "Medical and Pharmacy Savings: How to Pay Less for Prescriptions",
    keywords: "prescription discounts pharmacy savings GoodRx CVS Walgreens",
  },
  {
    title: "Home Safety Recalls: Appliances, Bed Rails, Batteries, and Kids' Products",
    keywords: "home product recalls appliance recalls child safety recalls CPSC recalls",
  },
  {
    title: "Mother's Day, Father's Day, and Holiday Freebies You Should Know About",
    keywords: "Mother's Day deals Father's Day deals holiday freebies restaurant freebies",
  },
  {
    title: "Fake Discounts: How Stores Make Sales Look Better Than They Are",
    keywords: "fake discounts misleading sales retail pricing tricks BOGO lawsuit",
  },
  {
    title: "Streaming Bills Going Up: How to Cut Netflix, Disney+, Hulu, and Cable Costs",
    keywords: "streaming prices Netflix price increase cut cable save on streaming",
  },
  {
    title: "Best Things to Buy This Month, and What to Avoid",
    keywords: "best things to buy this month monthly deals seasonal shopping guide",
  },
  {
    title: "Your Phone Is Listening? What Apps Track and How to Shut It Off",
    keywords: "app privacy phone tracking location tracking data privacy settings",
  },
  {
    title: "Car Buyer Warning: Dealer Fees, Add-Ons, and Online Price Tricks",
    keywords: "car dealer fees hidden car fees car buying scams FTC auto dealer warning",
  },
  {
    title: "Ticket Buyer Alert: StubHub, Ticketmaster, SeatGeek, and Hidden Fees",
    keywords: "ticket fees StubHub refunds Ticketmaster fees concert ticket prices SeatGeek",
  },
  {
    title: "Grocery Store Apps: Coupons, Personalized Prices, and Privacy Concerns",
    keywords: "grocery app deals personalized pricing digital coupons grocery privacy",
  },
  {
    title: "Free Family Events: Museums, Kids Workshops, Movies, and Store Classes",
    keywords: "free family events free museum admission kids workshops dollar movies",
  },
  {
    title: "Bank Fees and Refunds: What Customers Can Claim Money For",
    keywords: "bank fees class action settlements consumer refunds FTC refunds",
  },
  {
    title: "Memorial Day Deals Preview: Grills, Mattresses, Appliances, Patio Sets, and Travel",
    keywords: "Memorial Day deals grill sales mattress sales appliance discounts patio furniture deals travel",
  },
];

const ROSSEN_THEMES = ROSSEN_IDEA_PATTERNS.map((pattern) => pattern.title);
const DISCOVER_QUERIES = ROSSEN_IDEA_PATTERNS.map((pattern) => `${pattern.keywords} 2026`);
const DEFAULT_DISCOVER_QUERY_LIMIT = 25;

const ROSSEN_PATTERN_EXAMPLES = ROSSEN_IDEA_PATTERNS
  .map((pattern, i) => `${i + 1}. ${pattern.title}\nKeywords: ${pattern.keywords}`)
  .join("\n");

const ROSSEN_TITLE_EXAMPLES = [
  "Sam's Club Is Discontinuing These Items",
  "ALDI Just Stocked These Rare Items",
  "Target's New Launch: Buy This, Not That",
  "Dollar Tree Finds That Won't Last",
  "The Truth About Kohl's Sales",
  "Olive Garden Employees Reveal What To Watch For",
  "Home Repair Scams Are Exploding",
  "Walmart Got Caught: Why Groceries Are So Expensive",
  "Costco Free Samples: What They're Not Telling You",
  "Your Car Is Watching You: Shut This Off",
];

const ROSSEN_STORY_RULES = `Prioritize Rossen-style video ideas modeled on these examples:
${ROSSEN_PATTERN_EXAMPLES}

Use this YouTube-title DNA:
${ROSSEN_TITLE_EXAMPLES.map((title) => `- ${title}`).join("\n")}

Pattern rules:
- a clear viewer payoff: save money, get money back, avoid a scam, avoid a bad buy, or protect your family
- a concrete hook that can be shown on camera: text message, bill, app screen, product, receipt, policy page, recall item, price tag, travel booking, or side-by-side test
- a direct action step: what to click, what to check, what to buy or skip, what deadline matters, or who to call
- practical brands and situations viewers already use: Amazon, Target, Walmart, Costco, Sam's Club, Aldi, fast food apps, airlines, banks, insurers, utilities, delivery services, common appliances
- segment shapes that work for 10-minute YouTube/video arcs: alert, expose, comparison, weekend guide, monthly buy/avoid guide, hidden fee breakdown, product test, refund playbook, scam red flags, savings checklist
- every pitchHeadline must name a concrete store, product, service, scam type, fee type, recall category, or setting viewers can check
- do not return broad bucket names like "Scams Targeting Viewers", "Recalls And Safety Alerts", "Hidden Fees And Fine Print", or "Prices And Shrinkflation" as pitchHeadline`;

const AI_ARTICLE_LIMIT = 18;
const AI_SUMMARY_LIMIT = 360;
const AI_TIMEOUT_MS = 18000;
const SEARCH_CONCURRENCY = 6;

const FALLBACK_TOPICS = [
  {
    id: "fees",
    theme: "Hidden Fees And Fine Print",
    headline: "FEES HITTING YOUR WALLET",
    patterns: [/\bfee(s)?\b/, /\bsurcharge(s)?\b/, /\bcharge(s|d)?\b/, /\bfine print\b/, /\bcancellation\b/, /\bsubscription\b/, /\bbilling\b/],
    angles: [
      "Angle 1: Where the extra cost shows up",
      "Angle 2: How consumers can miss it",
      "Angle 3: What viewers should check before paying",
    ],
  },
  {
    id: "scams",
    theme: "Scams Targeting Viewers",
    headline: "NEW SCAMS TO WATCH",
    patterns: [/\bscam(s|mer)?\b/, /\bfraud\b/, /\bphishing\b/, /\btext(s)?\b/, /\btoll\b/, /\bolder adults?\b/, /\bseniors?\b/],
    angles: [
      "Angle 1: The message or call that hooks victims",
      "Angle 2: The money or data at risk",
      "Angle 3: The red flags viewers should know",
    ],
  },
  {
    id: "recalls",
    theme: "Recalls And Safety Alerts",
    headline: "CHECK THIS RECALL",
    patterns: [/\brecall(s|ed)?\b/, /\bsafety\b/, /\bwarning\b/, /\bcontamination\b/, /\ballergy\b/, /\bfda\b/, /\bcpsc\b/, /\bsalmonella\b/, /\blisteria\b/],
    angles: [
      "Angle 1: The product or risk viewers need to identify",
      "Angle 2: Who is most exposed",
      "Angle 3: What to stop using, return, or check now",
    ],
  },
  {
    id: "prices",
    theme: "Prices And Shrinkflation",
    headline: "WHY YOU MAY PAY MORE",
    patterns: [/\bprice(s|d)?\b/, /\bpaying more\b/, /\binflation\b/, /\bshrinkflation\b/, /\bgrocery\b/, /\bcost(s)?\b/, /\bincrease\b/],
    angles: [
      "Angle 1: The visible price change",
      "Angle 2: The smaller package or hidden tradeoff",
      "Angle 3: How shoppers can compare before buying",
    ],
  },
  {
    id: "policies",
    theme: "Policy Changes Costing Customers",
    headline: "NEW RULES FOR CUSTOMERS",
    patterns: [/\bpolicy\b/, /\brule(s)?\b/, /\breturn(s)?\b/, /\breward(s)?\b/, /\bperk(s)?\b/, /\bmembership\b/, /\bterms\b/, /\bchange(s|d)?\b/],
    angles: [
      "Angle 1: The rule that changed",
      "Angle 2: The customer who loses a benefit or pays more",
      "Angle 3: The deadline or setting viewers should check",
    ],
  },
  {
    id: "travel",
    theme: "Travel Headaches And Fees",
    headline: "TRAVELERS PAY ATTENTION",
    patterns: [/\bairline(s)?\b/, /\bflight(s)?\b/, /\btravel(ers?)?\b/, /\bbaggage\b/, /\bhotel(s)?\b/, /\bresort fee\b/, /\bdelay(s|ed)?\b/],
    angles: [
      "Angle 1: The trip cost or disruption",
      "Angle 2: The policy detail travelers may miss",
      "Angle 3: What to confirm before booking or leaving",
    ],
  },
  {
    id: "shopping",
    theme: "Buy It Or Skip It",
    headline: "WHAT TO BUY OR SKIP",
    patterns: [/\bbuy\b/, /\bskip\b/, /\bdeal(s)?\b/, /\bdiscount(s)?\b/, /\bclearance\b/, /\bmarkdown(s)?\b/, /\bfree\b/, /\breward(s)?\b/, /\bperk(s)?\b/, /\btarget\b/, /\bwalmart\b/, /\bcostco\b/, /\baldi\b/, /\bsam'?s club\b/],
    angles: [
      "Angle 1: The item or perk viewers are tempted by",
      "Angle 2: Whether it is really a deal",
      "Angle 3: The timing, app, or fine print that matters",
    ],
  },
  {
    id: "tests",
    theme: "Product Tests And Truth Checks",
    headline: "IS IT WORTH IT?",
    patterns: [/\bbest\b/, /\bworst\b/, /\btest(s|ed)?\b/, /\breview(s|ed)?\b/, /\bcompare(s|d|ison)?\b/, /\bworth it\b/, /\bmystery box(es)?\b/, /\bappliance(s)?\b/, /\bair fryer\b/],
    angles: [
      "Angle 1: The product claim viewers want tested",
      "Angle 2: The side-by-side comparison",
      "Angle 3: The best buy or item to avoid",
    ],
  },
  {
    id: "money",
    theme: "Simple Money Moves",
    headline: "SAVE MONEY NOW",
    patterns: [/\bsave money\b/, /\bget money back\b/, /\brefund(s)?\b/, /\bcash back\b/, /\bside hustle(s)?\b/, /\bextra cash\b/, /\binsurance\b/, /\bbank\b/, /\bparking\b/],
    angles: [
      "Angle 1: The money viewers can save or recover",
      "Angle 2: The app, form, or call that unlocks it",
      "Angle 3: The mistake that could cost them",
    ],
  },
  {
    id: "pharmacy",
    theme: "Prescription Savings",
    headline: "PAY LESS FOR MEDS",
    patterns: [/\bprescription(s)?\b/, /\bpharmacy\b/, /\bgoodrx\b/, /\bcvs\b/, /\bwalgreens\b/, /\bmedicare\b/, /\bdrug price(s)?\b/, /\bdiscount card(s)?\b/],
    angles: [
      "Angle 1: The medicine or pharmacy cost viewers recognize",
      "Angle 2: The discount path that may lower the bill",
      "Angle 3: The comparison viewers should make before paying",
    ],
  },
  {
    id: "streaming",
    theme: "Streaming Bills Going Up",
    headline: "CUT YOUR STREAMING BILL",
    patterns: [/\bstreaming\b/, /\bnetflix\b/, /\bdisney\+?\b/, /\bhulu\b/, /\bcable\b/, /\bsubscription(s)?\b/, /\bprice increase\b/, /\bbundle(s)?\b/],
    angles: [
      "Angle 1: The price hike or subscription creep",
      "Angle 2: The plan, bundle, or setting viewers should check",
      "Angle 3: The cut, pause, or switch that saves money",
    ],
  },
  {
    id: "privacy",
    theme: "Phone Privacy Checkup",
    headline: "CHECK YOUR PHONE SETTINGS",
    patterns: [/\bphone\b/, /\bapp(s)?\b/, /\bprivacy\b/, /\btracking\b/, /\blocation\b/, /\bdata\b/, /\blistening\b/, /\bsettings\b/],
    angles: [
      "Angle 1: The app setting viewers may not realize is on",
      "Angle 2: The data or location trail at risk",
      "Angle 3: The exact setting to shut off or review",
    ],
  },
  {
    id: "cars",
    theme: "Car Buyer Warning",
    headline: "WATCH THE DEALER FEES",
    patterns: [/\bcar\b/, /\bauto\b/, /\bdealer\b/, /\bvehicle\b/, /\badd-on(s)?\b/, /\bonline price\b/, /\bftc auto\b/, /\bfinancing\b/],
    angles: [
      "Angle 1: The advertised price versus the final price",
      "Angle 2: The add-on or fee that changes the deal",
      "Angle 3: The question buyers should ask before signing",
    ],
  },
  {
    id: "tickets",
    theme: "Ticket Buyer Alert",
    headline: "CHECK TICKET FEES",
    patterns: [/\bticket(s)?\b/, /\bticketmaster\b/, /\bstubhub\b/, /\bseatgeek\b/, /\bconcert\b/, /\bvenue\b/, /\bevent\b/, /\brefund(s)?\b/],
    angles: [
      "Angle 1: The ticket price viewers see first",
      "Angle 2: The fee, transfer, or refund catch",
      "Angle 3: The checkout screen viewers should compare",
    ],
  },
  {
    id: "family",
    theme: "Free Family Deals",
    headline: "FREE FAMILY FUN",
    patterns: [/\bfamily\b/, /\bkids?\b/, /\bmuseum(s)?\b/, /\bworkshop(s)?\b/, /\bfree event(s)?\b/, /\bmovies?\b/, /\bclass(es)?\b/, /\badmission\b/],
    angles: [
      "Angle 1: The free or cheap activity families can use",
      "Angle 2: The date, location, or signup detail",
      "Angle 3: The catch that could make it sell out or cost more",
    ],
  },
];

const KNOWN_BRANDS = [
  ["ALDI", /\baldi\b/i],
  ["Amazon", /\bamazon\b/i],
  ["Apple", /\bapple\b/i],
  ["AT&T", /\bat&t\b|\batt\b/i],
  ["BJ's", /\bbj'?s\b/i],
  ["Burger King", /\bburger king\b/i],
  ["CarMax", /\bcarmax\b/i],
  ["Carvana", /\bcarvana\b/i],
  ["Cheesecake Factory", /\bcheesecake factory\b/i],
  ["Chick-fil-A", /\bchick-fil-a\b|\bchick fil a\b/i],
  ["Costco", /\bcostco\b/i],
  ["CVS", /\bcvs\b/i],
  ["Disney+", /\bdisney\+?\b/i],
  ["Dollar General", /\bdollar general\b/i],
  ["Dollar Tree", /\bdollar tree\b/i],
  ["DoorDash", /\bdoordash\b/i],
  ["Ford", /\bford\b/i],
  ["GoodRx", /\bgoodrx\b/i],
  ["Google", /\bgoogle\b/i],
  ["Home Depot", /\bhome depot\b/i],
  ["Hulu", /\bhulu\b/i],
  ["Instacart", /\binstacart\b/i],
  ["Kohl's", /\bkohl'?s\b/i],
  ["Lowe's", /\blowe'?s\b/i],
  ["Marshalls", /\bmarshalls\b/i],
  ["McDonald's", /\bmcdonald'?s\b/i],
  ["Medicare", /\bmedicare\b/i],
  ["Netflix", /\bnetflix\b/i],
  ["Nordstrom Rack", /\bnordstrom rack\b/i],
  ["Olive Garden", /\bolive garden\b/i],
  ["Sam's Club", /\bsam'?s club\b/i],
  ["SeatGeek", /\bseatgeek\b/i],
  ["Social Security", /\bsocial security\b/i],
  ["StubHub", /\bstubhub\b/i],
  ["T-Mobile", /\bt-mobile\b|\btmobile\b/i],
  ["T.J. Maxx", /\bt\.?j\.? maxx\b|\btj maxx\b/i],
  ["Taco Bell", /\btaco bell\b/i],
  ["Target", /\btarget\b/i],
  ["Tesla", /\btesla\b/i],
  ["Ticketmaster", /\bticketmaster\b/i],
  ["Toyota", /\btoyota\b/i],
  ["Trader Joe's", /\btrader joe'?s\b/i],
  ["Uber Eats", /\buber eats\b/i],
  ["Verizon", /\bverizon\b/i],
  ["Walgreens", /\bwalgreens\b/i],
  ["Walmart", /\bwalmart\b/i],
  ["Wendy's", /\bwendy'?s\b/i],
  ["Whole Foods", /\bwhole foods\b/i],
];

const SPECIFIC_HOOK_PATTERNS = [
  { pattern: /\bdiscontinu(ing|ed|es)?\b/i, score: 14 },
  { pattern: /\bwon'?t last\b|\blast chance\b|\brare\b|\blimited[- ]time\b/i, score: 13 },
  { pattern: /\bnew at\b|\bjust stocked\b|\bnew launch\b|\bnew items?\b/i, score: 12 },
  { pattern: /\bbuy this\b|\bskip\b|\bwhat to buy\b|\bwhat to avoid\b/i, score: 11 },
  { pattern: /\btruth about\b|\bthey'?re hiding\b|\bwhat they don'?t\b|\bnot telling you\b/i, score: 12 },
  { pattern: /\bcaught\b|\bexposed\b|\breveal(s|ed|ing)?\b|\bemployees?\b/i, score: 10 },
  { pattern: /\bscam(s)?\b|\bfake\b|\bphishing\b|\bfraud\b|\bimposter\b/i, score: 10 },
  { pattern: /\brecall(s|ed)?\b|\bsafety alert\b|\bcontamination\b|\ballergy alert\b/i, score: 10 },
  { pattern: /\bhidden fee(s)?\b|\bjunk fee(s)?\b|\bsneaky charge(s)?\b|\bsurcharge(s)?\b/i, score: 10 },
  { pattern: /\bprice(s)? (just )?(crashed|dropped|cut|slashed)\b|\bmarkdown(s)?\b|\bclearance\b/i, score: 9 },
  { pattern: /\bfree samples?\b|\bfreebies?\b|\bbogo\b|\bweekend deal(s)?\b/i, score: 8 },
  { pattern: /\bself[- ]checkout\b|\bwatching you\b|\btracking\b|\bshut this off\b|\bprivacy setting(s)?\b/i, score: 9 },
  { pattern: /\$\d+|\b\d+%\b|\b\d+\s+(items?|products?|recalls?|fees?|deals?|ways?)\b/i, score: 6 },
];

const GENERIC_STORY_PATTERNS = [
  /\bstate attorneys? general\b/i,
  /\bregulatory oversight\b/i,
  /\bcenter for american progress\b/i,
  /\bpress release\b/i,
  /\btranscript\b/i,
  /\bplan to make\b/i,
  /\beconomy\b/i,
  /\bcontinued enforcement\b/i,
  /\bmayor\b/i,
  /\bgovernor\b/i,
];

const TOPIC_THEME_LABELS = {
  cars: "Car Privacy Check",
  family: "Family Deal Alert",
  fees: "Fee Watch",
  money: "Money Back Alert",
  pharmacy: "Pharmacy Savings",
  policies: "Policy Change",
  prices: "Price Check",
  privacy: "Privacy Check",
  recalls: "Recall Alert",
  scams: "Scam Alert",
  shopping: "Buy Or Skip",
  streaming: "Streaming Savings",
  tests: "Truth Check",
  tickets: "Ticket Buyer Alert",
  travel: "Travel Warning",
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "before",
  "but",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "new",
  "of",
  "on",
  "or",
  "that",
  "the",
  "these",
  "this",
  "to",
  "what",
  "when",
  "where",
  "why",
  "with",
  "you",
  "your",
]);

function envNumber(env, key, fallback) {
  const parsed = Number(env?.[key]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildQueries(mode, query, env = {}) {
  if (mode === "discover") return DISCOVER_QUERIES.slice(0, envNumber(env, "SEGMENT_DISCOVER_QUERY_LIMIT", DEFAULT_DISCOVER_QUERY_LIMIT));
  if (mode === "inspire")
    return ROSSEN_THEMES.slice(0, 10).map((t) => `${t} consumer news 2026`);
  if (mode === "search")
    return [query, `${query} consumer complaint warning`, `${query} investigation recall lawsuit`];
  if (mode === "bundle")
    return [query, `related consumer impact ${query}`, `similar stories ${query} policy change`];
  return [query];
}

function truncate(text = "", limit = AI_SUMMARY_LIMIT) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
}

function sourceFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function searchError(provider, response, body) {
  const detail = body?.error?.detail || body?.detail?.error || body?.detail || body?.message || response.statusText || "request failed";
  const err = new Error(`${provider} ${response.status}: ${detail}`);
  err.provider = provider;
  err.status = response.status;
  err.disableProvider = [401, 402, 403, 429, 432].includes(response.status);
  return err;
}

async function searchBrave(query, key) {
  const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=10&freshness=pm`;
  const r = await fetch(url, {
    headers: { "X-Subscription-Token": key, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw searchError("Brave", r, data);
  return (data.results || []).map((a) => ({
    title: a.title || "",
    url: a.url || "",
    source: a.meta_url?.hostname || sourceFromUrl(a.url),
    summary: a.description || "",
    provider: "Brave",
  }));
}

async function searchTavily(query, key) {
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({ api_key: key, query, search_depth: "basic", max_results: 10, topic: "news" }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw searchError("Tavily", r, data);
  return (data.results || []).map((a) => ({
    title: a.title || "",
    url: a.url || "",
    source: sourceFromUrl(a.url),
    summary: a.content || "",
    provider: "Tavily",
  }));
}

async function searchGoogleNews(query, env) {
  const count = Number(env.GOOGLE_NEWS_PER_QUERY || 8);
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/rss+xml,text/xml;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(12000),
  });
  const text = await r.text();
  if (!r.ok) throw searchError("Google News", r, { message: text.slice(0, 160) });

  return parseRssItems(text).slice(0, count).map((a) => ({
    title: a.title || "",
    url: a.sourceUrl || "",
    source: sourceFromUrl(a.sourceUrl) || "Google News",
    summary: a.rawSummary || "",
    provider: "Google News",
  }));
}

async function runWithConcurrency(items, limit, task) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await task(current));
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  }).slice(0, 40);
}

function normalizeText(text = "") {
  return String(text)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(title = "") {
  const normalized = normalizeText(title).replace(/\s+\|\s+.+$/, "");
  const parts = normalized.split(/\s+-\s+/);
  if (parts.length > 1 && parts[parts.length - 1].length <= 52) {
    return parts.slice(0, -1).join(" - ").trim();
  }
  return normalized;
}

function articleText(article) {
  return normalizeText(`${article.title || ""} ${article.summary || ""} ${article.source || ""}`);
}

function scoreTopic(article, topic) {
  const text = articleText(article).toLowerCase();
  return topic.patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function fallbackSummary(article) {
  const summary = truncate(article.summary || "", 220);
  if (summary) return summary;
  return "Use this source to confirm the newest details, then show viewers the exact receipt, screenshot, item, fee, warning, or policy page.";
}

function detectBrand(articleOrText) {
  const text = typeof articleOrText === "string"
    ? normalizeText(articleOrText)
    : normalizeText(`${articleOrText.title || ""} ${articleOrText.summary || ""}`);
  return KNOWN_BRANDS.find(([, pattern]) => pattern.test(text))?.[0] || "";
}

function bestTopicForArticle(article) {
  const title = cleanTitle(article.title || "").toLowerCase();
  const ranked = FALLBACK_TOPICS
    .map((topic) => ({
      topic,
      score: scoreTopic(article, topic) + (topic.patterns.reduce((count, pattern) => count + (pattern.test(title) ? 1 : 0), 0) * 2),
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.score > 0
    ? ranked[0].topic
    : FALLBACK_TOPICS.find((topic) => topic.id === "shopping");
}

function titleWords(text, count) {
  return normalizeText(text)
    .split(/\s+/)
    .slice(0, count)
    .join(" ")
    .replace(/[,.:;]+$/, "");
}

function titleKeywords(articleOrText) {
  const text = typeof articleOrText === "string" ? articleOrText : cleanTitle(articleOrText.title || "");
  return normalizeText(text)
    .toLowerCase()
    .split(/[^a-z0-9+']+/)
    .map((word) => word.replace(/'s$/, ""))
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .slice(0, 20);
}

function titleFingerprint(text) {
  return titleKeywords(text).slice(0, 8).join("-");
}

function compactHeadline(text, limit = 86) {
  const clean = cleanTitle(text);
  if (clean.length <= limit) return clean;
  return `${clean.split(/\s+/).slice(0, 12).join(" ")}...`;
}

function articleSpecificityScore(article, topic) {
  const text = articleText(article);
  const title = cleanTitle(article.title || "");
  const brand = detectBrand(article);
  let score = scoreTopic(article, topic) * 5;

  if (brand) score += 14;
  if (title.length >= 24 && title.length <= 115) score += 4;
  if (titleKeywords(title).length >= 4) score += 3;

  for (const hook of SPECIFIC_HOOK_PATTERNS) {
    if (hook.pattern.test(text)) score += hook.score;
  }

  for (const pattern of GENERIC_STORY_PATTERNS) {
    if (pattern.test(text)) score -= brand ? 4 : 12;
  }

  return score;
}

function leadPhrase(title) {
  return titleWords(cleanTitle(title).replace(/^(consumer alert|alert|warning|watchdog|recall alert)\s*:?\s*/i, ""), 8);
}

function feeSubject(article) {
  const text = articleText(article).toLowerCase();
  if (/\bticket(s)?\b|\bticketmaster\b|\bstubhub\b|\bseatgeek\b/.test(text)) return "Ticket";
  if (/\bhotel(s)?\b|\bresort\b|\bbooking\b/.test(text)) return "Hotel";
  if (/\bdelivery\b|\bdoordash\b|\buber eats\b|\binstacart\b/.test(text)) return "Delivery App";
  if (/\bairline(s)?\b|\bflight(s)?\b|\bbaggage\b/.test(text)) return "Airline";
  if (/\bbank(s)?\b|\bchecking\b|\boverdraft\b/.test(text)) return "Bank";
  if (/\bdealer\b|\bauto\b|\bcar\b|\bvehicle\b/.test(text)) return "Car Dealer";
  return "Hidden";
}

function makeRossenPitchHeadline(article, topic) {
  const text = articleText(article);
  const lower = text.toLowerCase();
  const brand = detectBrand(article);
  const lead = leadPhrase(article.title || topic.theme);

  if (/\bamazon\b/.test(lower) && /\b(recall|text|phishing|scam|fake)\b/.test(lower)) return "Amazon Text Scam: Don't Click This";
  if (/\btoll\b/.test(lower) && /\b(text|scam|fake|phishing)\b/.test(lower)) return "Toll Text Scam: Don't Click This";
  if (/\bfake recall\b|\brecall notice\b.*\bscam\b|\bscam\b.*\brecall notice\b/.test(lower)) return "Fake Recall Notice: Don't Click This";
  if (/\b(fake|scam|scammers?|phishing)\b.*\b(text|texts|texting)\b|\b(text|texts|texting)\b.*\b(fake|scam|scammers?|phishing)\b/.test(lower)) return "Fake Text Scam: Don't Click This";
  if (/\b(medicare|social security)\b/.test(lower) && /\b(scam|fraud|call|text)\b/.test(lower)) return `${brand || "Medicare"} Scam Alert: Don't Answer This Call`;
  if (/\b(home repair|contractor|roofer|repair company)\b/.test(lower) && /\b(scam|fraud|imposter)\b/.test(lower)) return "Home Repair Scams Are Exploding";
  if (/\b(car|vehicle|auto)\b/.test(lower) && /\b(watching|tracking|recording|data|privacy|telematics)\b/.test(lower)) return "Your Car Is Watching You: Shut This Off";
  if (/\bself[- ]checkout\b/.test(lower)) return "Self-Checkout Tricks Shoppers Need To Know";
  if (/\b(ticket|ticketmaster|stubhub|seatgeek)\b/.test(lower) && /\b(fee|refund|hidden|junk|charge)\b/.test(lower)) return "Ticket Fees: Check This Before You Buy";
  if (/\b(hotel|resort|booking)\b/.test(lower) && /\b(fee|hidden|junk|charge)\b/.test(lower)) return "Hotel Fees: Check This Before You Book";
  if (/\b(delivery|doordash|uber eats|instacart)\b/.test(lower) && /\b(fee|markup|tip|price|charge)\b/.test(lower)) return "Delivery App Fees: Check This Before You Order";
  if (/\b(streaming|netflix|disney|hulu|cable)\b/.test(lower) && /\b(price|hike|increase|bill|subscription)\b/.test(lower)) return "Streaming Bills Going Up: What To Cut Now";
  if (/\b(grocery|food bill|supermarket)\b/.test(lower) && /\b(price|expensive|inflation|cost)\b/.test(lower)) return "Grocery Prices: Why Your Bill Still Feels Too High";
  if (/\b(pharmacy|prescription|goodrx|cvs|walgreens)\b/.test(lower) && /\b(price|save|discount|cost)\b/.test(lower)) return "Prescription Prices: How To Pay Less";

  if (brand && /\bdiscontinu(ing|ed|es)?\b/.test(lower)) return `${brand} Is Discontinuing These Items`;
  if (brand && /\b(won'?t last|last chance|rare|limited[- ]time)\b/.test(lower)) return `${brand} Finds That Won't Last`;
  if (brand && /\b(new at|just stocked|new launch|launch|new items?)\b/.test(lower)) return `New At ${brand}: What To Buy, What To Skip`;
  if (brand && /\b(buy this|skip|what to buy|what to avoid)\b/.test(lower)) return `${brand}: Buy This, Not That`;
  if (brand && /\b(sale|discount|clearance|markdown|price tag|deal)\b/.test(lower)) return `The Truth About ${brand} Deals`;
  if (brand && /\b(employee|worker|reveal|secret|hiding|not telling)\b/.test(lower)) return `${brand} Employees Reveal What To Watch For`;
  if (brand && /\b(caught|exposed)\b/.test(lower)) return `${brand} Got Caught: What Shoppers Should Check`;
  if (brand && /\b(price|cost|expensive|inflation|crashed|dropped)\b/.test(lower)) return `${brand} Prices Just Changed: What To Buy`;
  if (brand && /\b(fee|surcharge|charge|junk fee|hidden fee)\b/.test(lower)) return `${brand} Fees: What They Don't Show Up Front`;
  if (brand && topic.id === "travel") return `${brand} Travel Deals: What To Book, What To Skip`;
  if (brand && topic.id === "streaming") return `${brand} Bills Going Up: What To Cut Now`;
  if (brand && topic.id === "pharmacy") return `${brand} Pharmacy Prices: How To Pay Less`;
  if (brand && topic.id === "tickets") return `${brand} Fees: Check This Before You Buy`;
  if (brand && /\b(return|refund|policy)\b/.test(lower)) return `${brand} Return Policy Changed: Check This`;
  if (brand && /\b(recall|safety alert|contamination|allergy)\b/.test(lower)) return `${brand} Recall Alert: Check Your Home`;
  if (brand && /\b(scam|phishing|fake|fraud|imposter)\b/.test(lower)) return `${brand} Scam Alert: Don't Click This`;
  if (brand && /\b(free sample|sample|freebie|bogo)\b/.test(lower)) return `${brand} Free Samples: What They're Not Telling You`;
  if (brand) return `${brand}: What To Buy, What To Skip`;

  if (/\b(scam|phishing|fake|fraud|imposter)\b/.test(lower)) return `${lead || "Scam"}: Don't Click This`;
  if (/\b(recall|safety alert|contamination|allergy)\b/.test(lower)) return `${lead || "Product"} Recall Alert: Check Your Home`;
  if (/\b(fee|surcharge|charge|junk fee|hidden fee)\b/.test(lower)) return `${feeSubject(article)} Fees: Check This Before You Pay`;
  if (/\b(return|refund|policy)\b/.test(lower)) return `${lead || "Return Policy"} Changed: Check This`;
  if (/\b(deal|discount|freebie|bogo|clearance|markdown)\b/.test(lower)) return `${lead || "Deals"}: What To Buy, What To Skip`;

  return compactHeadline(article.title || topic.theme || "Consumer Story To Check");
}

function makeOnAirHeadline(packetHeadline, topic) {
  const lower = packetHeadline.toLowerCase();
  if (/\bdiscontinu|won't last|last chance\b/.test(lower)) return "LAST CHANCE";
  if (/\bbuy this|not that|skip\b/.test(lower)) return "BUY THIS, NOT THAT";
  if (/\btruth|hiding|not telling|caught|exposed\b/.test(lower)) return "THEY'RE HIDING THIS";
  if (/\bscam|don't click|don't answer\b/.test(lower)) return "SCAM ALERT";
  if (/\brecall|check your home\b/.test(lower)) return "CHECK THIS RECALL";
  if (/\bfee|charge|pay\b/.test(lower)) return "WATCH THE FEES";
  if (/\bprice|bill|cost\b/.test(lower)) return "WHY YOU MAY PAY MORE";
  if (/\bwatching|tracking|shut this off\b/.test(lower)) return "SHUT THIS OFF";
  if (/\bnew at|finds|launch\b/.test(lower)) return "DON'T MISS THIS";
  return topic.headline || "CHECK THIS";
}

function makeTheme(packetHeadline, topic, brand) {
  if (brand) return `${brand} ${TOPIC_THEME_LABELS[topic.id] || "Story"}`;
  return titleWords(packetHeadline, 5) || TOPIC_THEME_LABELS[topic.id] || "Consumer Alert";
}

function makeHook(article, topic, brand) {
  const sourceTitle = cleanTitle(article.title || "");
  if (topic.id === "scams") return `Show the exact text, email, call, fake notice, or payment request behind: ${sourceTitle}.`;
  if (topic.id === "recalls") return `Open with the product, label, model number, or recall notice viewers can check at home: ${sourceTitle}.`;
  if (topic.id === "fees" || topic.id === "tickets" || topic.id === "travel") return `Start on the checkout, bill, receipt, booking page, or price tag where the extra charge appears: ${sourceTitle}.`;
  if (topic.id === "privacy" || topic.id === "cars") return `Walk viewers through the setting, dashboard, app screen, or data page tied to: ${sourceTitle}.`;
  if (topic.id === "shopping" || topic.id === "tests") return `Put the ${brand ? `${brand} ` : ""}item, shelf tag, app deal, or side-by-side comparison on camera: ${sourceTitle}.`;
  return `Open with the viewer-facing proof from the source: ${sourceTitle}.`;
}

function makeViewerTakeaway(topic) {
  if (topic.id === "scams") return "Know the message, call, email, or fake notice to ignore before money or personal data is at risk.";
  if (topic.id === "recalls") return "Check the product name, model, lot number, or recall page before using the item again.";
  if (topic.id === "fees" || topic.id === "tickets" || topic.id === "travel") return "Compare the final total and refund rules before clicking pay.";
  if (topic.id === "privacy" || topic.id === "cars") return "Find the setting or data-sharing page and turn off what viewers do not want tracked.";
  if (topic.id === "shopping" || topic.id === "tests") return "Check the item, unit price, app coupon, and timing before deciding to buy or skip.";
  if (topic.id === "pharmacy") return "Compare pharmacy cash prices, insurance prices, and discount-card prices before paying.";
  if (topic.id === "streaming") return "Audit the plan, bundle, and renewal date, then cut or pause what no longer pays off.";
  return "Give viewers one exact check, comparison, or action step they can use today.";
}

function sharedKeywordScore(left, right) {
  const leftWords = new Set(titleKeywords(left));
  return titleKeywords(right).reduce((score, word) => score + (leftWords.has(word) ? 1 : 0), 0);
}

function relatednessScore(primary, candidate, topic) {
  let score = scoreTopic(candidate, topic) * 3;
  const primaryBrand = detectBrand(primary);
  const candidateBrand = detectBrand(candidate);
  if (primaryBrand && primaryBrand === candidateBrand) score += 12;
  score += sharedKeywordScore(primary, candidate) * 2;
  if (candidate.source && primary.source && candidate.source === primary.source) score += 1;
  return score;
}

function uniqueArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = article.url || `${cleanTitle(article.title || "")}-${article.source || ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function proofPointFromArticle(article) {
  const summary = truncate(article.summary || "", 130);
  const source = article.source || "Source";
  const title = cleanTitle(article.title || "Story source");
  return summary ? `${source}: ${title} - ${summary}` : `${source}: ${title}`;
}

function makeSpecificPacket(primary, topic, related, packetHeadline) {
  const brand = detectBrand(primary);
  const sources = uniqueArticles([primary, ...related]).slice(0, 4);
  const headline = makeOnAirHeadline(packetHeadline, topic);

  return {
    theme: makeTheme(packetHeadline, topic, brand),
    headline,
    pitchHeadline: packetHeadline,
    pitch: `${packetHeadline} turns a current source into a click-ready viewer-service story. Use the lead example, then stack related sources to show viewers exactly what to check, buy, skip, shut off, or avoid before it costs them money.`,
    hook: makeHook(primary, topic, brand),
    viewerTakeaway: makeViewerTakeaway(topic),
    sourceCount: sources.length,
    stories: sources.map((article) => ({
      title: cleanTitle(article.title || "Untitled story"),
      summary: fallbackSummary(article),
      url: article.url,
      source: article.source,
    })),
    proofPoints: sources.slice(0, 3).map((article) => proofPointFromArticle(article)),
    sourceQuestions: [
      `What exact ${brand ? `${brand} ` : ""}item, fee, policy, message, price, or setting changed?`,
      "Can the source show a receipt, screenshot, product page, price tag, recall notice, app screen, or text message?",
      "Who is affected, what deadline matters, and what should viewers do first?",
    ],
    angles: [
      `Angle 1: The specific ${brand ? `${brand} ` : ""}${TOPIC_THEME_LABELS[topic.id]?.toLowerCase() || "consumer"} hook viewers recognize`,
      "Angle 2: The money, safety, privacy, or time risk if they miss it",
      "Angle 3: The exact check, comparison, setting, or question viewers should use now",
    ],
    whyItWorks: [
      "Concrete enough for a YouTube thumbnail and headline",
      "Built around proof viewers can see on camera",
      "Turns a current article into a practical save-money or avoid-risk segment",
      "Related sources give producers a quick verification path",
    ],
    segmentStructure: [
      "Open: Show the clearest viewer-facing proof",
      "Build: Explain what changed and why viewers may miss it",
      "Escalate: Add a second source or example that proves it is a pattern",
      "Turn: Show the workaround, comparison, setting, return path, or complaint route",
      "Close: Repeat the exact viewer action step",
    ],
    productionPlan: [
      "Visual 1: Screenshot, bill, text, product, shelf tag, recall page, or app screen",
      "Demo/Test: Compare the before-and-after price, setting, checkout, product, or policy",
      "Expert/Source: Use the source article plus an agency, company page, or consumer complaint",
      "Close: Put the viewer checklist on screen",
    ],
  };
}

const GENERIC_PITCH_HEADLINES = new Set([
  "Scams Targeting Viewers",
  "Recalls And Safety Alerts",
  "Hidden Fees And Fine Print",
  "Prices And Shrinkflation",
  "Policy Changes Costing Customers",
  "Travel Headaches And Fees",
  "Buy It Or Skip It",
  "Product Tests And Truth Checks",
  "Simple Money Moves",
  "Prescription Savings",
  "Streaming Bills Going Up",
  "Phone Privacy Checkup",
  "Car Buyer Warning",
  "Ticket Buyer Alert",
  "Free Family Deals",
]);

function isGenericPitchHeadline(headline) {
  if (!headline) return true;
  if (GENERIC_PITCH_HEADLINES.has(headline)) return true;
  const lower = headline.toLowerCase();
  return /^(scams|recalls|hidden fees|prices|fees|deals|alerts?|savings?|tips?)\s*(targeting|and|for|to|in|on)?\s*(viewers?|consumers?|shoppers?|customers?)?$/i.test(lower);
}

function normalizeAISegment(segment, articles) {
  if (!isGenericPitchHeadline(segment.pitchHeadline)) return segment;

  const topic = FALLBACK_TOPICS.find((t) => t.id === "shopping") || FALLBACK_TOPICS[0];
  const bestArticle = articles
    .map((article) => {
      const t = bestTopicForArticle(article);
      return { article, topic: t, score: articleSpecificityScore(article, t) };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!bestArticle) return segment;

  const packetHeadline = makeRossenPitchHeadline(bestArticle.article, bestArticle.topic);
  if (isGenericPitchHeadline(packetHeadline)) return segment;

  const brand = detectBrand(bestArticle.article);
  return {
    ...segment,
    pitchHeadline: packetHeadline,
    theme: makeTheme(packetHeadline, bestArticle.topic, brand),
    headline: makeOnAirHeadline(packetHeadline, bestArticle.topic),
  };
}

function normalizeAISegments(segments, articles) {
  if (!Array.isArray(segments)) return segments;
  const usedHeadlines = new Set();
  return segments.map((segment) => {
    const normalized = normalizeAISegment(segment, articles);
    if (usedHeadlines.has(normalized.pitchHeadline)) return segment;
    usedHeadlines.add(normalized.pitchHeadline);
    return normalized;
  });
}

function buildFallbackSegments(mode, query, articles) {
  const targetCount = mode === "search" || mode === "bundle" ? 3 : 4;
  const ranked = articles
    .map((article, index) => {
      const topic = bestTopicForArticle(article);
      return { article, index, score: articleSpecificityScore(article, topic), topic };
    })
    .filter(({ article, score }) => cleanTitle(article.title || "").length > 8 && score > -6)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = [];
  const used = new Set();

  for (const candidate of ranked) {
    if (selected.length >= targetCount) break;

    const packetHeadline = makeRossenPitchHeadline(candidate.article, candidate.topic);
    const brand = detectBrand(candidate.article);
    const fingerprint = titleFingerprint(packetHeadline);
    const key = brand ? `${brand.toLowerCase()}-${candidate.topic.id}` : fingerprint;

    if (!fingerprint || used.has(key) || used.has(fingerprint)) continue;

    const related = ranked
      .filter((other) => other.article !== candidate.article)
      .map((other) => ({ ...other, relatedScore: relatednessScore(candidate.article, other.article, candidate.topic) }))
      .filter((other) => other.relatedScore > 0)
      .sort((left, right) => right.relatedScore - left.relatedScore || right.score - left.score)
      .map((other) => other.article);

    selected.push(makeSpecificPacket(candidate.article, candidate.topic, related, packetHeadline));
    used.add(key);
    used.add(fingerprint);
  }

  if (selected.length === 0 && articles.length > 0) {
    const topic = query
      ? {
          id: "shopping",
          theme: `Consumer Angle: ${truncate(query, 42)}`,
          headline: "CHECK THIS",
          angles: [],
          patterns: [],
        }
      : bestTopicForArticle(articles[0]);
    selected.push(makeSpecificPacket(articles[0], topic, articles.slice(1), makeRossenPitchHeadline(articles[0], topic)));
  }

  return selected;
}

async function searchNews(queries, env) {
  const all = [];
  const errors = [];
  const disabled = new Set();

  const providerSearches = [
    ["Brave", Boolean(env.BRAVE_API_KEY), (q) => searchBrave(q, env.BRAVE_API_KEY)],
    ["Tavily", Boolean(env.TAVILY_API_KEY), (q) => searchTavily(q, env.TAVILY_API_KEY)],
  ];

  for (const q of queries) {
    for (const [name, configured, search] of providerSearches) {
      if (!configured || disabled.has(name)) continue;
      try {
        all.push(...await search(q));
      } catch (error) {
        errors.push(error.message);
        if (error.disableProvider) disabled.add(name);
      }
    }
  }

  let articles = dedupeArticles(all);
  let usedFallback = false;

  if (articles.length === 0) {
    usedFallback = true;
    await runWithConcurrency(queries, SEARCH_CONCURRENCY, async (q) => {
      try {
        all.push(...await searchGoogleNews(q, env));
      } catch (error) {
        errors.push(error.message);
      }
    });
    articles = dedupeArticles(all);
  }

  return { articles, errors: [...new Set(errors)], usedFallback };
}

function buildPrompt(mode, query, articles) {
  const articleText = articles
    .map((a) => `TITLE: ${truncate(a.title, 180)}\nSOURCE: ${a.source}\nURL: ${a.url}\nSUMMARY: ${truncate(a.summary)}`)
    .join("\n\n---\n\n");

  const instructions = {
    discover: `Find 3–4 strong Rossen-style consumer video packets from the articles below. Each packet must be specific enough to click: name the store, product, service, scam, fee, recall, setting, policy, or deal in the pitchHeadline.\n\n${ROSSEN_STORY_RULES}`,
    search: `Research this story idea: "${query}". Build 2–3 complete story packets with supporting sources, proof points, viewer takeaways, and production angles. Make the packets concrete and clickable, not broad category labels.`,
    bundle: `The producer wants to build a fuller packet around: "${query}". Find 4–6 related source stories that fit together, then package them into one or more complete story packets. Keep the headline anchored to the exact store, product, fee, scam, policy, or viewer action.`,
    inspire: `Generate 3–4 Jeff Rossen-style consumer story ideas inspired by these articles. Each should feel like something Rossen would actually investigate and present on TV, with a headline like a specific YouTube story rather than a category.\n\n${ROSSEN_STORY_RULES}`,
  };

  const system = `You are a segment producer for Jeff Rossen's consumer video show. You specialize in finding viewer-service stories that help everyday Americans save money, avoid scams, buy smarter, get refunds, and protect their families. Your job is to package individual stories into compelling 10-minute video segments with a fast hook, visible proof, and practical takeaways.`;

  const user = `${instructions[mode] || instructions.discover}

ARTICLES:
${articleText}

Important: do not use broad category names as pitchHeadline. Bad pitchHeadlines: "Scams Targeting Viewers", "Recalls And Safety Alerts", "Hidden Fees And Fine Print", "Prices And Shrinkflation". Good pitchHeadlines: "Amazon Text Scam: Don't Click This", "The Truth About Kohl's Deals", "Hotel Fees: Check This Before You Book", "Your Car Is Watching You: Shut This Off".

Return a JSON array of story packets. Each object must use EXACTLY this structure:
[
  {
    "theme": "Specific story lane, 3–6 words",
    "headline": "ON-AIR HEADLINE ALL CAPS UNDER 10 WORDS",
    "pitchHeadline": "Clickable Rossen-style headline naming the store/product/service/scam/fee/recall/setting/action",
    "pitch": "2-sentence pitch explaining the story, why Jeff would care, and why viewers would click",
    "hook": "The cold-open moment: bill, text, app screen, product, price tag, recall notice, test, or viewer example",
    "viewerTakeaway": "One clear thing viewers can do after watching",
    "sourceCount": 3,
    "stories": [
      { "title": "story title", "summary": "2-sentence summary of consumer impact", "url": "https://...", "source": "domain.com" }
    ],
    "proofPoints": [
      "Specific sourced fact, fee, deal, scam red flag, recall detail, price change, refund step, or policy change",
      "Second proof point from another source",
      "Third proof point that makes it feel like a pattern"
    ],
    "sourceQuestions": [
      "Question to answer before producing",
      "Fact to verify in source material",
      "Screenshot/demo/proof to collect"
    ],
    "angles": [
      "Angle 1: The problem (what companies are doing)",
      "Angle 2: The impact (what consumers lose or risk)",
      "Angle 3: What viewers should do right now"
    ],
    "whyItWorks": [
      "Clear consumer impact",
      "Easy to demonstrate visually",
      "Relevant to older viewers and families",
      "Multiple examples make it feel like a pattern"
    ],
    "segmentStructure": [
      "Open: Hook with a surprising stat or personal example",
      "Build: Second story that confirms the pattern",
      "Escalate: Third example or expert quote",
      "Turn: Watchdog angle or regulatory action",
      "Close: What viewers should do RIGHT NOW"
    ],
    "productionPlan": [
      "Visual 1: What to show on screen",
      "Demo/Test: What Jeff can try, compare, or walk through",
      "Expert/Source: Who or what confirms it",
      "Close: The viewer checklist"
    ]
  }
]

Return 3–4 story packet objects. Return ONLY the JSON array — no markdown, no explanation, no extra text.`;

  return { system, user };
}

function parseJSON(text) {
  return JSON.parse(text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""));
}

function responseDetail(data, fallback) {
  return data?.error?.message || data?.error?.detail || data?.detail?.error || data?.detail || data?.message || fallback || "request failed";
}

function aiProviderError(provider, response, data) {
  return new Error(`${provider} ${response.status}: ${responseDetail(data, response.statusText)}`);
}

function parseAIJSON(provider, text) {
  try {
    return parseJSON(text);
  } catch (error) {
    throw new Error(`${provider} returned non-JSON response: ${error.message}`);
  }
}

async function callAI({ system, user }, env) {
  const failures = [];

  if (env.OPENAI_API_KEY) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw aiProviderError("OpenAI", r, data);
      return parseAIJSON("OpenAI", data.choices?.[0]?.message?.content || "");
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        body: JSON.stringify({
          model: "claude-opus-4-7",
          max_tokens: 4000,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw aiProviderError("Anthropic", r, data);
      return parseAIJSON("Anthropic", data.content?.[0]?.text || "");
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (env.GEMINI_API_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
          }),
        }
      );
      const data = await r.json();
      if (!r.ok) throw aiProviderError("Gemini", r, data);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return parseAIJSON("Gemini", text);
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (env.GROQ_API_KEY) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.GROQ_API_KEY}` },
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw aiProviderError("Groq", r, data);
      return parseAIJSON("Groq", data.choices?.[0]?.message?.content || "");
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (failures.length > 0) {
    throw new Error(`AI providers failed. ${failures.join("; ")}`);
  }

  throw new Error("No AI API key configured (need OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY)");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    if (typeof res.status === "function") res.status(405).end();
    else { res.statusCode = 405; res.end(); }
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const { mode = "discover", query } = req.body || {};

    send({ type: "progress", message: "Searching for story packet sources…", percent: 15 });

    const queries = buildQueries(mode, query, process.env);
    const { articles, errors, usedFallback } = await searchNews(queries, process.env);

    if (articles.length === 0) {
      const providerDetails = errors.length ? ` Provider responses: ${errors.join("; ")}` : "";
      throw new Error(`No articles found from Brave, Tavily, or Google News RSS.${providerDetails}`);
    }

    if (usedFallback) {
      send({ type: "progress", message: "Search API quota unavailable; using Google News RSS fallback…", percent: 35 });
    }

    const articlesForAI = articles.slice(0, AI_ARTICLE_LIMIT);

    send({ type: "progress", message: `Analyzing ${articlesForAI.length} articles for story packets…`, percent: 55 });
    send({ type: "progress", message: "Drafting headline pitches and source packets…", percent: 65 });

    let segments;
    try {
      segments = normalizeAISegments(
        await callAI(buildPrompt(mode, query, articlesForAI), process.env),
        articles,
      );
    } catch (error) {
      console.warn(`[segments] AI unavailable, using fallback: ${error.message}`);
      send({ type: "progress", message: "AI unavailable; building article-based story packets…", percent: 75 });
      segments = buildFallbackSegments(mode, query, articles);
    }

    send({ type: "progress", message: "Building story packets…", percent: 90 });
    send({ type: "done", segments });
  } catch (e) {
    send({ type: "error", message: e.message });
  }

  res.end();
}
