const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

async function callGemini(systemPrompt, userContent, apiKey, { maxTokens = 1024, temperature = 0 } = {}) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// llama-3.1-8b-instant: 6,000 RPM / 500,000 RPD — far higher free tier limits
// than llama-3.3-70b-versatile (30 RPM / 14,400 RPD), and handles JSON well
async function callGroq(systemPrompt, userContent, apiKey, { maxTokens = 1024, temperature = 0 } = {}) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature,
      max_tokens: Math.min(maxTokens, 8192),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// Try Gemini first; fall back to Groq if Gemini quota is exhausted
export async function gemini(systemPrompt, userContent, { geminiKey, groqKey } = {}, opts = {}) {
  if (geminiKey) {
    try {
      return await callGemini(systemPrompt, userContent, geminiKey, opts);
    } catch (e) {
      if (!e.message.includes("429") && !e.message.includes("quota")) throw e;
      console.warn("[ai] Gemini quota hit, falling back to Groq");
    }
  }
  if (groqKey) {
    return await callGroq(systemPrompt, userContent, groqKey, opts);
  }
  throw new Error("No AI API key available");
}
