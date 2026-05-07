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

const BANNED_HEADLINE = /\b(deal alert|consumer alert|available now|limited time|new update|this week|freebies|various|several|multiple|deals include|things to know|everything to know)\b/i;

function normalizeHeadline(value, brand) {
  const brandLine = cleanLine(brand || "RETAIL").toUpperCase();
  const rawLines = Array.isArray(value) ? value : String(value || "").split(/\n+/);
  const lines = rawLines.map((l) => cleanLine(l).toUpperCase()).filter(Boolean).filter((l, i) => i === 0 || l !== brandLine);
  if (lines[0] !== brandLine) lines.unshift(brandLine);
  const finalLines = lines.slice(0, 3);
  if (finalLines.length < 2) return null;
  if (BANNED_HEADLINE.test(finalLines.slice(1).join(" "))) return null;
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
    `White Castle BOGO combo meals Mother's Day ${m}`,
    `Pizza Hut heart shaped pizza Mother's Day ${m}`,
    `Baskin Robbins BOGO scoop rewards May 9 ${year}`,
    `7 Brew free koozie Mother's Day May 10 ${year}`,
    `Krispy Kreme Mother's Day minis box May ${year}`,
    `Shake Shack free burgers every week May ${year}`,
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

TO PASS, a story must have at least ONE of:
✓ A specific dollar amount or free item named
✓ A specific product name (not just "items" or "products")
✓ A specific date or deadline
✓ A specific legal claim, recall, or safety finding

━━━ HEADLINE FORMAT ━━━
Write like a TV consumer-alert graphic. 3 lines, always.

Line 1: BRAND NAME IN CAPS
Line 2: WHAT HAPPENED — use one of these action words:
  FREE · RECALLED · SUED · WARNING · PRICE CHANGE · DATA BREACH · SCAM
  NEW · RETURNING · UPDATED · SETTLEMENT · ACCUSED · BOGO · ENDS
  — OR a dollar amount like "$2.50" or "50% OFF" as the hook
Line 3: DATE / CONDITION / DETAIL — one of:
  exact date · deadline · who qualifies · safety risk · where it applies

TIMING — be specific:
  ✓ MAY 6TH ONLY · THROUGH MAY 31ST · WITH $10+ PURCHASE · AT SELECT LOCATIONS
  ✗ soon · limited time · this week

LEGAL SAFETY — never state allegations as facts:
  Use: LAWSUIT CLAIMS · CPSC SAYS · FDA SAYS · CUSTOMERS REPORT · ACCUSED OF

DO NOT split meaning awkwardly:
  ✗ CHIPOTLE / $2.50 / TACOS THROUGH JUNE 2ND
  ✓ CHIPOTLE / $2.50 TACOS / THROUGH JUNE 2ND AT SELECT LOCATIONS

NEVER write: DEAL ALERT · AVAILABLE NOW · NEW UPDATE · THIS WEEK · FREEBIES

GOOD EXAMPLES — match this quality:
  COSTCO / $1.50 HOT DOG COMBO UPDATED / WATER NOW AN OPTION
  BEST BUY / PRESSURE COOKER WARNING / CPSC SAYS STOP USING IMMEDIATELY
  SHAKE SHACK / FREE BURGERS EVERY WEEK / WITH $10+ PURCHASE ALL MAY
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
      "image_query": "5-8 word query for a storefront or exterior photo"
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
