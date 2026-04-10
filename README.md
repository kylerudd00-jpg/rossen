# Deal Pipeline

This project is being shaped into a review-first daily content pipeline for consumer deal graphics.

## Product goal

Every morning, the system should:

- ingest deal and shopper-news candidates from controlled sources
- clean and deduplicate them
- rank them for one-slide social potential
- generate final headline copy
- render five finished static graphics
- deliver the batch for manual approval

## Current repo direction

The frontend now acts as a product brief and implementation control center for the V1 system. It captures:

- the target workflow
- the source strategy
- the scoring model
- the AI prompt logic
- the storage model
- the Canva rendering plan
- the fallback rendering path
- the recommended build order

## Recommended V1 stack

- orchestrator: Node.js scheduled job or GitHub Actions
- storage: Airtable or Supabase
- AI: one reliable JSON-friendly model for ranking and writing
- rendering: Canva Enterprise Autofill when available, otherwise a matched local template renderer
- delivery: Resend or equivalent email provider

## Canva note

The preferred render path uses Canva Brand Templates and Autofill APIs. That path depends on Canva Enterprise access and asynchronous job polling. The project is intentionally designed so a local renderer can be used first without changing the rest of the pipeline.

## Development

```bash
npm install
npm run dev
```

## Pipeline commands

Dry-run the pipeline with mock candidate data:

```bash
npm run pipeline:dry-run
```

Run the live pipeline using Google News RSS discovery, local SVG rendering, and preview delivery by default:

```bash
npm run pipeline:run
```

## Environment

Copy `.env.example` into your local environment and set the values you want to use.

- `ANTHROPIC_API_KEY`: enables model-based ranking and writing
- `RESEND_API_KEY`: enables real email delivery
- `RECIPIENT_EMAIL`: where the daily batch should go
- `SENDER_EMAIL`: verified sender for Resend
- `RENDER_PROVIDER`: `local-svg` or `canva`
- `PIPELINE_OUTPUT_DIR`: where batch artifacts are written
- `MAX_CANDIDATES_PER_QUERY`: cap per discovery query
- `TOP_STORY_COUNT`: desired daily batch size
- `DRY_RUN`: force preview delivery even when email credentials exist

## Next build steps

1. Add the actual ingestion jobs and source connectors.
2. Add the queue/database layer.
3. Add the AI scoring and writing services.
4. Add the render provider abstraction.
5. Add the daily email batch delivery job.
