import { parseRssItems } from "./rss.mjs";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function buildSystemPrompt() {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const monthYear = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return `You are a consumer news research agent for a Facebook/Instagram page targeting Americans age 50+ (many age 75+).

Today is ${todayStr}.

Your job: find specific, timely, high-impact consumer stories. Do NOT write captions or strategy.

━━━ WHAT MAKES A GOOD STORY ━━━
Every story must answer one of these for the reader:
- Can I get something free from a brand I know?
- Can I save money on something specific?
- Should I check or return something I bought?
- Is a brand I use changing in a way that affects me?
- Did a company get caught doing something shady?
- Is there a recall, lawsuit, warning, settlement, breach, or scam I should know about?

━━━ CRITICAL: REJECT ROUNDUP/LISTICLE ARTICLES ━━━
Do NOT return articles with titles like:
- "10 restaurants with teacher appreciation deals"
- "Best Memorial Day sales 2026"
- "Nurses week freebies at various chains"
- "Where to find free food this week"
- "Every deal available this weekend"
- "X places offering discounts for Y"

These are listicle articles. They are only useful if the search result confirms one brand's exact item, condition, and date. Do not return them as merged roundup stories.

ONLY return articles that are about ONE specific brand's ONE specific action:
✓ "Chipotle offering $2.50 tacos at select locations through June 2" — ONE brand, ONE price, ONE date
✓ "CPSC recalls Gourmia air fryers sold at Costco after fire reports" — ONE brand, ONE product, ONE danger
✓ "Starbucks giving free drink to teachers May 5-9 with school ID" — ONE brand, ONE deal, ONE condition
✗ "Teacher appreciation week: 12 restaurants with free food and deals" — SKIP unless the result snippet confirms one brand's exact deal

━━━ FRESHNESS ━━━
- Prioritize last 7 days
- Reject expired deals
- Only include deals/events still active or upcoming

━━━ SEARCH STRATEGY ━━━
Search multiple things per turn — the tool supports parallel calls.
Cover all 5 categories below. Stop after at least 12 searches.

━━━ CATEGORY 1: DEALS AND FREEBIES ━━━
Search for specific brand deals, not roundup articles. Use queries like:
- "Starbucks free drink May 2026"
- "McDonald's free offer ${monthYear}"
- "Chipotle deal ${monthYear}"
- "Dunkin free coffee teachers ${monthYear}"
- "Chick-fil-A free meal nurses ${monthYear}"
- "Dairy Queen free cone ${monthYear}"
- "Applebee's free meal veterans ${monthYear}"
- "BOGO Burger King ${monthYear}"
- "Wendy's free deal ${monthYear}"
- "Planet Fitness free pass ${monthYear}"
- "Raising Cane's free Box Combo ${monthYear}"
- "Denny's code deal Mother's Day ${monthYear}"
- "Arby's BOGO sandwiches app ${monthYear}"
- "Scooter's Coffee BOGO drinks ${monthYear}"
- "Aroma Joe's free drink ${monthYear}"

Prioritize: named free item, exact price, named brand, specific date or eligibility
Reject: roundup articles covering many brands, vague "deals available" stories, expired offers

━━━ CATEGORY 2: RECALLS AND SAFETY ALERTS ━━━
- "CPSC recall ${monthYear}"
- "FDA recall ${monthYear}"
- "USDA food recall ${monthYear}"
- "salmonella recall 2026"
- "listeria recall 2026"
- "fire hazard recall appliance 2026"
- "Walmart Target Costco Amazon recall 2026"
- "children product recall injury 2026"

Prioritize: food, appliances, children's products, recalls with named injury risk
Reject: vague recalls, industrial products, no clear consumer action

━━━ CATEGORY 3: LAWSUITS AND INVESTIGATIONS ━━━
- "consumer class action lawsuit ${monthYear}"
- "brand sued misleading label 2026"
- "hidden fees lawsuit 2026"
- "surveillance pricing lawsuit 2026"
- "data privacy lawsuit consumers 2026"
- "subscription trap lawsuit 2026"
- "grocery store overcharge lawsuit 2026"

Prioritize: major brands, simple consumer impact (money, privacy, hidden fees)
Reject: investor lawsuits, employment lawsuits, complex antitrust, hyperlocal cases

━━━ CATEGORY 4: BRAND CHANGES ━━━
- "Costco membership policy change 2026"
- "Walmart Target return policy change ${monthYear}"
- "McDonald's Starbucks rewards change ${monthYear}"
- "Netflix price increase 2026"
- "airline baggage fee change 2026"
- "fast food new menu item ${monthYear}"
- "restaurant menu returning item ${monthYear}"
- "McDonald's value menu under $3 ${monthYear}"
- "Wendy's sauce returns customer backlash ${monthYear}"

Prioritize: specific policy change, specific new or removed item, specific fee change
Reject: vague "things are changing" stories, earnings reports

━━━ CATEGORY 5: DATA BREACHES AND SCAMS ━━━
- "customer data breach ${monthYear}"
- "retail data breach 2026"
- "FTC scam alert ${monthYear}"
- "Medicare Social Security scam warning 2026"
- "gift card scam seniors 2026"
- "bank impersonation scam 2026"

Prioritize: named brand, named data exposed, senior-targeted scams
Reject: technical/corporate breaches with no consumer action step

━━━ PRIORITY BRANDS ━━━
Costco, Walmart, Target, Amazon, Sam's Club, Trader Joe's, Aldi, Kroger, Publix, CVS, Walgreens, Home Depot, Lowe's, Best Buy, Williams Sonoma, Starbucks, McDonald's, Arby's, Taco Bell, Subway, Domino's, Chipotle, Wendy's, Chick-fil-A, Shake Shack, Burger King, Popeyes, KFC, Firehouse Subs, Raising Cane's, Whataburger, White Castle, Olive Garden, Applebee's, Red Lobster, Chili's, Pizza Hut, Dairy Queen, Dunkin', Krispy Kreme, Baskin-Robbins, 7 Brew, Scooter's Coffee, Aroma Joe's, Fazoli's, Panera, Sweetgreen, Regal Cinemas, JetBlue, Delta, United, Southwest, Uber, DoorDash, Instacart, Ticketmaster, Netflix, Disney+, Apple, Samsung, Bank of America, Planet Fitness

━━━ PREFERRED SOURCES ━━━
Official first: CPSC, FDA, USDA, FTC, NHTSA, brand press releases, official promo pages
Strong secondary: Reuters, AP, Axios, CNBC, USA Today, People, Good Housekeeping, Consumer Reports, AARP, The Krazy Coupon Lady, Nation's Restaurant News`;
}

