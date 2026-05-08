import { parseRssItems } from "../pipeline/lib/rss.mjs";

// POST { mode: 'discover'|'search'|'bundle'|'inspire', query?: string }
// Streams SSE: progress events then a done event with segments array

export const config = { maxDuration: 60 };

const ROSSEN_THEMES = [
  "airline fees and travel headaches",
  "grocery prices and shrinkflation",
  "retail return policy changes",
  "dangerous products and recalls",
  "scams targeting older adults",
  "hidden fees and fine print",
  "big company policy changes that cost consumers",
  "restaurant rewards and app changes",
  "insurance bills and subscription traps",
  "banking fees and credit card rule changes",
  "streaming service price hikes and cancellation tricks",
  "healthcare billing surprises",
];

const DISCOVER_QUERIES = [
  "consumer warning company changes policy 2026",
  "hidden fees customers paying more 2026",
  "retail store policy change shoppers affected",
  "airline fee increase travel alert 2026",
  "grocery shrinkflation price hike consumers",
  "scam warning older adults 2026",
  "product recall safety warning consumers",
  "subscription trap hidden charge consumer complaint",
];

const AI_ARTICLE_LIMIT = 24;
const AI_SUMMARY_LIMIT = 360;

function buildQueries(mode, query) {
  if (mode === "discover") return DISCOVER_QUERIES.slice(0, 6);
  if (mode === "inspire")
    return ROSSEN_THEMES.slice(0, 6).map((t) => `${t} consumer news 2026`);
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

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  }).slice(0, 40);
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
    for (const q of queries) {
      try {
        all.push(...await searchGoogleNews(q, env));
      } catch (error) {
        errors.push(error.message);
      }
    }
    articles = dedupeArticles(all);
  }

  return { articles, errors: [...new Set(errors)], usedFallback };
}

function buildPrompt(mode, query, articles) {
  const articleText = articles
    .map((a) => `TITLE: ${truncate(a.title, 180)}\nSOURCE: ${a.source}\nURL: ${a.url}\nSUMMARY: ${truncate(a.summary)}`)
    .join("\n\n---\n\n");

  const instructions = {
    discover: "Find 3–4 strong consumer story bundles from the articles below. Each bundle should be a theme strong enough for a 10-minute TV segment.",
    search: `Research this story idea: "${query}". Find supporting evidence, related examples, and multiple angles. Return 2–3 segment bundles based on what you find.`,
    bundle: `The producer wants to build a longer segment around: "${query}". Find 4–6 related stories from the articles that fit together. Group them into one compelling theme.`,
    inspire: `Generate 3–4 Jeff Rossen-style consumer story ideas inspired by these articles. Each should feel like something Rossen would actually investigate and present on TV.`,
  };

  const system = `You are a segment producer for Jeff Rossen's consumer news show on NBC. You specialize in finding consumer protection stories that affect everyday Americans — especially older adults, families, travelers, and shoppers. Your job is to package individual stories into compelling 10-minute TV segments.`;

  const user = `${instructions[mode] || instructions.discover}

ARTICLES:
${articleText}

Return a JSON array. Each object must use EXACTLY this structure:
[
  {
    "theme": "Short punchy segment theme, 5–8 words",
    "headline": "ON-AIR HEADLINE ALL CAPS UNDER 10 WORDS",
    "stories": [
      { "title": "story title", "summary": "2-sentence summary of consumer impact", "url": "https://...", "source": "domain.com" }
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
    ]
  }
]

Return 3–4 segment objects. Return ONLY the JSON array — no markdown, no explanation, no extra text.`;

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
        signal: AbortSignal.timeout(45000),
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
        signal: AbortSignal.timeout(45000),
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
          signal: AbortSignal.timeout(45000),
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
        signal: AbortSignal.timeout(45000),
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

    send({ type: "progress", message: "Searching for consumer news stories…", percent: 15 });

    const queries = buildQueries(mode, query);
    const { articles, errors, usedFallback } = await searchNews(queries, process.env);

    if (articles.length === 0) {
      const providerDetails = errors.length ? ` Provider responses: ${errors.join("; ")}` : "";
      throw new Error(`No articles found from Brave, Tavily, or Google News RSS.${providerDetails}`);
    }

    if (usedFallback) {
      send({ type: "progress", message: "Search API quota unavailable; using Google News RSS fallback…", percent: 35 });
    }

    const articlesForAI = articles.slice(0, AI_ARTICLE_LIMIT);

    send({ type: "progress", message: `Analyzing ${articlesForAI.length} articles for segment ideas…`, percent: 55 });

    const segments = await callAI(buildPrompt(mode, query, articlesForAI), process.env);

    send({ type: "progress", message: "Building segment packages…", percent: 90 });
    send({ type: "done", segments });
  } catch (e) {
    send({ type: "error", message: e.message });
  }

  res.end();
}
