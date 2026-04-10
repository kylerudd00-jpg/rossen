import { fetchGoogleNewsCandidates } from "../sources/googleNews.mjs";
import { fetchManualCandidates } from "../sources/manual.mjs";

export async function ingestCandidates(env) {
  const [googleNews, manual] = await Promise.all([
    fetchGoogleNewsCandidates(env),
    fetchManualCandidates(),
  ]);

  return [...manual, ...googleNews];
}
