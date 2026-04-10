export async function deliverPreview(batch, env) {
  return {
    provider: "preview",
    recipient: env.recipientEmail || "not-configured",
    delivered: false,
    note: "Preview only. Configure Resend to send real daily emails.",
    items: batch.stories.map((story) => ({
      headline: story.finalHeadline,
      exportPath: story.exportPath,
      sourceUrl: story.sourceUrl,
    })),
  };
}
