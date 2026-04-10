import path from "node:path";
import { getEnv } from "./config/env.mjs";
import { ensureDir, writeJson } from "./lib/fs.mjs";
import { cleanupCandidates } from "./stages/cleanup.mjs";
import { ingestCandidates } from "./stages/ingest.mjs";
import { rankAndWriteStories } from "./providers/ai/index.mjs";
import { renderStories } from "./providers/render/index.mjs";
import { deliverBatch } from "./providers/delivery/index.mjs";

async function main() {
  const env = getEnv();
  const batchDate = new Date().toISOString().slice(0, 10);
  const batchDir = path.join(process.cwd(), env.outputDir, batchDate);
  await ensureDir(batchDir);

  const ingested = await ingestCandidates(env);
  const cleaned = cleanupCandidates(ingested);
  const aiResult = await rankAndWriteStories(cleaned, env);
  const stories = await renderStories(aiResult.stories, env, batchDir);

  const batch = {
    batchDate,
    ingestedCount: ingested.length,
    cleanedCount: cleaned.length,
    selectedCount: stories.length,
    aiProvider: aiResult.provider,
    renderProvider: env.renderProvider,
    stories,
  };

  const delivery = await deliverBatch(batch, env);

  await writeJson(path.join(batchDir, "batch.json"), batch);
  await writeJson(path.join(batchDir, "delivery.json"), delivery);

  console.log(
    JSON.stringify(
      {
        batchDate,
        ingestedCount: ingested.length,
        cleanedCount: cleaned.length,
        selectedCount: stories.length,
        aiProvider: aiResult.provider,
        renderProvider: env.renderProvider,
        deliveryProvider: delivery.provider,
        delivered: delivery.delivered,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
