export const queueFields = [
  "discovered_at",
  "source_url",
  "source_domain",
  "title",
  "raw_summary",
  "brand",
  "category",
  "score",
  "selected_for_today",
  "final_headline",
  "final_subtext",
  "image_query",
  "canva_design_id",
  "export_url",
  "emailed_at",
  "approval_status",
];

export const tables = [
  {
    name: "sources",
    purpose: "Registry of approved inputs and ingestion rules.",
    keyFields: "name, source_type, domain, fetch_method, priority_weight, enabled",
  },
  {
    name: "candidate_items",
    purpose: "Raw discovered stories before scoring or selection.",
    keyFields: "source_url, canonical_url, title, published_at, raw_summary, brand, category",
  },
  {
    name: "scored_items",
    purpose: "Per-story ranking output and selection decisions.",
    keyFields: "candidate_id, scorecard, weighted_total, selected_for_today, selection_reason",
  },
  {
    name: "content_outputs",
    purpose: "Final AI-generated summary and headline copy.",
    keyFields: "candidate_id, summary_1_sentence, final_headline, final_subtext, image_query",
  },
  {
    name: "render_jobs",
    purpose: "Rendering state across Canva and fallback exporters.",
    keyFields: "candidate_id, render_provider, template_id, render_status, export_url",
  },
  {
    name: "delivery_batches",
    purpose: "Daily package tracking for email delivery and approvals.",
    keyFields: "batch_date, recipient, status, item_count, email_sent_at",
  },
];
