const truthyValues = new Set(["1", "true", "yes", "on"]);

export function getEnv() {
  const env = {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    resendApiKey: process.env.RESEND_API_KEY || "",
    recipientEmail: process.env.RECIPIENT_EMAIL || "",
    senderEmail: process.env.SENDER_EMAIL || "",
    renderProvider: process.env.RENDER_PROVIDER || "local-svg",
    outputDir: process.env.PIPELINE_OUTPUT_DIR || "pipeline/output",
    maxCandidatesPerQuery: Number(process.env.MAX_CANDIDATES_PER_QUERY || 5),
    topStoryCount: Number(process.env.TOP_STORY_COUNT || 5),
    dryRun: truthyValues.has(String(process.env.DRY_RUN || "").toLowerCase()),
  };

  return env;
}

export function hasAnthropic(env) {
  return Boolean(env.anthropicApiKey);
}

export function hasResend(env) {
  return Boolean(env.resendApiKey && env.recipientEmail && env.senderEmail);
}
