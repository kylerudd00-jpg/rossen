const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_RESEARCH_MODEL = "gpt-5.5";
const DEFAULT_HEADLINE_MODEL = "gpt-5.4-mini";

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
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function cleanLine(value) {
  return String(value || "")
    .replace(/^[\s"'-]+|[\s"'-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const BANNED_HEADLINE = /\b(deal alert|consumer alert|available now|limited time|new update|this week|freebies|various|several|multiple|deals include|things to know|everything to know)\b/i;

function normalizeHeadline(value, brand) {
  const brandLine = cleanLine(brand || "RETAIL").toUpperCase();
  const rawLines = Array.isArray(value)
    ? value
    : String(value || "").split(/\n+/);

  const lines = rawLines
    .map((line) => cleanLine(line).toUpperCase())
    .filter(Boolean)
    .filter((line, index) => index === 0 || line !== brandLine);

  if (lines[0] !== brandLine) lines.unshift(brandLine);
  const finalLines = lines.slice(0, 3);
  if (finalLines.length < 2) return null;
  if (BANNED_HEADLINE.test(finalLines.slice(1).join(" "))) return null;
  return finalLines.join("\n");
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function parseJson(text) {
  const cleaned = String(text || "").replace(/```json|```/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("OpenAI did not return JSON");
  return JSON.parse(match[0]);
}

async function callOpenAI({ apiKey, model, instructions, input, maxOutputTokens, timeoutMs, useWebSearch = false, reasoningEffort = "medium" }) {
  const body = {
    model,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
  };

  if (useWebSearch) {
    body.tools = [{
      type: "web_search",
      user_location: {
        type: "approximate",
        country: "US",
        timezone: "America/New_York",
      },
    }];
    body.tool_choice = "auto";
    body.include = ["web_search_call.action.sources"];
  }

  if (/^(gpt-5|o[1-9])/.test(model)) {
    body.reasoning = { effort: reasoningEffort };
  }

  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${bodyText.slice(0, 500)}`);
  }

  return res.json();
}

function researchInstructions() {
  const now = new Date();
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are the research and headline desk for Rossen Reports.

Today is ${today}. The audience is Americans age 50-75+.

Find timely consumer stories that can become simple social graphics.

Good stories are:
- a specific free item, deal, discount, rebate, reward, or deadline from one recognizable brand
- a recall, safety warning, scam, breach, lawsuit, settlement, fee change, or policy change consumers should act on
- current, still active, or newly reported

Reject:
- vague shopping tips, listicles, roundups, earnings, investor news, employment news, local-only openings, and old/expired deals
- articles where the only hook is "deals are available" or "several brands are offering freebies"
- anything you cannot verify from a source URL

Research like a careful ChatGPT thread:
- search broadly across deals, recalls, lawsuits, warnings, scams, data breaches, policy changes, and brand promos
- open/read pages when needed instead of relying only on snippets
- prefer official sources, regulators, AP/Reuters/CNBC/USA Today/People/AARP/Consumer Reports, and strong deal/restaurant sources
- fact-check the final details before including a story

Return JSON only. No markdown. No citations outside the JSON.

Schema:
{
  "stories": [
    {
      "brand": "BRAND NAME IN ALL CAPS",
      "title": "source article title",
      "source_url": "https://...",
      "published_at": "YYYY-MM-DD or source date",
      "summary": "one sentence with the exact verified fact",
      "why_it_matters": "short reason this is useful to the audience",
      "headline": ["BRAND", "SPECIFIC ACTION OR ITEM", "DATE / RISK / CONDITION"],
      "image_query": "5-8 word query for a real storefront or exterior photo"
    }
  ]
}`;
}

function researchPrompt(count) {
  return `Find the best ${count} consumer stories for today's Rossen Reports post builder.

Prioritize:
1. major national food/restaurant deals with a specific item, price, date, or eligibility
2. recalls and safety warnings from CPSC, FDA, USDA, NHTSA, or brands
3. lawsuits, settlements, hidden fees, data breaches, and scams with clear consumer impact
4. major retail/restaurant/service policy changes
5. new or returning menu items only when the item is specific and timely

Each returned story must have one source URL and a headline that makes sense as a 2-3 line graphic. Return fewer than ${count} if fewer truly qualify.`;
}

function normalizeStory(item, index) {
  const brand = cleanLine(item.brand || "RETAIL").toUpperCase();
  const sourceUrl = cleanLine(item.source_url || item.sourceUrl);
  const title = cleanLine(item.title);
  const headline = normalizeHeadline(item.headline, brand);
  const summary = cleanLine(item.summary || item.why_it_matters || title);

  if (!brand || brand === "RETAIL") return null;
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;
  if (!title || !headline || !summary) return null;

  const domain = sourceDomain(sourceUrl);
  return {
    id: stableId(sourceUrl || `${brand}-${title}-${index}`),
    brand,
    title,
    sourceUrl,
    sourceDomain: domain,
    publishedAt: displayDate(item.published_at),
    rawPubDate: item.published_at || null,
    rawSummary: summary,
    whySelected: cleanLine(item.why_it_matters),
    headline,
    imageQuery: cleanLine(item.image_query),
    queryLabel: "OpenAI Research",
    provider: "openai",
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

export async function researchStoriesWithOpenAI(env = {}, progress = () => {}) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const count = envNumber(env, "OPENAI_STORY_COUNT", 24);
  const model = env.OPENAI_RESEARCH_MODEL || DEFAULT_RESEARCH_MODEL;
  const reasoningEffort = env.OPENAI_REASONING_EFFORT || "medium";
  const timeoutMs = envNumber(env, "OPENAI_RESEARCH_TIMEOUT_MS", 110000);

  progress("OpenAI is researching and fact-checking stories...", 8);
  const data = await callOpenAI({
    apiKey,
    model,
    instructions: researchInstructions(),
    input: researchPrompt(count),
    maxOutputTokens: envNumber(env, "OPENAI_RESEARCH_MAX_OUTPUT_TOKENS", 6000),
    timeoutMs,
    useWebSearch: true,
    reasoningEffort,
  });

  progress("OpenAI found sources. Building story cards...", 65);
  const parsed = parseJson(extractOutputText(data));
  const rawStories = Array.isArray(parsed.stories) ? parsed.stories : [];
  const stories = dedupeStories(rawStories.map(normalizeStory), count);
  if (stories.length === 0) throw new Error("OpenAI returned no usable verified stories");
  return stories;
}

export async function writeOpenAIHeadline(candidate, env = {}) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = env.OPENAI_HEADLINE_MODEL || env.OPENAI_RESEARCH_MODEL || DEFAULT_HEADLINE_MODEL;
  const timeoutMs = envNumber(env, "OPENAI_HEADLINE_TIMEOUT_MS", 30000);
  const brand = cleanLine(candidate.brand || "RETAIL").toUpperCase();

  const data = await callOpenAI({
    apiKey,
    model,
    instructions: `You write Rossen Reports social graphic headlines.

Return JSON only:
{"options":[["BRAND","SPECIFIC ACTION OR ITEM","DATE / RISK / CONDITION"],["BRAND","...","..."],["BRAND","...","..."]]}

Rules:
- Use only facts in the article title/summary.
- Do not invent.
- Never write generic lines like "DEAL ALERT", "AVAILABLE NOW", "LIMITED TIME", "NEW UPDATE", or "THIS WEEK".
- Line 2 must name the concrete item/action/risk.
- Line 3 should be the date, condition, risk, or who qualifies.`,
    input: `Brand: ${brand}
Title: ${candidate.title || ""}
Summary: ${candidate.rawSummary || candidate.summary || ""}`,
    maxOutputTokens: 1000,
    timeoutMs,
    useWebSearch: false,
    reasoningEffort: "low",
  });

  const parsed = parseJson(extractOutputText(data));
  const rawOptions = Array.isArray(parsed.options) ? parsed.options : [];
  const options = rawOptions
    .map((option) => normalizeHeadline(option, brand))
    .filter(Boolean);

  if (options.length === 0) throw new Error("OpenAI returned no usable headline options");
  return { headline: options[0], options };
}