const SEARCH_TOOL_DECLARATION = {
  functionDeclarations: [
    {
      name: "search_news",
      description:
        "Search for recent news articles on any topic. Returns titles, descriptions, and publish dates. You can call this multiple times per turn to search in parallel.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: {
            type: "STRING",
            description:
              "The search query. Be specific and creative. Include brand names, dates, deal types, or categories.",
          },
        },
        required: ["query"],
      },
    },
  ],
};

// ─── Search backends ──────────────────────────────────────────────────────────

async function braveSearch(query, apiKey, count = 10) {
  const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}&freshness=pw`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((item) => ({
    title: item.title,
    sourceUrl: item.url,
    rawSummary: item.description || "",
    publishedAt: (() => {
      if (!item.age) return null;
      const d = new Date(item.age);
      return isNaN(d.getTime()) ? new Date().toISOString() : item.age;
    })(),
  }));
}

export async function tavilySearch(query, apiKey, count = 10) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      topic: "news",
      days: 7,
      max_results: count,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((item) => ({
    title: item.title,
    sourceUrl: item.url,
    rawSummary: item.content || "",
    publishedAt: item.published_date || null,
  }));
}

async function googleNewsSearch(query, count = 10) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRssItems(xml).slice(0, count);
}

// Weighted round-robin: Brave gets 2 calls for every 1 Tavily call,
// matching their free quota ratio (2000 vs 1000) so both exhaust together.
let _searchCounter = 0;

export async function executeSearch(query, { braveKey, tavilyKey, count = 10 }) {
  const backends = [];
  if (braveKey) backends.push((q) => braveSearch(q, braveKey, count));
  if (braveKey) backends.push((q) => braveSearch(q, braveKey, count)); // 2:1 weight
  if (tavilyKey) backends.push((q) => tavilySearch(q, tavilyKey, count));

  if (backends.length > 0) {
    const start = _searchCounter % backends.length;
    _searchCounter++;
    for (let i = 0; i < backends.length; i++) {
      const pick = backends[(start + i) % backends.length];
      const results = await pick(query).catch(() => []);
      if (results.length > 0) return results;
    }
  }

  return googleNewsSearch(query, count).catch(() => []);
}

function trimForAgent(results) {
  return results.slice(0, 10).map((r) => ({
    title: r.title,
    description: (r.rawSummary || "").slice(0, 160),
    published: r.publishedAt || "",
  }));
}

function buildDirectSearchQueries() {
  const now = new Date();
  const monthYear = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const year = now.getFullYear();

  return [
    `Aldi creme brulee recall glass contamination ${monthYear}`,
    `Zapp's Dirty potato chips recall salmonella ${monthYear}`,
    `Good & Gather snack mix recall salmonella ${monthYear}`,
    `Aldi Walmart frozen pizza salmonella alert ${monthYear}`,
    `Best Buy Gourmia pressure cooker warning burn hazard ${year}`,
    `Vive Health adult bed rails recall deaths CPSC ${year}`,
    `White Castle BOGO combo meals May 9 11 ${year}`,
    `Raising Cane's free box combo with purchase May 10 11 ${year}`,
    `Denny's $10 off $30 orders code MOMDAY May 9 11 ${year}`,
    `Fazoli's free pasta entree purchase code MOTHER26 Mother's Day ${year}`,
    `Scooter's Coffee BOGO drinks May 7 10 after 11 AM ${year}`,
    `Aroma Joe's free 24 oz iced drink May 10 ${year}`,
    `Arby's BOGO sandwiches May 8 10 app ${year}`,
    `Pizza Hut heart shaped pizza Mother's Day ${monthYear}`,
    `Baskin Robbins BOGO scoop rewards May 9 ${year}`,
    `7 Brew free koozie Mother's Day May 10 ${year}`,
    `Krispy Kreme Mother's Day minis box May ${year}`,
    `Krispy Kreme 16 count Minis for Mom box May 7 10 ${year}`,
    `Shake Shack free burgers every week May ${year}`,
    `Shake Shack free ShackBurger nurses May 4 12 purchase ${year}`,
    `McDonald's $2.50 McDouble backlash customers say not cheap ${monthYear}`,
    `McDonald's value menu 10 items under $3 ${monthYear}`,
    `Burger King beef cost warning prices rising ${monthYear}`,
    `Wendy's sweet and sour sauce returns customer uproar ${monthYear}`,
    `Chipotle $2.50 tacos June 2 ${year}`,
    `Costco hot dog combo water option ${monthYear}`,
    `Subway free Poppi drink Sub Club May 7 ${year}`,
    `McDonald's refreshers crafted sodas launching nationwide ${year}`,
    `Sweetgreen wraps launch May 6 ${year}`,
    `Williams Sonoma free cooking classes every Sunday May ${year}`,
    `Regal $1 movie tickets summer movie express June 1 ${year}`,
    `Planet Fitness free summer pass teens sign up May 18 ${year}`,
    `Starbucks free drink offer ${monthYear}`,
    `McDonald's deal BOGO ${monthYear}`,
    `Chipotle deal offer ${monthYear}`,
    `Dunkin free coffee ${monthYear}`,
    `restaurant free food teachers nurses ${monthYear}`,
    `Costco Walmart Target deal promotion ${monthYear}`,
    `CPSC product recall ${monthYear}`,
    `FDA food recall ${monthYear}`,
    `USDA food recall ${monthYear}`,
    `consumer class action settlement brand ${year}`,
    `retail data breach customer ${year}`,
    `FTC scam alert seniors ${monthYear}`,
    `major brand policy change fee increase ${monthYear}`,
    `Netflix Disney+ subscription price increase ${year}`,
  ];
}

