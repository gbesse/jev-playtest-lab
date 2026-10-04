import { MODEL } from './core.js';

export async function callTypeSafe(request, { apiKey = process.env.TYPESAFE_API_KEY, fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  if (!apiKey) throw new Error('TYPESAFE_API_KEY is required for live mode');
  const response = await fetchImpl('https://api.typesafe.ai/v1/systemone', {
    method: 'POST', signal: AbortSignal.timeout(timeoutMs),
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...request, model: MODEL })
  });
  if (!response.ok) throw new Error(`TypeSafe request failed with HTTP ${response.status}`);
  return response.json();
}
