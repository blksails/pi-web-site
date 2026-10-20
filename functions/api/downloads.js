import { latestDesktopRelease, OSS_BASE } from "../../lib/desktop-releases.mjs";

// Cloudflare Pages Function: the OSS bucket does not expose CORS headers.
export async function onRequestGet({ env }) {
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };
  try {
    const release = await latestDesktopRelease(env.PI_DESKTOP_OSS_BASE || OSS_BASE);
    return new Response(JSON.stringify({ release, checkedAt: new Date().toISOString() }), { headers });
  } catch (error) {
    console.error("[downloads]", error.message);
    return new Response(JSON.stringify({ error: "Latest release is temporarily unavailable" }), { status: 502, headers });
  }
}
