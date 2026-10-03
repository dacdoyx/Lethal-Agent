import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const savedState = req.cookies.get("yt_oauth_state")?.value;

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
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
  if (!tokenRes.ok) {
    return NextResponse.json(tokens, { status: 400 });
  }

  const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:sans-serif;padding:16px;word-break:break-all">
<h3>Copy refresh token</h3>
<p>Save it as <b>YOUTUBE_REFRESH_TOKEN</b> in Vercel, then remove this route.</p>
<pre>${tokens.refresh_token ?? "No refresh_token returned. Revoke access in your Google account and log in again."}</pre>
</body>`;

  const res = new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  res.cookies.delete("yt_oauth_state");
  return res;
}
