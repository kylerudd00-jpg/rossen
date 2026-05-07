import { executeSearch } from "./agentSearch.mjs";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.0-flash";

function envNumber(env, key, fallback) {
  const value = Number(env?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function stableId(value) {
  let hash = 0;
  const input = String(value || "");
  for (let i = 0; i < input.length; i++) hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

function displayDate(value) {
  if (!value) return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function sourceDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function cleanLine(value) {
  return String(value || "").replace(/^[\s"'-]+|[\s"'-]+$/g, "").replace(/\s+/g, " ").trim();
}

const BANNED_HEADLINE = /\b(deal alert|consumer alert|available now|limited time|coming soon|available soon|new update|this week|freebies|various|several|multiple|deals include|things to know|everything to know|buy one get one free|sold in retail stores|national .* month deals|check product at home|check your home|popular (?:item|product|dessert)|some (?:items|products)|new deal available|deal available|customers? affected|mother'?s day deal|free item)\b/i;

function hasUsefulThirdLine(line) {
  const value = String(line || "").trim();
  if (!value) return false;
  if (/^(LIMITED TIME|AVAILABLE NOW|THIS WEEK|WITH PURCHASE|NEW OPTION|CHECK PRODUCT AT HOME|CHECK YOUR HOME|DETAILS INSIDE)$/i.test(value)) {
    return false;
  }
  return /\b(possible|risk|contamination|allergen|salmonella|listeria|glass|choking|burn|fire|injur|death|vision|cpsc|fda|usda|says|claims|reported|accused|lawsuit|through|until|starting|starts?|only|with|for|members|app|cardholders|id|select|locations|nationwide|supplies|water|option|weekend|after|before|purchase|code|customers?|cheap|uproar|backlash|warning|issued|costs?|under|all\s+may|january|february|march|april|may|june|july|august|september|october|november|december|\$\d|\d+(?:st|nd|rd|th)?\b)\b/i.test(value);
}

function isWeakHeadlineLines(lines) {
  if (lines.length !== 3) return true;
  if ((lines[0].match(/\//g) || []).length > 1) return true;
  const body = lines.slice(1).join(" ");
  return !hasUsefulThirdLine(lines[2])
    || BANNED_HEADLINE.test(body)
    || /\b(?:SOME\s+)?PRODUCTS? RECALLED\b/i.test(body)
    || /\bITEMS RECALLED\b/i.test(body)
    || /\bRECALL ANNOUNCED\b/i.test(body)
    || /\bCOMPANY MAKES CHANGE\b/i.test(body)
    || /\bMAKES (?:A\s+)?(?:SUBTLE\s+)?CHANGE TO\b/i.test(body)
    || /\bWARNING ISSUED FOR\b/i.test(body);
}

function normalizeHeadline(value, brand) {
  const brandLine = cleanLine(brand || "RETAIL").toUpperCase();
  const rawLines = Array.isArray(value) ? value : String(value || "").split(/\n+/);
  const lines = rawLines.map((l) => cleanLine(l).toUpperCase()).filter(Boolean).filter((l, i) => i === 0 || l !== brandLine);
  if (lines[0] !== brandLine) lines.unshift(brandLine);
  const finalLines = lines.slice(0, 3);
  if (isWeakHeadlineLines(finalLines)) return null;
  return finalLines.join("\n");
}

function normalizeStory(item, index) {
  const brand = cleanLine(item.brand || "RETAIL").toUpperCase();
  const sourceUrl = cleanLine(item.source_url || item.sourceUrl || "");
  const title = cleanLine(item.title || "");
  const headline = normalizeHeadline(item.headline, brand);
  const summary = cleanLine(item.summary || item.why_it_matters || title);

  if (!brand || brand === "RETAIL") return null;
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;
  if (!title || !headline || !summary) return null;

  return {
    id: stableId(sourceUrl || `${brand}-${title}-${index}`),
    brand,
    title,
    sourceUrl,
    sourceDomain: sourceDomain(sourceUrl),
    publishedAt: displayDate(item.published_at),
    rawPubDate: item.published_at || null,
    rawSummary: summary,
    whySelected: cleanLine(item.why_it_matters || ""),
    headline,
    imageQuery: cleanLine(item.image_query || ""),
    queryLabel: "Gemini Research",
    provider: "gemini",
  };
}

function dedupeStories(stories, limit) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const brandCounts = new Map();
  const out = [];
  for (const story of stories) {
    if (!story) continue;
    const urlKey = story.sourceUrl.toLowerCase().replace(/[?#].*$/, "");
    const titleKey = story.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).slice(0, 8).join(" ");
    if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
    const brandCount = brandCounts.get(story.brand) || 0;
    if (brandCount >= 2) continue;
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    brandCounts.set(story.brand, brandCount + 1);
    out.push(story);
    if (out.length >= limit) break;
  }
  return out;
}

function extractJson(text) {
  const stripped = String(text || "")
    .replace(/```json\s*/gi, "").replace(/```\s*/g, "")
    .replace(/\[\d+\]/g, "")
    .trim();
  try { return JSON.parse(stripped); } catch {}
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  throw new Error(`Could not parse Gemini JSON. Raw: ${stripped.slice(0, 300)}`);
}

// ─── Search ───────────────────────────────────────────────────────────────────

function buildQueries() {
  const now = new Date();
  const m = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const year = now.getFullYear();
  return [
    `Aldi creme brulee recall glass contamination ${m}`,
    `Zapp's Dirty potato chips recall salmonella ${m}`,
    `Good & Gather snack mix recall salmonella ${m}`,
    `Aldi Walmart frozen pizza salmonella alert ${m}`,
    `Best Buy Gourmia pressure cooker warning burn hazard ${year}`,
    `Vive Health adult bed rails recall deaths CPSC ${year}`,
    `White Castle BOGO combo meals May 9 11 ${year}`,
    `Raising Cane's free box combo with purchase May 10 11 ${year}`,
    `Denny's $10 off $30 orders code MOMDAY May 9 11 ${year}`,
    `Fazoli's free pasta entree purchase code MOTHER26 Mother's Day ${year}`,
    `Scooter's Coffee BOGO drinks May 7 10 after 11 AM ${year}`,
    `Aroma Joe's free 24 oz iced drink May 10 ${year}`,
    `Arby's BOGO sandwiches May 8 10 app ${year}`,
    `Pizza Hut heart shaped pizza Mother's Day ${m}`,
    `Baskin Robbins BOGO scoop rewards May 9 ${year}`,
    `7 Brew free koozie Mother's Day May 10 ${year}`,
    `Krispy Kreme Mother's Day minis box May ${year}`,
    `Krispy Kreme 16 count Minis for Mom box May 7 10 ${year}`,
    `Shake Shack free burgers every week May ${year}`,
    `Shake Shack free ShackBurger nurses May 4 12 purchase ${year}`,
    `McDonald's $2.50 McDouble backlash customers say not cheap ${m}`,
    `McDonald's value menu 10 items under $3 ${m}`,
    `Burger King beef cost warning prices rising ${m}`,
    `Wendy's sweet and sour sauce returns customer uproar ${m}`,
    `Chipotle $2.50 tacos June 2 ${year}`,
    `Costco hot dog combo water option ${m}`,
    `Subway free Poppi drink Sub Club May 7 ${year}`,
    `McDonald's refreshers crafted sodas launching nationwide ${year}`,
    `Sweetgreen wraps launch May 6 ${year}`,
    `Williams Sonoma free cooking classes every Sunday May ${year}`,
    `Regal $1 movie tickets summer movie express June 1 ${year}`,
    `Planet Fitness free summer pass teens sign up May 18 ${year}`,
    `Starbucks free drink offer ${m}`,
    `McDonald's free deal BOGO ${m}`,
    `Chipotle deal offer ${m}`,
    `Dunkin free coffee ${m}`,
    `Chick-fil-A Dairy Queen Wendy's free offer ${m}`,
    `Costco Walmart Target deal promotion ${m}`,
    `restaurant freebie deal ${m}`,
    `CPSC recall ${m}`,
    `FDA food recall ${m}`,
    `USDA meat recall product recall injury 2026`,
    `consumer class action lawsuit settlement ${m}`,
    `retail customer data breach ${m}`,
    `FTC scam alert seniors 2026`,
    `brand policy change fee increase ${m}`,
    `Netflix Costco Walmart streaming policy change 2026`,
  ];
}

async function gatherArticles({ braveKey, tavilyKey }) {
  const queries = buildQueries();
  const seenUrls = new Set();
  const all = [];

  // Run 3 at a time with a short pause between batches
  const BATCH = 3;
  for (let i = 0; i < queries.length; i += BATCH) {
    const batch = queries.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map((q) => executeSearch(q, { braveKey, tavilyKey, count: 8 }).catch(() => []))
    );
    for (const [resultIndex, r] of settled.entries()) {
      if (r.status !== "fulfilled") continue;
      const query = batch[resultIndex] || "";
      for (const a of r.value) {
        if (!a.sourceUrl || !a.title) continue;
        const key = a.sourceUrl.toLowerCase().replace(/[?#].*$/, "");
        if (seenUrls.has(key)) continue;
        seenUrls.add(key);
        all.push({
          ...a,
          rawSummary: [a.rawSummary, query].filter(Boolean).join(" "),
        });
      }
    }
    if (i + BATCH < queries.length) await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`[gemini-research] Collected ${all.length} articles from search`);
  return all;
}

// ─── AI call (Gemini with Groq fallback) ─────────────────────────────────────

async function callGemini(apiKey, model, systemPrompt, userPrompt, timeoutMs) {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new Error(`Gemini network error: ${e.message}`);
  }
  if (res.ok) {
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  }
  const bodyText = await res.text().catch(() => "");
  throw new Error(`Gemini ${res.status}: ${bodyText.slice(0, 200)}`);
}

async function callGroq(apiKey, systemPrompt, userPrompt, timeoutMs) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function callAI(env, model, systemPrompt, userPrompt, timeoutMs) {
  if (env.GEMINI_API_KEY) {
    try {
      return await callGemini(env.GEMINI_API_KEY, model, systemPrompt, userPrompt, timeoutMs);
    } catch (e) {
      if (!env.GROQ_API_KEY) throw e;
      console.warn(`[gemini-research] Gemini failed (${e.message.slice(0, 60)}), trying Groq...`);
    }
  }
  if (env.GROQ_API_KEY) {
    return callGroq(env.GROQ_API_KEY, systemPrompt, userPrompt, timeoutMs);
  }
  throw new Error("No AI API key available");
}

function buildSystemPrompt() {
  const now = new Date();
  const today = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return `You are the headline desk for Rossen Reports, a consumer news page for Americans age 50-75+.

Today is ${today}.

You will receive a list of news articles. Pick the best consumer stories and write poster-style headlines.

━━━ WHAT QUALIFIES ━━━
Pick only stories where the viewer can say:
- "I can get something free or save money from a brand I know"
- "I need to check something I own right now"
- "A company did something shady that affects me"
- "A brand I use is changing in a way that matters to me"
- "There's a scam targeting people like me"

HARD REJECT — never pick these:
- Corporate earnings, revenue reports, stock prices
- Layoffs, executive changes, business strategy
- Listicles: "10 restaurants with deals", "Best Memorial Day sales"
- Stories with no specific product, price, or date
- "Prices may rise" with no named product or brand action
- Logistics, supply chain, warehouse, distribution stories
- Multi-recall roundup articles that blend unrelated products/brands into one card
- Generic deal roundups unless the article/snippet confirms one brand's exact item, condition, and date
- Old or expired deals
- Local-only stories unless a national brand has a clear national consumer angle
- Weak or unverified sources where the URL does not confirm the claim
- Stories where the only possible headline would be vague

TO PASS, a story must have at least ONE of:
✓ A specific dollar amount or free item named
✓ A specific product name (not just "items" or "products")
✓ A specific date or deadline
✓ A specific legal claim, recall, or safety finding
✓ A clear condition/risk/action that can become line 3

━━━ HEADLINE FORMAT ━━━
Write like a TV consumer-alert graphic. 3 lines, always.

Line 1: BRAND NAME IN CAPS
Line 2: WHAT HAPPENED — use one of these action words:
  FREE · RECALLED · SUED · WARNING · PRICE CHANGE · DATA BREACH · SCAM
  NEW · RETURNING · UPDATED · SETTLEMENT · ACCUSED · BOGO · ENDS
  — OR a dollar amount like "$2.50" or "50% OFF" as the hook
Line 3: DATE / CONDITION / DETAIL — one of:
  exact date · deadline · who qualifies · safety risk · where it applies

Line 1 rules:
  Use the most recognizable consumer-facing brand, not the corporate owner.
  For store brands, use the retailer/store brand shoppers know.
  If multiple retailers matter, use only the strongest one or two names.

Line 2 rules:
  Name the exact product, deal, warning, lawsuit, menu item, or change.
  Do not copy article-title wording.

Line 3 rules:
  It must add the catch: exact date, deadline, purchase condition, rewards/app/ID requirement, select locations, safety risk, legal qualifier, what changed, or action to take.
  It must never be filler.

TIMING — be specific:
  ✓ MAY 6TH ONLY · THROUGH MAY 31ST · WITH $10+ PURCHASE · AT SELECT LOCATIONS
  ✗ soon · limited time · this week

LEGAL SAFETY — never state allegations as facts:
  Use: LAWSUIT CLAIMS · CPSC SAYS · FDA SAYS · CUSTOMERS REPORT · ACCUSED OF

RECALL SAFETY — use the accurate action:
  Use RECALLED only if the source says recall.
  Use ALERT for public health alerts.
  Use WARNING for CPSC/stop-use warnings.

DO NOT split meaning awkwardly:
  ✗ CHIPOTLE / $2.50 / TACOS THROUGH JUNE 2ND
  ✓ CHIPOTLE / $2.50 TACOS / THROUGH JUNE 2ND AT SELECT LOCATIONS

NEVER write: DEAL ALERT · AVAILABLE NOW · NEW UPDATE · THIS WEEK · FREEBIES
NEVER write vague lines like: BUY ONE GET ONE FREE · PRODUCTS RECALLED · POPULAR ITEM · NEW DEAL AVAILABLE · CUSTOMERS AFFECTED · CHECK PRODUCT AT HOME
BOGO/FREE headlines must name the item and condition: BOGO FREE SCOOP / MAY 9TH FOR REWARDS MEMBERS
Recall/alert headlines must name the product and risk: SNACK MIXES RECALLED / POSSIBLE SALMONELLA RISK

GOOD EXAMPLES — match this quality:
  BASKIN-ROBBINS / BOGO FREE SCOOP / MAY 9TH FOR REWARDS MEMBERS
  ALDI / CRÈME BRÛLÉE RECALLED / POSSIBLE GLASS CONTAMINATION
  ALDI / WALMART / FROZEN PIZZAS ALERT / POSSIBLE SALMONELLA RISK
  GOOD & GATHER / SNACK MIXES RECALLED / POSSIBLE SALMONELLA RISK
  COSTCO / $1.50 HOT DOG COMBO UPDATED / WATER NOW AN OPTION
  BEST BUY / PRESSURE COOKERS WARNING / CPSC SAYS STOP USING IMMEDIATELY
  SHAKE SHACK / FREE BURGERS EVERY WEEK / WITH $10+ PURCHASE ALL MAY
  RAISING CANE'S / FREE BOX COMBO / WITH PURCHASE MAY 10TH–11TH
  DENNY'S / $10 OFF $30+ ORDERS / MAY 9TH–11TH WITH CODE MOMDAY
  ARBY'S / BOGO SANDWICHES / MAY 8TH–10TH IN APP
  WENDY'S / SWEET & SOUR SAUCE RETURNS / AFTER CUSTOMER UPROAR
  THERMOS / 8.2 MILLION JARS RECALLED / VISION LOSS INJURIES REPORTED
  TRADER JOE'S / SUED OVER "LOW ACID" COFFEE / LAWSUIT CLAIMS LABEL MISLED BUYERS
  JETBLUE / SUED FOR "SURVEILLANCE PRICING" / FARES MAY CHANGE BASED ON YOUR DATA

Before each headline: "Would a 65-year-old understand this in 2 seconds?" If not, rewrite it.

━━━ OUTPUT ━━━
Return ONLY valid JSON. No markdown, no prose, no citations.

{
  "stories": [
    {
      "brand": "BRAND NAME IN ALL CAPS",
      "title": "exact source article title",
      "source_url": "exact URL from the article list",
      "published_at": "date from the article",
      "summary": "one sentence — the specific verified fact",
      "why_it_matters": "one phrase — why a 60-year-old should care",
      "headline": ["BRAND", "WHAT HAPPENED", "DATE / CONDITION / DETAIL"],
      "image_query": "5-8 word image search query: storefront/exterior for places, exact product/package for recalls"
    }
  ]
}`;
}

function buildUserPrompt(articles, count) {
  const formatted = articles.slice(0, 35).map((a, i) =>
    `[${i + 1}] ${a.title}\n${(a.rawSummary || "").slice(0, 300)}\nURL: ${a.sourceUrl}`
  ).join("\n\n---\n\n");
  return `Here are today's articles. Pick the best ${count} consumer stories and write poster headlines. Return fewer than ${count} if fewer truly qualify.\n\n${formatted}`;
}

// ─── Concurrency lock ─────────────────────────────────────────────────────────
// Prevents two simultaneous page loads from both running the full pipeline and
// burning through API quota. Second caller waits and reuses the first result.

let _inFlight = null;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function researchStoriesWithGemini(env = {}, progress = () => {}) {
  if (_inFlight) {
    console.log("[gemini-research] Waiting for in-flight request...");
    return _inFlight;
  }

  _inFlight = _doResearch(env, progress).finally(() => { _inFlight = null; });
  return _inFlight;
}

async function _doResearch(env, progress) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const braveKey = env.BRAVE_API_KEY;
  const tavilyKey = env.TAVILY_API_KEY;
  const count = envNumber(env, "GEMINI_STORY_COUNT", 24);
  const model = env.GEMINI_RESEARCH_MODEL || DEFAULT_MODEL;
  const timeoutMs = envNumber(env, "GEMINI_RESEARCH_TIMEOUT_MS", 60000);

  progress("Searching for today's consumer stories...", 8);
  const articles = await gatherArticles({ braveKey, tavilyKey });

  if (articles.length === 0) throw new Error("No articles found from search APIs");

  progress(`Gemini is reviewing ${articles.length} articles...`, 40);

  const text = await callAI(env, model, buildSystemPrompt(), buildUserPrompt(articles, count), timeoutMs);
  if (!text) throw new Error("AI returned empty response");

  progress("Building story cards...", 75);

  const parsed = extractJson(text);
  const rawStories = Array.isArray(parsed?.stories) ? parsed.stories : [];
  const stories = dedupeStories(rawStories.map(normalizeStory), count);

  if (stories.length === 0) throw new Error("Gemini returned no usable stories");
  console.log(`[gemini-research] Done — ${stories.length} stories ready`);
  return stories;
}
