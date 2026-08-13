#!/usr/bin/env node
/**
 * fetch-releases.mjs — 构建期抓取 pi-web 的 Release 列表，产出 landing/_releases.json。
 *
 * 站点是纯静态导出（output: "export"）部署到 Cloudflare Pages，页面没有服务端。
 * 版本数据因此只有两种取法：构建期固化，或浏览器运行时拉。这里取前者 —— 国内访问者
 * 无需触达 GitHub API，页面秒开且不受其可达性影响。代价是发新版后要重新构建站点
 * （pi-web 的 desktop-release 可用 repository_dispatch 触发，与既有 docs-updated 同法）。
 *
 * ★ 下载源按「OSS 优先、GitHub 备用」组织，但**不假定 OSS 上一定有**：
 *   OSS 镜像是 v0.3.3 之后才加进 desktop-release 的，更早的版本从未镜像过。
 *   故对每个资产逐个 HEAD 探测 OSS 是否真的存在，存在才给 OSS 链接。
 *   这样既不需要手工补传历史产物，也不会在页面上留下 404 死链。
 *
 * 无网络 / API 限流时：若已有旧的 _releases.json 则原样保留并告警退出 0（构建不中断，
 * 页面退回上一次快照）；若连快照都没有，才以非零码失败 —— 那时页面会是空的，
 * 静默产出一个没有任何下载项的下载页比构建失败更糟。
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "landing", "_releases.json");

const REPO = process.env.PI_WEB_REPO ?? "blksails/pi-web";
const OSS_BASE =
  process.env.PI_WEB_OSS_BASE ?? "https://pi-web-site.oss-cn-hangzhou.aliyuncs.com";
/** 只保留桌面安装包；源码包等一概不列。 */
const ASSET_RE = /\.(dmg|exe|AppImage)$/i;

/** 资产文件名 → 展示用的平台描述。未识别的形态仍会列出，只是描述退回文件名。 */
function describeAsset(name) {
  if (/aarch64\.dmg$/i.test(name)) return { os: "macOS", arch: "Apple 芯片 · dmg", key: "mac-arm" };
  if (/x64\.dmg$/i.test(name)) return { os: "macOS", arch: "Intel · dmg", key: "mac-x64" };
  if (/setup\.exe$/i.test(name)) return { os: "Windows", arch: "x64 · exe", key: "win" };
  if (/\.AppImage$/i.test(name)) return { os: "Linux", arch: "x86_64 · AppImage", key: "linux" };
  return { os: name, arch: "", key: "other" };
}

async function ghFetch(url) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "pi-web-site-build" };
  // CI 上带 token 可把限流从 60/h 提到 5000/h；本地无 token 也能跑。
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

/**
 * OSS 上同一资产可能落在两个布局之一:
 *   - 扁平:  releases/<tag>/<file>                 (v0.3.3 / v0.3.4)
 *   - 分目录:releases/<tag>/{dmg|nsis|appimage}/<file>  (v0.3.5 起,tauri bundle 子目录被 cp -r 带上去)
 * 两个都 HEAD 一遍,命中才返回,避免页面上出现 404 死链。
 */
function ossCandidates(tag, assetName) {
  const base = `${OSS_BASE}/releases/${tag}`;
  const sub = /\.dmg$/i.test(assetName)
    ? "dmg"
    : /\.AppImage$/i.test(assetName)
      ? "appimage"
      : /\.exe$/i.test(assetName)
        ? "nsis"
        : null;
  return [`${base}/${assetName}`, ...(sub ? [`${base}/${sub}/${assetName}`] : [])];
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function ossHas(tag, assetName) {
  for (const url of ossCandidates(tag, assetName)) {
    if (await headOk(url)) return url;
  }
  return undefined;
}

async function main() {
  let releases;
  try {
    releases = await ghFetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      await fs.access(OUT_FILE);
      console.warn(`[fetch-releases] ⚠ 取 Release 失败(${msg});沿用已有快照 ${OUT_FILE}`);
      return;
    } catch {
      console.error(`[fetch-releases] ✗ 取 Release 失败且无可用快照:${msg}`);
      process.exit(1);
    }
  }

  const out = [];
  for (const r of releases) {
    if (r.draft) continue;
    const assets = (r.assets ?? []).filter((a) => ASSET_RE.test(a.name));
    if (assets.length === 0) continue;

    const items = await Promise.all(
      assets.map(async (a) => {
        const meta = describeAsset(a.name);
        return {
          name: a.name,
          os: meta.os,
          arch: meta.arch,
          key: meta.key,
          size: a.size,
          github: a.browser_download_url,
          oss: await ossHas(r.tag_name, a.name),
        };
      }),
    );
    // 平台顺序固定，避免 GitHub 返回顺序变动导致页面按钮乱跳。
    const order = { "mac-arm": 0, "mac-x64": 1, win: 2, linux: 3, other: 4 };
    items.sort((x, y) => (order[x.key] ?? 9) - (order[y.key] ?? 9));

    out.push({
      tag: r.tag_name,
      version: r.tag_name.replace(/^v/, ""),
      prerelease: r.prerelease === true,
      publishedAt: r.published_at,
      notes: r.body ?? "",
      htmlUrl: r.html_url,
      assets: items,
    });
  }

  if (out.length === 0) {
    console.error("[fetch-releases] ✗ 没有任何带安装包的 Release —— 不写出空快照");
    process.exit(1);
  }

  await fs.writeFile(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  const mirrored = out.filter((r) => r.assets.some((a) => a.oss !== undefined)).length;
  console.log(
    `[fetch-releases] ✓ ${out.length} 个版本 → ${path.relative(ROOT, OUT_FILE)}` +
      `(其中 ${mirrored} 个已镜像到 OSS)`,
  );
}

await main();