async function runDirectSearchFallback(searchFn, { maxQueries = 60 } = {}) {
  const queries = buildDirectSearchQueries().slice(0, maxQueries);
  const allArticles = [];
  const seenUrls = new Set();
  const batchSize = 4;

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map((query) => searchFn(query).catch(() => [])));

    for (const [resultIndex, result] of settled.entries()) {
      if (result.status !== "fulfilled") continue;
      const query = batch[resultIndex] || "";
      for (const article of result.value || []) {
        if (!article?.title || !article?.sourceUrl) continue;
        const key = article.sourceUrl.toLowerCase().replace(/[?#].*$/, "");
        if (seenUrls.has(key)) continue;
        seenUrls.add(key);
        allArticles.push({
          ...article,
          rawSummary: [article.rawSummary, query].filter(Boolean).join(" "),
        });
      }
    }

    if (i + batchSize < queries.length) await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`[agent] Direct search fallback found ${allArticles.length} articles`);
  return allArticles;
}

// ─── Gemini agentic loop ──────────────────────────────────────────────────────

async function runGeminiAgent(geminiKey, searchFn, { maxRounds = 20 } = {}) {
  const allArticles = [];
  const systemPrompt = buildSystemPrompt();
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: "Start searching for today's best consumer deals, alerts, and news. Be creative — search whatever you think will find good stories. You can search multiple things at once.",
        },
      ],
    },
  ];

  for (let round = 0; round < maxRounds; round++) {
    const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        tools: [SEARCH_TOOL_DECLARATION],
        tool_config: { function_calling_config: { mode: "AUTO" } },
        generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) { console.warn("[agent] Gemini rate limited — stopping early with collected articles"); break; }
      throw new Error(`Gemini ${res.status}: ${body.slice(0, 120)}`);
    }

    const data = await res.json();
    const modelContent = data.candidates?.[0]?.content;
    if (!modelContent) break;

    contents.push(modelContent);

    const funcCalls = (modelContent.parts || []).filter((p) => p.functionCall);
    if (funcCalls.length === 0) break; // No tool calls → agent is done

    // Execute all calls in parallel
    const callResults = await Promise.all(
      funcCalls.map(async ({ functionCall: { name, args } }) => {
        if (name !== "search_news" || !args?.query) return { name, results: [] };
        console.log(`[agent] Searching: "${args.query}"`);
        const results = await searchFn(args.query);
        allArticles.push(...results);
        return { name, results };
      })
    );

    // Send all function responses back in one user turn
    contents.push({
      role: "user",
      parts: callResults.map(({ name, results }) => ({
        functionResponse: {
          name,
          response: { results: trimForAgent(results), count: results.length },
        },
      })),
    });

    await new Promise((r) => setTimeout(r, 2000));
  }

  return allArticles;
}

