import path from "node:path";
import { slugify } from "../../lib/text.mjs";
import { ensureDir, writeText } from "../../lib/fs.mjs";

const brandColors = new Map([
  ["Costco", "#e31837"],
  ["Walmart", "#0071ce"],
  ["Target", "#cc0000"],
  ["Sam's Club", "#0060a9"],
  ["Subway", "#008c15"],
  ["McDonald's", "#ffc72c"],
  ["Taco Bell", "#702082"],
  ["Wendy's", "#e2203a"],
  ["Bed Bath & Beyond", "#1d4ed8"],
]);

function colorForBrand(brand) {
  return brandColors.get(brand) || "#f97316";
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderSvg(story) {
  const accent = colorForBrand(story.brand);
  const headline = escapeXml(story.finalHeadline);
  const subtext = escapeXml(story.finalSubtext || "");
  const brand = escapeXml(story.brand);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1080" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1080" y2="1080" gradientUnits="userSpaceOnUse">
      <stop stop-color="${accent}"/>
      <stop offset="0.6" stop-color="#111827"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" rx="36" fill="url(#bg)"/>
  <rect x="70" y="70" width="940" height="940" rx="28" fill="rgba(2,6,23,0.42)" stroke="rgba(255,255,255,0.18)"/>
  <text x="110" y="160" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" letter-spacing="4">${brand.toUpperCase()}</text>
  <text x="110" y="380" fill="white" font-family="Arial Black, Helvetica, sans-serif" font-size="92" font-weight="900">
    <tspan x="110" dy="0">${headline}</tspan>
  </text>
  <rect x="110" y="730" width="860" height="4" fill="${accent}"/>
  <text x="110" y="800" fill="white" opacity="0.9" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="600">${subtext}</text>
  <text x="110" y="930" fill="white" opacity="0.7" font-family="Arial, Helvetica, sans-serif" font-size="28">deal pipeline preview</text>
</svg>`;
}

export async function renderLocally(stories, env, batchDir) {
  const renderDir = path.join(batchDir, "renders");
  await ensureDir(renderDir);

  const rendered = [];

  for (const story of stories) {
    const fileName = `${slugify(story.brand)}-${slugify(story.finalHeadline)}.svg`;
    const filePath = path.join(renderDir, fileName);
    await writeText(filePath, renderSvg(story));
    rendered.push({
      ...story,
      renderProvider: "local-svg",
      exportPath: filePath,
      exportUrl: filePath,
    });
  }

  return rendered;
}
