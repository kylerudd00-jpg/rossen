import { sourceRegistry } from "./config/sourceRegistry.mjs";
import { mockCandidates } from "./data/mockCandidates.mjs";
import { cleanupCandidates } from "./stages/cleanup.mjs";
import { rankCandidates } from "./stages/rank.mjs";
import { writeSelectedStories } from "./stages/write.mjs";

const cleaned = cleanupCandidates(mockCandidates);
const ranked = rankCandidates(cleaned);
const written = writeSelectedStories(ranked);

const output = {
  ranAt: new Date().toISOString(),
  sourceCount: sourceRegistry.length,
  candidateCount: mockCandidates.length,
  cleanedCount: cleaned.length,
  selectedCount: written.length,
  selectedStories: written.map((story, index) => ({
    position: index + 1,
    brand: story.brand,
    headline: story.finalHeadline,
    subtext: story.finalSubtext,
    summary: story.summary1Sentence,
    weightedTotal: story.weightedTotal,
    sourceUrl: story.sourceUrl,
  })),
};

console.log(JSON.stringify(output, null, 2));
