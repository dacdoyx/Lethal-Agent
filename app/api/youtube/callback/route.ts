import { NextRequest, NextResponse } from "next/server";
import { saveRefreshToken } from "../../../../lib/youtube-token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const savedState = req.cookies.get("yt_oauth_state")?.value;

  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!code || !state || state !== savedState) {
    return NextResponse.json({ error: "Invalid state or code" }, { status: 400 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) return NextResponse.json(tokens, { status: 400 });

  if (!tokens.refresh_token) {
    return NextResponse.json(
      { error: "No refresh_token. Revoke access at myaccount.google.com/permissions and log in again." },
      { status: 400 }
    );
  }

  await saveRefreshToken(tokens.refresh_token);

  const res = new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;padding:16px"><h3>YouTube connected. Token saved.</h3></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
  res.cookies.delete("yt_oauth_state");
  return res;
}
