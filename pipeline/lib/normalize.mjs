const brandMap = new Map([
  ["sam’s club", "Sam's Club"],
  ["sams club", "Sam's Club"],
  ["mcdonalds", "McDonald's"],
  ["trader joes", "Trader Joe's"],
  ["bedbath and beyond", "Bed Bath & Beyond"],
]);

const brandPriority = new Map([
  ["Costco", 10],
  ["Walmart", 10],
  ["Target", 10],
  ["Sam's Club", 10],
  ["Aldi", 9],
  ["Good & Gather", 9],
  ["Trader Joe's", 9],
  ["Best Buy", 9],
  ["McDonald's", 9],
  ["Chipotle", 9],
  ["Shake Shack", 9],
  ["Krispy Kreme", 9],
  ["Planet Fitness", 9],
  ["Taco Bell", 9],
  ["Wendy's", 9],
  ["Subway", 8],
  ["Pizza Hut", 8],
  ["Baskin-Robbins", 8],
  ["White Castle", 8],
  ["Regal Cinemas", 8],
  ["Williams Sonoma", 8],
  ["Sweetgreen", 8],
  ["7 Brew", 7],
  ["Zapp's", 7],
  ["Dirty Chips", 7],
  ["Utz", 7],
  ["Vive Health", 7],
  ["Thermos", 7],
  ["Gourmia", 7],
  ["Bed Bath & Beyond", 8],
]);

export function normalizeBrand(brand) {
  const value = (brand || "").trim();
  if (!value) {
    return "";
  }

  const key = value.toLowerCase();
  return brandMap.get(key) || value;
}

export function getBrandPriority(brand) {
  const normalized = normalizeBrand(brand);
  const direct = brandPriority.get(normalized);
  if (direct) return direct;

  const lower = normalized.toLowerCase();
  for (const [name, priority] of brandPriority) {
    if (name.toLowerCase() === lower) return priority;
  }
  return 3;
}

export function isTrustedDomain(sourceDomain) {
  return !sourceDomain.includes("affiliate");
}
