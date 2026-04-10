import { scoreKeys, weights } from "../config/weights.mjs";
import { getBrandPriority, isTrustedDomain } from "./normalize.mjs";

function clamp(value, min = 1, max = 10) {
  return Math.max(min, Math.min(max, value));
}

function keywordScore(text, keywords, high = 9, fallback = 4) {
  const haystack = text.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword)) ? high : fallback;
}

export function scoreCandidate(candidate) {
  const mergedText = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();
  const brandRecognition = clamp(getBrandPriority(candidate.brand));
  const savingsClarity = keywordScore(mergedText, ["free", "bogo", "discount", "price drop", "$", "%", "gift card"], 9, 5);
  const urgency = keywordScore(mergedText, ["today", "ends", "limited", "recall", "warning", "deadline", "weekend"], 9, 4);
  const scarcity = keywordScore(mergedText, ["limited", "warehouse", "seasonal", "while supplies last", "find"], 8, 4);
  const oneSlidePotential = keywordScore(mergedText, ["alert", "bogo", "reopening", "recall", "price drop", "gift card"], 9, 5);
  const emotionalPull = keywordScore(mergedText, ["recall", "warning", "free", "reopening", "deal"], 8, 4);
  const massMarketRelevance = clamp(Math.round((brandRecognition + keywordScore(mergedText, ["national", "nationwide", "major"], 8, 6)) / 2));
  const confidenceFactualClarity = isTrustedDomain(candidate.sourceDomain) ? 8 : 2;
  const genericNewsPenalty = ["watchdog", "pressure", "process", "liability", "investigation", "lawsuit"].some(
    (keyword) => mergedText.includes(keyword),
  )
    ? 1.2
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
