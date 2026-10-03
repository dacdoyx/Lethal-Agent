const url = () => (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL)!;
const auth = () => (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN)!;

async function redis(command: string[]) {
  const res = await fetch(url(), {
    method: "POST",
    headers: { Authorization: `Bearer ${auth()}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? "Redis error");
  return data.result as string | null;
}

export async function saveRefreshToken(token: string) {
  await redis(["SET", "youtube_refresh_token", token]);
}

export async function getRefreshToken() {
  return (await redis(["GET", "youtube_refresh_token"])) ?? process.env.YOUTUBE_REFRESH_TOKEN ?? null;
}

// Use this in your upload/API code to get a fresh access token
export async function getAccessToken() {
  const refresh = await getRefreshToken();
  if (!refresh) throw new Error("No refresh token. Log in again.");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? data.error);
  return data.access_token as string;
}
