import { parseRssItems } from "../pipeline/lib/rss.mjs";

// POST { mode: 'discover'|'search'|'bundle'|'inspire', query?: string }
// Streams SSE: progress events then a done event with segments array

export const config = { maxDuration: 60 };

const ROSSEN_THEMES = [
  "new scams viewers can spot before losing money",
  "Amazon Prime fees refunds and shopping traps",
  "Target Walmart Costco Aldi items to buy or skip",
  "free food app perks and rewards changes",
  "travel refunds parking fees and booking traps",
  "product tests that reveal the best buy",
  "side hustles and simple ways to save money",
  "home safety demos and delivery warnings",
  "recalls and product dangers with viewer action steps",
  "hidden subscription charges and cancellation tricks",
  "insurance bills banking fees and refund deadlines",
  "grocery price tricks shrinkflation and clearance markdowns",
];

const DISCOVER_QUERIES = [
  "new scam warning text refund delivery captcha electric bill 2026",
  "Amazon Prime hidden fee refund return subscription charge shoppers 2026",
  "Target Walmart Costco Aldi new items discontinued clearance buy skip 2026",
  "free fast food restaurant app rewards perks deals this week 2026",
  "airline refund travel scam airport parking save money fee warning 2026",
  "best product test comparison air fryer appliance worth it recall warning 2026",
  "side hustle extra cash warning scam legitimate app 2026",
  "grocery shrinkflation price drop clearance markdown save money 2026",
  "car insurance bank fee subscription cancellation refund deadline consumers 2026",
  "delivery driver package theft home safety warning consumer tips 2026",
];

const ROSSEN_STORY_RULES = `Prioritize Rossen-style video stories:
- a clear viewer payoff: save money, get money back, avoid a scam, avoid a bad buy, or protect your family
- a concrete hook that can be shown on camera: text message, bill, app screen, product, receipt, policy page, recall item, price tag, travel booking, or side-by-side test
- a direct action step: what to click, what to check, what to buy or skip, what deadline matters, or who to call
- practical brands and situations viewers already use: Amazon, Target, Walmart, Costco, Sam's Club, Aldi, fast food apps, airlines, banks, insurers, utilities, delivery services, common appliances
- segment shapes that work for 10-minute YouTube/video arcs: countdown, expose, buy/skip list, hidden fee breakdown, product test, scam red flags, refund playbook, travel savings, side-hustle reality check`;

const AI_ARTICLE_LIMIT = 24;
const AI_SUMMARY_LIMIT = 360;

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
];

function buildQueries(mode, query) {
  if (mode === "discover") return DISCOVER_QUERIES.slice(0, 8);
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

function scoreTopic(article, topic) {
  const text = `${article.title || ""} ${article.summary || ""} ${article.source || ""}`.toLowerCase();
  return topic.patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function fallbackSummary(article) {
  const summary = truncate(article.summary || "", 220);
  if (summary) return summary;
  return "This article may fit a broader consumer-alert segment. Use the source to confirm the newest details before scripting.";
}

function buildFallbackSegments(mode, query, articles) {
  const groups = FALLBACK_TOPICS.map((topic) => ({ topic, stories: [], score: 0 }));
  const uncategorized = [];

  for (const article of articles) {
    const ranked = groups
      .map((group) => ({ group, score: scoreTopic(article, group.topic) }))
      .sort((left, right) => right.score - left.score);

    if (ranked[0]?.score > 0) {
      ranked[0].group.stories.push(article);
      ranked[0].group.score += ranked[0].score;
    } else {
      uncategorized.push(article);
    }
  }

  for (const article of uncategorized) {
    const smallest = groups
      .filter((group) => group.stories.length > 0)
      .sort((left, right) => left.stories.length - right.stories.length)[0];
    if (smallest) smallest.stories.push(article);
  }

  const selected = groups
    .filter((group) => group.stories.length > 0)
    .sort((left, right) => (right.score + right.stories.length) - (left.score + left.stories.length))
    .slice(0, mode === "search" || mode === "bundle" ? 3 : 4);

  if (selected.length === 0 && articles.length > 0) {
    selected.push({
      topic: {
        theme: query ? `Consumer Angle: ${truncate(query, 42)}` : "Consumer Alerts To Watch",
        headline: "STORIES TO WATCH",
        angles: [
          "Angle 1: The consumer problem",
          "Angle 2: The money, safety, or time at risk",
          "Angle 3: What viewers should check next",
        ],
      },
      stories: articles.slice(0, 4),
      score: 0,
    });
  }

  return selected.map(({ topic, stories }) => ({
    theme: topic.theme,
    headline: topic.headline,
    stories: stories.slice(0, 4).map((article) => ({
      title: article.title || "Untitled story",
      summary: fallbackSummary(article),
      url: article.url,
      source: article.source,
    })),
    angles: topic.angles,
    whyItWorks: [
      "Built from current article search results",
      "Multiple examples can establish a pattern",
      "Consumer impact is visible enough for a service segment",
      "Sources give producers a fast verification path",
    ],
    segmentStructure: [
      "Open: Start with the clearest viewer cost, risk, or surprise",
      "Build: Add a second article that shows this is not isolated",
      "Escalate: Bring in the strongest safety, money, or policy detail",
      "Turn: Explain what changed and who is responsible",
      "Close: Give viewers the exact check, deadline, or next step",
    ],
  }));
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
    discover: `Find 3–4 strong Rossen-style consumer video bundles from the articles below. Each bundle should be a theme strong enough for a 10-minute segment, with a strong hook, a visible demo or proof point, and an immediate viewer takeaway.\n\n${ROSSEN_STORY_RULES}`,
    search: `Research this story idea: "${query}". Find supporting evidence, related examples, and multiple angles. Return 2–3 segment bundles based on what you find.`,
    bundle: `The producer wants to build a longer segment around: "${query}". Find 4–6 related stories from the articles that fit together. Group them into one compelling theme.`,
    inspire: `Generate 3–4 Jeff Rossen-style consumer story ideas inspired by these articles. Each should feel like something Rossen would actually investigate and present on TV.\n\n${ROSSEN_STORY_RULES}`,
  };

  const system = `You are a segment producer for Jeff Rossen's consumer video show. You specialize in finding viewer-service stories that help everyday Americans save money, avoid scams, buy smarter, get refunds, and protect their families. Your job is to package individual stories into compelling 10-minute video segments with a fast hook, visible proof, and practical takeaways.`;

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

    let segments;
    try {
      segments = await callAI(buildPrompt(mode, query, articlesForAI), process.env);
    } catch (error) {
      console.warn(`[segments] AI unavailable, using fallback: ${error.message}`);
      send({ type: "progress", message: "AI unavailable; building article-based segment packages…", percent: 75 });
      segments = buildFallbackSegments(mode, query, articles);
    }

    send({ type: "progress", message: "Building segment packages…", percent: 90 });
    send({ type: "done", segments });
  } catch (e) {
    send({ type: "error", message: e.message });
  }

  res.end();
}
