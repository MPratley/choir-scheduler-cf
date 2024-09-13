import { AppLoadContext } from "@remix-run/cloudflare";

const CACHE_TTL = 30 * 60; // 30 minutes in seconds

export async function fetchGoogleApiData(
  context: AppLoadContext,
  name: string
) {
  const cacheKey = `google_api_${name}`;

  // Try to get data from cache
  const cachedData = await context.cloudflare.env.CHOIR_SCHEDULER_KV.get(
    cacheKey
  );
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // If not in cache, fetch from API
  const apiUrl = `https://script.google.com/macros/s/AKfycbwIW9xL-m8P2xHWuRJ138VemPPdYMKMbDJNyFSQb8mBrmE_WDqWUFxWpydQtJz6SkY/exec?name=${encodeURIComponent(
    name
  )}`;
  const response = await fetch(apiUrl);
  const data = await response.json();

  // Store in cache
  // no need to await this
  context.cloudflare.env.CHOIR_SCHEDULER_KV.put(cacheKey, JSON.stringify(data), {
    expirationTtl: CACHE_TTL,
  }).catch((error) => {
    console.error("Error storing data in cache:", error);
  });

  return data;
}
