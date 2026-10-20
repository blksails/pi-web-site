import { parse } from "yaml";

export const OSS_BASE = "https://blksails-pi-desktop.oss-cn-hangzhou.aliyuncs.com";
export const REPO = "blksails/pi-desktop";

export function describeAsset(name) {
  if (/\.dmg$/i.test(name)) return { os: "macOS", arch: /arm64|aarch64/i.test(name) ? "Apple 芯片 · dmg" : "Intel · dmg", key: /arm64|aarch64/i.test(name) ? "mac-arm" : "mac-x64" };
  if (/\.exe$/i.test(name)) return { os: "Windows", arch: /setup/i.test(name) ? "x64 · Installer" : "x64 · Portable", key: /setup/i.test(name) ? "win" : "win-portable" };
  if (/\.AppImage$/i.test(name)) return { os: "Linux", arch: "x86_64 · AppImage", key: "linux" };
  if (/\.deb$/i.test(name)) return { os: "Linux", arch: "amd64 · deb", key: "linux-deb" };
  return null;
}

// These feeds are uploaded only after the installers, with Cache-Control: no-store.
// Keep all platforms on the same stable version during a release upload.
export async function latestDesktopRelease(base = OSS_BASE) {
  const feeds = await Promise.all(["latest-mac.yml", "latest.yml", "latest-linux.yml"].map(async (file) => {
    const response = await fetch(`${base.replace(/\/$/, "")}/${file}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Update feed ${file}: HTTP ${response.status}`);
    const feed = parse(await response.text());
    if (!/^\d+\.\d+\.\d+$/.test(feed?.version) || !Array.isArray(feed.files)
      || !Number.isFinite(Date.parse(feed.releaseDate))) throw new Error(`Invalid update feed: ${file}`);
    return feed;
  }));
  const version = feeds[0].version;
  if (feeds.some((feed) => feed.version !== version)) throw new Error("Release upload is still in progress");
  const assets = feeds.flatMap((feed) => feed.files.flatMap((file) => {
    const meta = typeof file.url === "string" && describeAsset(file.url);
    if (!meta) return [];
    if (/[\\/\x00-\x1f]/.test(file.url) || !Number.isFinite(file.size) || file.size <= 0
      || !/^[A-Za-z0-9+/]{86}==$/.test(file.sha512)) throw new Error("Invalid installer metadata");
    return [{ name: file.url, ...meta, size: file.size, sha512: file.sha512,
      oss: `${base.replace(/\/$/, "")}/${encodeURIComponent(file.url)}` }];
  }));
  for (const key of ["mac-arm", "mac-x64", "win", "linux"]) {
    if (!assets.some((asset) => asset.key === key)) throw new Error(`Missing installer: ${key}`);
  }
  const order = ["mac-arm", "mac-x64", "win", "linux", "linux-deb"];
  assets.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return { tag: `v${version}`, version, prerelease: false, publishedAt: feeds[0].releaseDate,
    htmlUrl: `https://github.com/${REPO}/releases/tag/v${version}`, assets };
}
