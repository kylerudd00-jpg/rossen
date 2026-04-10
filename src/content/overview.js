export const deliveryTargets = ["5 daily graphics", "Single-slide only", "Manual approval", "Email package"];

export const dailyOutputs = [
  "5 finished graphics",
  "5 source summaries",
  "5 source URLs",
  "5 final headline blocks",
  "Optional subtext when it helps clarity",
];

export const integrationStatus = [
  {
    label: "Research",
    value: "Automated",
    note: "Controlled source ingestion, dedupe, freshness checks, and AI ranking.",
  },
  {
    label: "Rendering",
    value: "Canva-first",
    note: "Prefer Canva Enterprise Autofill, but keep a fallback renderer so V1 can ship.",
  },
  {
    label: "Delivery",
    value: "Review-first",
    note: "Email the finished assets and source context. No automatic publishing.",
  },
];

export const productPrinciples = [
  {
    title: "Consumer-first signal",
    body: "Only keep stories that matter to normal shoppers, are easy to understand fast, and feel worth stopping for on a social feed.",
  },
  {
    title: "One-slide clarity",
    body: "Every story must work as a single static image with a bold headline and optional supporting line.",
  },
  {
    title: "Practical over elegant",
    body: "The system should optimize for delivering five strong graphics every morning rather than chasing a perfect architecture too early.",
  },
];

export const architectureLayers = [
  {
    name: "Scheduler",
    description: "Runs the pipeline every morning on a fixed schedule with retries and alerting.",
  },
  {
    name: "Ingestion",
    description: "Collects candidate stories from official sources, web/news search, and selected X accounts.",
  },
  {
    name: "AI decisioning",
    description: "Scores each candidate for one-slide potential and writes final text for the winners.",
  },
  {
    name: "Rendering",
    description: "Maps story data into either Canva Autofill fields or a local matched template renderer.",
  },
  {
    name: "Delivery",
    description: "Packages the final batch into one email with images, summaries, source links, and approval context.",
  },
];

export const stageCards = [
  {
    step: "Stage 1",
    status: "Core",
    title: "Source ingestion",
    summary: "Pull candidate stories from official retailer pages, promo pages, newsroom pages, recall/government sources, web/news search, and selected X inputs.",
    outputs: ["candidate items", "raw title", "URL", "publish date"],
  },
  {
    step: "Stage 2",
    status: "Core",
    title: "Cleanup and normalization",
    summary: "Canonicalize URLs, normalize brands, remove duplicates, reject stale or spammy items, and classify likely category.",
    outputs: ["brand", "category", "raw summary", "dedupe flags"],
  },
  {
    step: "Stage 3",
    status: "Core",
    title: "AI ranking",
    summary: "Score stories for brand strength, urgency, clarity, emotional pull, and one-slide potential, then keep the best five.",
    outputs: ["scorecard", "selection reason", "top five"],
  },
  {
    step: "Stage 4",
    status: "Core",
    title: "AI writing",
    summary: "Generate the one-sentence summary, final headline, optional subtext, image guidance, and the note about why the story made the cut.",
    outputs: ["summary", "headline", "subtext", "image guidance"],
  },
  {
    step: "Stage 5",
    status: "Dependent",
    title: "Graphic rendering",
    summary: "Inject the content into a fixed Canva template or the fallback renderer and export a 1080x1080 PNG.",
    outputs: ["render job", "export URL", "design ID"],
  },
  {
    step: "Stage 6",
    status: "Core",
    title: "Delivery",
    summary: "Send one daily package with the five graphics, source links, summaries, and the final on-image text for manual approval.",
    outputs: ["email batch", "attachments", "delivery log"],
  },
];
