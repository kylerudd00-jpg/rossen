import { renderWithCanva } from "./canva.mjs";
import { renderLocally } from "./localSvg.mjs";

export async function renderStories(stories, env, batchDir) {
  if (env.renderProvider === "canva") {
    return renderWithCanva(stories, env, batchDir);
  }

  return renderLocally(stories, env, batchDir);
}
