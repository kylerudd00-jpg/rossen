export const scoreWeights = {
  brandRecognition: "0.20",
  savingsClarity: "0.18",
  urgency: "0.15",
  scarcity: "0.08",
  oneSlidePotential: "0.18",
  emotionalPull: "0.08",
  massMarketRelevance: "0.08",
  confidenceFactualClarity: "0.05",
};

export const scoreCriteria = [
  {
    key: "brandRecognition",
    label: "Brand recognition",
    goal: "Would most people know the brand instantly?",
    notes: "Reward Costco, Walmart, Target, Sam's Club, major grocery chains, and major food brands.",
  },
  {
    key: "savingsClarity",
    label: "Savings clarity",
    goal: "Is the shopper value obvious right away?",
    notes: "Prefer exact dollars, percentages, or unmistakable free-item language.",
  },
  {
    key: "urgency",
    label: "Urgency",
    goal: "Does the story expire soon or demand immediate attention?",
    notes: "Deadlines, limited windows, recalls, and warnings should score well.",
  },
  {
    key: "scarcity",
    label: "Scarcity",
    goal: "Does limited availability raise the stakes?",
    notes: "Warehouse finds, seasonal launches, and limited-time offers belong here.",
  },
  {
    key: "oneSlidePotential",
    label: "One-slide potential",
    goal: "Can the idea become a punchy headline with no extra context?",
    notes: "This is a gating criterion. Weak scores here should usually disqualify the story.",
  },
  {
    key: "emotionalPull",
    label: "Emotional pull",
    goal: "Will the story make someone stop scrolling?",
    notes: "Surprising perks, big names, and clear shopper pain relief help.",
  },
  {
    key: "massMarketRelevance",
    label: "Mass-market relevance",
    goal: "Does the story matter to normal U.S. shoppers?",
    notes: "Avoid niche products or specialized audiences.",
  },
  {
    key: "confidenceFactualClarity",
    label: "Confidence / factual clarity",
    goal: "How safe is it to summarize without stretching the facts?",
    notes: "Penalize rumor, weak sourcing, or confusing claims.",
  },
];
