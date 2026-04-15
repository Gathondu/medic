import { NextResponse } from "next/server";

const DEFAULT_BACKEND = "http://127.0.0.1:8000";

function backendApiUrl(): string {
  const base = process.env.BACKEND_URL?.trim() || DEFAULT_BACKEND;
  return `${base.replace(/\/$/, "")}/api`;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(backendApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend API. Is it running?" },
      { status: 502 },
    );
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }

  if (!upstream.body) {
    const text = await upstream.text();
    return new Response(text, { status: upstream.status, headers });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
