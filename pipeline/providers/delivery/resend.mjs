import { readFile } from "node:fs/promises";

function toBase64(buffer) {
  return buffer.toString("base64");
}

export async function deliverWithResend(batch, env) {
  const attachments = await Promise.all(
    batch.stories.map(async (story) => ({
      filename: story.exportPath.split("/").pop(),
      content: toBase64(await readFile(story.exportPath)),
    })),
  );

  const html = `
    <h1>Deal Pipeline Batch</h1>
    <p>${batch.stories.length} graphics are ready for review.</p>
    ${batch.stories
      .map(
        (story) => `
          <hr />
          <h2>${story.finalHeadline}</h2>
          <p>${story.summary1Sentence}</p>
          <p><a href="${story.sourceUrl}">${story.sourceUrl}</a></p>
        `,
      )
      .join("")}
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.senderEmail,
      to: [env.recipientEmail],
      subject: `Deal Pipeline - ${new Date().toISOString().slice(0, 10)}`,
      html,
      attachments,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend delivery failed: ${response.status} ${await response.text()}`);
  }

  return {
    provider: "resend",
    delivered: true,
    recipient: env.recipientEmail,
    response: await response.json(),
  };
}
