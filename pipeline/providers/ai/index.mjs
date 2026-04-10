import { hasAnthropic } from "../../config/env.mjs";
import { rankAndWriteWithAnthropic } from "./anthropic.mjs";
import { rankAndWriteWithFallback } from "./fallback.mjs";

export async function rankAndWriteStories(candidates, env) {
  if (hasAnthropic(env)) {
    return rankAndWriteWithAnthropic(candidates, {
      apiKey: env.anthropicApiKey,
      limit: env.topStoryCount,
    });
  }

  return rankAndWriteWithFallback(candidates, {
    limit: env.topStoryCount,
  });
}
