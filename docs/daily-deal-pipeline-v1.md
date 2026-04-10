# Daily Deal Pipeline V1

## Objective

Build a daily automation system that finds the strongest consumer deal stories, selects the best five for single-slide social posts, renders finished graphics from a fixed template, and sends the final batch for manual approval.

## Success condition

Each morning, one batch is delivered containing:

- 5 finished 1080x1080 graphics
- 5 source summaries
- 5 source URLs
- 5 final headline blocks
- optional subtext when useful

## Pipeline stages

### 1. Source ingestion

Collect candidate stories from:

- official retailer savings and promo pages
- official restaurant promo pages
- official newsroom and press-release pages
- recall and government warning sources
- Google News and web search
- selected X accounts or keyword searches
- optional manually supplied URLs

### 2. Cleanup

For each candidate:

- extract title, URL, source domain, date, and body summary
- normalize brand names and categories
- remove duplicates and stale items
- reject affiliate junk or weak sources

### 3. AI ranking

Score each story on:

- brand recognition
- savings clarity
- urgency
- scarcity
- one-slide potential
- emotional pull
- mass-market relevance
- confidence and factual clarity

Keep the top 5 while avoiding overconcentration from a single brand unless the day is unusually strong.

### 4. AI writing

Generate:

- one-sentence summary
- final headline
- optional subtext
- image guidance
- short reason selected

### 5. Rendering

Preferred:

- Canva Enterprise
- Brand Templates
- Autofill API
- asynchronous job polling

Fallback:

- local HTML/CSS or image renderer that mirrors the Canva template

### 6. Delivery

Send one daily email that includes:

- the rendered images
- summaries
- source URLs
- final on-image text

## Recommended V1 implementation

- custom Node.js job
- Airtable or Supabase for storage
- Resend for email
- Canva render provider if available
- matched local renderer if Canva is blocked

## Product rule

This system is review-first.

It should automate:

- research
- ranking
- writing
- rendering
- delivery

It should not automate:

- final posting
- carousel generation
- unsupported scraping-led social ingestion
