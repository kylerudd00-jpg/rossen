import { scoreCandidate } from "../lib/scoring.mjs";

export function rankCandidates(candidates, limit = 5) {
  const scored = candidates
    .map(scoreCandidate)
    .sort((left, right) => right.weightedTotal - left.weightedTotal);

  const preferred = scored.filter((candidate) => candidate.selected);
  const fallback = scored.filter((candidate) => !candidate.selected);

  const selected = [];
  const brandCounts = new Map();

  for (const candidate of preferred) {
    const brandKey = candidate.brand || "Unknown";
    const cap = brandKey === "Unknown" ? 1 : 2;
    const currentCount = brandCounts.get(brandKey) || 0;

    if (currentCount >= cap) {
      continue;
    }

    selected.push(candidate);
    brandCounts.set(brandKey, currentCount + 1);

    if (selected.length >= limit) {
      break;
    }
  }

  if (selected.length < limit) {
    for (const candidate of [...preferred, ...fallback]) {
      if (selected.find((item) => item.id === candidate.id)) {
        continue;
      }

      selected.push(candidate);

      if (selected.length >= limit) {
        break;
      }
    }
  }

  return selected;
}
