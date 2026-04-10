import { rankCandidates } from "../../stages/rank.mjs";
import { writeSelectedStories } from "../../stages/write.mjs";

export async function rankAndWriteWithFallback(candidates, options = {}) {
  const ranked = rankCandidates(candidates, options.limit);
  const written = writeSelectedStories(ranked);

  return {
    provider: "heuristic-fallback",
    stories: written,
  };
}
