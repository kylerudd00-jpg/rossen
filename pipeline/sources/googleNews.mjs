import { discoveryQueries } from "../config/discoveryQueries.mjs";
import { fetchText } from "../lib/http.mjs";
import { parseRssItems } from "../lib/rss.mjs";
import { summarizeText } from "../lib/text.mjs";

function inferBrand(text) {
  const value = text.toLowerCase();
  if (/\bcostco\b/.test(value)) return "Costco";
  if (/\bwalmart\b/.test(value)) return "Walmart";
  if (/\btarget\b/.test(value)) return "Target";
  if (/\bsam'?s club\b/.test(value)) return "Sam's Club";
  if (/\bsubway\b/.test(value)) return "Subway";
  if (/\bmcdonald'?s?\b/.test(value)) return "McDonald's";
  if (/\btaco bell\b/.test(value)) return "Taco Bell";
  if (/\bwendy'?s\b/.test(value)) return "Wendy's";
  if (/\btrader joe'?s\b/.test(value)) return "Trader Joe's";
  if (/\baldi\b/.test(value)) return "Aldi";
  return "Unknown";
}

function inferCategory(text) {
  const value = text.toLowerCase();
  if (value.includes("recall") || value.includes("warning")) return "recall / warning";
  if (value.includes("bogo") || value.includes("free")) return "fast food promo";
  if (value.includes("price drop") || value.includes("discount")) return "savings / price drop";
  if (value.includes("reopen")) return "shopper alert";
  return "shopper alert";
}

function toCandidate(item, query) {
  const combined = `${item.title} ${item.rawSummary}`;

  return {
    id: `${query.id}-${encodeURIComponent(item.sourceUrl)}`,
    title: item.title,
    sourceUrl: item.sourceUrl,
    sourceDomain: new URL(item.sourceUrl).hostname.replace(/^www\./, ""),
    publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    rawSummary: summarizeText(item.rawSummary || item.title, 220),
    brand: inferBrand(combined),
    category: inferCategory(combined),
    discoveryQuery: query.label,
  };
}

export async function fetchGoogleNewsCandidates(env) {
  const allItems = [];

  for (const query of discoveryQueries) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query.query)}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchText(url);
    const items = parseRssItems(xml)
      .slice(0, env.maxCandidatesPerQuery)
      .map((item) => toCandidate(item, query));

    allItems.push(...items);
  }

  return allItems;
}
