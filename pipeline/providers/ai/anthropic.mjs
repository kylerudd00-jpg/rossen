import { rankingPrompt, writingPrompt } from "../../srcPrompts.mjs";

function extractTextBlocks(data) {
  return (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function parseJson(text) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) {
    throw new Error("Model did not return JSON");
  }

  return JSON.parse(match[0]);
}

async function callAnthropic(apiKey, body) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function rankAndWriteWithAnthropic(candidates, options) {
  const rankingBody = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: rankingPrompt,
    messages: [
      {
        role: "user",
        content: JSON.stringify(
          {
            date: new Date().toISOString().slice(0, 10),
            candidates,
            limit: options.limit || 5,
          },
          null,
          2,
        ),
      },
    ],
  };

  const rankingData = await callAnthropic(options.apiKey, rankingBody);
  const rankedPayload = parseJson(extractTextBlocks(rankingData));
  const selected = (rankedPayload.items || [])
    .filter((item) => !item.rejection_reason)
    .slice(0, options.limit || 5)
    .map((item) => {
      const source = candidates.find((candidate) => candidate.id === item.id);
      return {
        ...source,
        llmScores: item.scores,
        selectionReason: item.selection_reason,
      };
    });

  const writingBody = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: writingPrompt,
    messages: [
      {
        role: "user",
        content: JSON.stringify(
          {
            selected_items: selected,
          },
          null,
          2,
        ),
      },
    ],
  };

  const writingData = await callAnthropic(options.apiKey, writingBody);
  const writingPayload = parseJson(extractTextBlocks(writingData));
  const stories = (writingPayload.items || []).map((item) => {
    const source = selected.find((candidate) => candidate.id === item.id);
    return {
      ...source,
      summary1Sentence: item.summary_1_sentence,
      finalHeadline: item.final_headline,
      finalSubtext: item.final_subtext,
      imageQuery: item.image_query,
      whySelected: item.why_selected,
    };
  });

  return {
    provider: "anthropic",
    stories,
  };
}
