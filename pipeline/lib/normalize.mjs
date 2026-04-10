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
  ["Trader Joe's", 9],
  ["McDonald's", 9],
  ["Taco Bell", 9],
  ["Wendy's", 9],
  ["Subway", 8],
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
  return brandPriority.get(normalizeBrand(brand)) || 3;
}

export function isTrustedDomain(sourceDomain) {
  return !sourceDomain.includes("affiliate");
}
