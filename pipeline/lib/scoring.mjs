import { scoreKeys, weights } from "../config/weights.mjs";
import { getBrandPriority } from "./normalize.mjs";

function clamp(value, min = 1, max = 10) {
  return Math.max(min, Math.min(max, value));
}

function keywordScore(text, keywords, high = 9, fallback = 4) {
  const haystack = text.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword)) ? high : fallback;
}

// Articles with at least one concrete fact score higher and are more likely
// to produce a specific, usable headline.
function concreteScore(text) {
  const t = text.toLowerCase();
  const hasPrice = /\$\d|\d+%\s+off|\d+\s+cents?\b/.test(t);
  const hasDate = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d|\bthrough\b|\buntil\b|\bdeadline\b|\bend[s]?\s+(on|at|by)/.test(t);
  const hasDanger = /\bsalmonella\b|\blisteria\b|\bfire\s+hazard\b|\bburn\b|\bchoking\b|\binjur|\bdeath\b|\bvision\b/.test(t);
  const hasWho = /\bteachers?\b|\bnurses?\b|\bseniors?\b|\bveterans?\b|\bmilitary\b|\bstudents?\b|\bhealth\s+care\b|\bfirst\s+responders?\b/.test(t);
  const hasProduct = /\b(taco|burger|pizza|coffee|drink|sandwich|fries|wings|bowl|meal|item|chicken|steak|donut|bagel|cookie|cake|ice cream|hot dog)\b/.test(t);
  const count = [hasPrice, hasDate, hasDanger, hasWho, hasProduct].filter(Boolean).length;
  // 0 concrete signals = 2, 1 = 5, 2+ = 9
  return count === 0 ? 2 : count === 1 ? 5 : 9;
}

export function scoreCandidate(candidate) {
  const mergedText = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  const brandRecognition = clamp(getBrandPriority(candidate.brand));
  const savingsClarity = keywordScore(mergedText, ["free", "bogo", "discount", "price drop", "$", "%", "gift card"], 9, 5);
  const urgency = keywordScore(mergedText, ["today", "ends", "limited", "recall", "warning", "deadline", "weekend"], 9, 4);
  const scarcity = keywordScore(mergedText, ["limited", "warehouse", "seasonal", "while supplies last", "find"], 8, 4);
  const oneSlidePotential = keywordScore(mergedText, ["alert", "bogo", "reopening", "recall", "price drop", "gift card", "sued", "lawsuit", "breach", "settlement"], 9, 5);
  const emotionalPull = keywordScore(mergedText, ["recall", "warning", "free", "reopening", "deal", "sued", "scam"], 8, 4);
  const massMarketRelevance = clamp(Math.round((brandRecognition + keywordScore(mergedText, ["national", "nationwide", "major"], 8, 6)) / 2));
  // Concrete facts = higher confidence the AI can write a specific headline
  const confidenceFactualClarity = clamp(concreteScore(mergedText));
  // Penalize vague roundup-style framing (not consumer lawsuits/investigations)
  const genericNewsPenalty = ["best deals", "top deals", "deals include", "deals and freebies", "various chains", "appreciation week deals"].some(
    (phrase) => mergedText.includes(phrase),
  )
    ? 2.5
    : 0;

  const scores = {
    brandRecognition,
    savingsClarity,
    urgency,
    scarcity,
    oneSlidePotential,
    emotionalPull,
    massMarketRelevance,
    confidenceFactualClarity,
  };

  const weightedTotal = Number(
    scoreKeys
      .reduce((sum, key) => sum + scores[key] * weights[key], 0)
      - genericNewsPenalty
  );

  return {
    ...candidate,
    normalizedBrand: candidate.brand,
    scores,
    weightedTotal: Number(weightedTotal.toFixed(2)),
    selected: confidenceFactualClarity >= 5 && oneSlidePotential >= 6,
  };
}
