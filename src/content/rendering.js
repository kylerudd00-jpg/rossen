export const canvaPlan = [
  "Use fixed Canva Brand Templates with mapped fields for headline, subtext, and background image.",
  "Authenticate on behalf of a user in a Canva Enterprise organization.",
  "Create an autofill job, poll for completion, then create an export job and poll again for PNG results.",
  "Persist the Canva job id, resulting design id, and 24-hour export URL in the render_jobs table.",
  "Keep the upstream story payload stable so template swaps do not require pipeline rewrites.",
];

export const fallbackRenderPlan = [
  "Mirror the Canva template in HTML/CSS or another deterministic renderer.",
  "Use the same render payload shape as the Canva path so the rest of the system stays unchanged.",
  "Export the fallback image as 1080x1080 PNG and store it in the same delivery pipeline.",
  "Treat the fallback as a real production path, not a throwaway mock, so V1 is never blocked by Canva access.",
  "Upgrade to Canva later by swapping only the render provider, not the ingestion or AI layers.",
];
