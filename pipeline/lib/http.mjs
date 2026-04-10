export async function fetchText(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }

  return response.text();
}
