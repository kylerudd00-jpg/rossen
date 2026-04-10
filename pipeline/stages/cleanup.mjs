import { normalizeBrand, isTrustedDomain } from "../lib/normalize.mjs";

function dedupeKey(candidate) {
  return `${candidate.title.toLowerCase()}|${normalizeBrand(candidate.brand).toLowerCase()}`;
}

export function cleanupCandidates(candidates) {
  const seen = new Set();

  return candidates
    .map((candidate) => ({
      ...candidate,
      brand: normalizeBrand(candidate.brand),
      stale: false,
      trusted: isTrustedDomain(candidate.sourceDomain),
    }))
    .filter((candidate) => {
      const key = dedupeKey(candidate);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .filter((candidate) => candidate.publishedAt >= "2026-04-02")
    .filter((candidate) => candidate.trusted);
}
