function decodeHtml(text) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#39;", "'");
}

function stripTags(text) {
  return decodeHtml(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

export function parseRssItems(xml) {
  const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  return itemBlocks.map((match, index) => {
    const item = match[1];

    return {
      id: `rss-${index + 1}`,
      title: extractTag(item, "title"),
      sourceUrl: extractTag(item, "link"),
      rawSummary: extractTag(item, "description"),
      publishedAt: extractTag(item, "pubDate"),
    };
  });
}