// ─── Groq agentic loop (OpenAI-compatible tool calling) ──────────────────────

// llama-3.3-70b-versatile handles tool calling reliably; 8b-instant fails with 400s
const GROQ_AGENT_MODEL = "llama-3.3-70b-versatile";

// Keep only the system prompt + the last N rounds of messages to prevent
// the accumulated tool history from growing large enough to trigger a 413.
function trimGroqMessages(messages, keepRounds = 3) {
  const system = messages[0]; // always first
  const rest = messages.slice(1);
  // Each round = 1 assistant msg + N tool msgs. Keep the tail.
  // We over-keep slightly by just slicing to the last keepRounds*4 messages.
  const tail = rest.slice(-(keepRounds * 4));
  // Groq requires tool messages to be preceded by the assistant message that called them.
  // Find the first assistant message in tail and start from there.
  const firstAssistant = tail.findIndex((m) => m.role === "assistant");
  return [system, ...(firstAssistant >= 0 ? tail.slice(firstAssistant) : tail)];
}

async function runGroqAgent(groqKey, searchFn, { maxRounds = 20 } = {}) {
  const allArticles = [];
  const systemPrompt = buildSystemPrompt();
  let messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content:
        "Start searching for today's best consumer deals, alerts, and news. Be creative. You can search multiple things at once.",
    },
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "search_news",
        description:
          "Search for recent news articles on any topic. Returns titles, descriptions, and publish dates.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The search query. Be specific and creative.",
            },
          },
          required: ["query"],
        },
      },
    },
  ];

  for (let round = 0; round < maxRounds; round++) {
    // Trim history before each call so accumulated tool results don't cause 413
    const sendMessages = messages.length > 10 ? trimGroqMessages(messages) : messages;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_AGENT_MODEL,
        messages: sendMessages,
        tools,
        tool_choice: "auto",
        temperature: 0.8,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429 || res.status === 413 || res.status === 400) {
        console.warn(`[agent] Groq ${res.status} — stopping early with ${allArticles.length} collected articles`);
        break;
      }
      throw new Error(`Groq ${res.status}: ${body.slice(0, 120)}`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) break;

    messages.push(msg);

    if (!msg.tool_calls?.length) break; // No tool calls → agent is done

    // Execute all tool calls in parallel
    const callResults = await Promise.all(
      msg.tool_calls.map(async (call) => {
        let query;
        try {
          query = JSON.parse(call.function.arguments).query;
        } catch {
          return { id: call.id, results: [] };
        }
        if (!query) return { id: call.id, results: [] };
        console.log(`[agent] Searching: "${query}"`);
        const results = await searchFn(query);
        allArticles.push(...results);
        return { id: call.id, results };
      })
    );

    // Send all tool results back
    for (const { id, results } of callResults) {
      messages.push({
        role: "tool",
        tool_call_id: id,
        content: JSON.stringify({
          results: trimForAgent(results),
          count: results.length,
        }),
      });
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return allArticles;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function agentSearch({
  braveKey,
  tavilyKey,
  geminiKey,
  groqKey,
  progress,
  maxRounds = 15,
} = {}) {
  const searchFn = (query) => executeSearch(query, { braveKey, tavilyKey });

  if (geminiKey) {
    try {
      progress?.("Agent searching for stories…", 8);
      const results = await runGeminiAgent(geminiKey, searchFn, { maxRounds });
      if (results.length > 0) return results;
    } catch (e) {
      console.warn("[agent] Gemini failed:", e.message);
    }
  }

  if (groqKey) {
    progress?.("Agent searching for stories…", 8);
    const results = await runGroqAgent(groqKey, searchFn, { maxRounds });
    if (results.length > 0) return results;
  }

  progress?.("Searching news feeds directly…", 12);
  return runDirectSearchFallback(searchFn);
}
