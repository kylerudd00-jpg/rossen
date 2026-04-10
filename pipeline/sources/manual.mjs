import path from "node:path";
import { readJsonIfExists } from "../lib/fs.mjs";

export async function fetchManualCandidates() {
  const filePath = path.join(process.cwd(), "pipeline", "data", "manualCandidates.json");
  return readJsonIfExists(filePath, []);
}
