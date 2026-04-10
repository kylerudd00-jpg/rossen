export const buildMilestones = [
  {
    phase: "Phase 1",
    title: "Ship the first working pipeline",
    tasks: [
      "Create the source registry and ingest 5-10 high-value sources.",
      "Implement cleanup, dedupe, brand normalization, and freshness filtering.",
      "Add the ranking prompt and keep only the top five stories.",
      "Generate final summary, headline, and subtext for each winner.",
      "Render the graphics with the fallback template path if Canva is not ready yet.",
      "Email one daily review package with attachments and source context.",
    ],
  },
  {
    phase: "Phase 2",
    title: "Stabilize quality and repeatability",
    tasks: [
      "Tune source weights and rejection rules based on a week of real runs.",
      "Add manual URL injection for edge cases and late-breaking stories.",
      "Track approvals, misses, and false positives so prompts can improve.",
      "Add alerts for empty batches, render failures, and email delivery errors.",
    ],
  },
  {
    phase: "Phase 3",
    title: "Upgrade rendering and scale",
    tasks: [
      "Wire in Canva Enterprise Autofill and export job polling if the account is available.",
      "Add multiple template variants while keeping the same render payload contract.",
      "Expand source coverage gradually instead of broad scraping all at once.",
      "Layer in dashboards or operator controls only after the batch quality is consistently strong.",
    ],
  },
];
