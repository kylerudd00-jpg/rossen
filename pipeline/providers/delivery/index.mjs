import { hasResend } from "../../config/env.mjs";
import { deliverPreview } from "./preview.mjs";
import { deliverWithResend } from "./resend.mjs";

export async function deliverBatch(batch, env) {
  if (hasResend(env) && !env.dryRun) {
    return deliverWithResend(batch, env);
  }

  return deliverPreview(batch, env);
}
