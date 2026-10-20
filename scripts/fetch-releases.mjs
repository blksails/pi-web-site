#!/usr/bin/env node
/** Build-time snapshot of the same OSS feeds used by the live download page. */
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { latestDesktopRelease, describeAsset, REPO, OSS_BASE } from "../lib/desktop-releases.mjs";

const output = fileURLToPath(new URL("../landing/_releases.json", import.meta.url));
try {
  const latest = await latestDesktopRelease(process.env.PI_DESKTOP_OSS_BASE || OSS_BASE);
  let history = [];
  try {
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "pi-web-site" };
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`, { headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    history = (await response.json()).filter(r => !r.draft && !r.prerelease && r.tag_name !== latest.tag).map(r => ({
      tag: r.tag_name, version: r.tag_name.replace(/^v/, ""), prerelease: false,
      publishedAt: r.published_at, htmlUrl: r.html_url,
      assets: (r.assets || []).flatMap(a => {
        const meta = describeAsset(a.name);
        return meta ? [{ name: a.name, ...meta, size: a.size, github: a.browser_download_url }] : [];
      }),
    })).filter(r => r.assets.length > 0);
  } catch (error) {
    console.warn(`[fetch-releases] History unavailable: ${error.message}`);
  }
  await fs.writeFile(output, JSON.stringify([latest, ...history], null, 2) + "\n");
  console.log(`[fetch-releases] Pi Desktop ${latest.tag}; ${history.length} earlier releases`);
} catch (error) {
  const snapshot = JSON.parse(await fs.readFile(output, "utf8"));
  if (!snapshot[0]?.assets?.some(a => a.oss?.startsWith(OSS_BASE + "/"))) throw error;
  console.warn(`[fetch-releases] ${error.message}; retaining Pi Desktop snapshot`);
}
