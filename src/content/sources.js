export const sourceGroups = [
  {
    title: "Official retailer and restaurant pages",
    rule: "Primary",
    description: "These should be the backbone of the pipeline because they are closest to the source and best for promos, new launches, and weekly savings.",
    examples: [
      "Costco and Sam's Club savings pages",
      "Walmart and Target deal hubs",
      "McDonald's, Taco Bell, Wendy's, Subway promo/news pages",
      "Retailer newsroom and weekly ad pages",
    ],
  },
  {
    title: "Recall and warning sources",
    rule: "Primary",
    description: "These sources catch high-urgency consumer stories that often perform well when the headline is direct and clear.",
    examples: ["FDA recalls", "USDA FSIS recalls", "CPSC safety notices", "Brand-issued recall pages"],
  },
  {
    title: "News and discovery",
    rule: "Supporting",
    description: "Use search and news tools to discover timely stories, but only keep items that land on acceptable domains and pass trust checks.",
    examples: ["Google News", "Controlled web search", "Press release search", "Manual URLs you provide"],
  },
  {
    title: "X API inputs",
    rule: "Supporting",
    description: "Pull recent posts from selected brand accounts or relevant keyword searches when they help uncover timely promos, shopper alerts, or launch news.",
    examples: ["Selected brand accounts", "Trusted deal accounts", "Keyword searches for recalls or BOGO promos"],
  },
];

export const sourceRows = [
  {
    source: "Costco / warehouse deal pages",
    type: "Official retail",
    reason: "Warehouse finds and member savings are core account content.",
    priority: "High",
  },
  {
    source: "Walmart and Target deal hubs",
    type: "Official retail",
    reason: "Mass-market, high-recognition stories that often convert into strong headlines.",
    priority: "High",
  },
  {
    source: "Sam's Club savings and news",
    type: "Official retail",
    reason: "Strong warehouse and limited-time membership content.",
    priority: "High",
  },
  {
    source: "McDonald's / Taco Bell / Wendy's promos",
    type: "Official restaurant",
    reason: "Fast-food promos are simple, urgent, and highly understandable.",
    priority: "High",
  },
  {
    source: "FDA / USDA FSIS / CPSC",
    type: "Government recall",
    reason: "High-signal warnings and recalls with strong urgency.",
    priority: "High",
  },
  {
    source: "Google News and web search",
    type: "Discovery",
    reason: "Useful for finding reopening stories, launches, and major shopper news early.",
    priority: "Medium",
  },
  {
    source: "Selected X accounts",
    type: "Social API",
    reason: "Good for fresh promos and early signals when used with a controlled list.",
    priority: "Medium",
  },
];
