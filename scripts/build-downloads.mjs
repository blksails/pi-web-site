#!/usr/bin/env node
/**
 * build-downloads.mjs — 由 landing/_releases.json 生成双语下载页。
 *
 * 产出 landing/downloads.html 与 landing/en/downloads.html，随 landing/ 一起被
 * build-site.mjs 拷进 out/ 根 → 线上路径 /downloads.html 与 /en/downloads.html。
 *
 * 样式**复用落地页的 <style> 整段**（从 landing/index.html 原样抽取），而不是另写一份：
 * 那套宋瓷配色与排版是站点的视觉基线，复制一份就会随时间漂移成两种风格。本页只追加
 * 少量自有类（.rel-*），全部基于既有的 CSS 变量。
 *
 * 最新安装包取自 Pi Desktop 的 OSS 更新元数据；历史版本使用 GitHub 下载链接。
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANDING = path.join(ROOT, "landing");
const DATA = path.join(LANDING, "_releases.json");

const T = {
  zh: {
    lang: "zh-CN",
    title: "下载 Pi Desktop · pi-web",
    desc: "pi-web 桌面版与命令行的全部发行版本下载。",
    kicker: "下载",
    h1: "下载 Pi Desktop",
    lead: "基于 Electron，内置 pi-web 与 Node 运行时，下载即用。安装包直连国内 OSS，打开页面时自动检查最新正式版本。",
    latest: "最新正式版",
    refresh: "检查最新版本",
    checking: "正在检查最新版本…",
    checked: "已获取最新正式版",
    failed: "暂时无法检查更新，已保留当前下载链接，请稍后重试。",
    history: "历史版本",
    historyHint: "点击展开",
    mirror: "镜像",
    viaGithub: "GitHub",
    released: "发布于",
    notesLink: "更新日志 →",
    allReleases: "在 GitHub 查看全部版本 →",
    unsigned:
      "若首次打开被系统拦下：macOS 提示「无法验证开发者」，到<b>系统设置 › 隐私与安全性</b>点「仍要打开」；Windows 的 SmartScreen 提示时，点<b>更多信息 › 仍要运行</b>。Linux 的 AppImage 需先 <code>chmod +x</code>。",
    cliTitle: "命令行",
    cliLead: "不想装桌面版？一行命令即可。",
    navDocs: "文档",
    navHome: "首页",
    langHref: "/en/downloads",
    langLabel: "EN",
    homeHref: "/",
    docsHref: "/docs/01-quickstart",
  },
  en: {
    lang: "en",
    title: "Download Pi Desktop · pi-web",
    desc: "All released builds of the pi-web desktop app and CLI.",
    kicker: "Downloads",
    h1: "Download Pi Desktop",
    lead: "Built on Electron with pi-web and Node bundled. Download directly from our China mirror. This page checks for the latest stable release when opened.",
    latest: "Latest stable",
    refresh: "Check for updates",
    checking: "Checking for updates…",
    checked: "Latest stable release checked",
    failed: "Unable to check for updates. Current download links are still available. Try again later.",
    history: "Earlier releases",
    historyHint: "click to expand",
    mirror: "Mirror",
    viaGithub: "GitHub",
    released: "Released",
    notesLink: "Release notes →",
    allReleases: "See all releases on GitHub →",
    unsigned:
      "If your system blocks the first launch: on macOS open <b>System Settings › Privacy &amp; Security</b> and click “Open Anyway”; on Windows click <b>More info › Run anyway</b> at the SmartScreen prompt. On Linux, <code>chmod +x</code> the AppImage first.",
    cliTitle: "Command line",
    cliLead: "Prefer not to install the desktop app? One command.",
    navDocs: "Docs",
    navHome: "Home",
    langHref: "/downloads",
    langLabel: "中文",
    homeHref: "/en/",
    docsHref: "/en/docs/01-quickstart",
  },
};

const EXTRA_CSS = `
  .rel-toolbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 20px}
  .rel-toolbar button{font:inherit;border:1px solid var(--accent);border-radius:8px;background:var(--panel);color:var(--accent);padding:9px 15px;cursor:pointer}
  .rel-toolbar button:disabled{opacity:.6;cursor:wait}
  .rel-toolbar button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
  #release-status{font-size:13px;color:var(--ink-2)}
  .rel-wrap{max-width:980px;margin:0 auto;padding:0 24px}
  .rel-head{padding:96px 0 28px}
  .rel-card{background:var(--panel);border:1px solid var(--line);border-radius:14px;
    padding:22px 24px;box-shadow:var(--shadow-soft);margin-bottom:16px}
  .rel-card.is-latest{box-shadow:var(--shadow);border-color:rgba(95,140,125,.28)}
  .rel-top{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px}
  .rel-ver{font-family:var(--serif);font-size:22px;font-weight:600;color:var(--ink)}
  .rel-badge{font-size:11px;letter-spacing:.08em;text-transform:uppercase;
    background:var(--soft);color:var(--accent);border-radius:999px;padding:3px 10px}
  .rel-date{font-size:13px;color:var(--ink-3);margin-left:auto}
  .rel-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
  .rel-b{display:flex;flex-direction:column;gap:2px;border:1px solid var(--line);
    border-radius:10px;padding:11px 14px;text-decoration:none;background:#fff;
    transition:border-color .15s,transform .15s}
  .rel-b:hover{border-color:var(--accent-2);transform:translateY(-1px)}
  .rel-b .os{font-size:14px;font-weight:600;color:var(--ink)}
  .rel-b .arch{font-size:12px;color:var(--ink-3)}
  .rel-b .via{font-size:11px;color:var(--accent);margin-top:3px}
  .rel-alt{font-size:11px;color:var(--ink-3);text-decoration:none;margin-top:2px}
  .rel-alt:hover{color:var(--accent);text-decoration:underline}
  .rel-foot{margin-top:14px;display:flex;gap:18px;flex-wrap:wrap;align-items:center}
  .rel-foot a{font-size:13px;color:var(--accent);text-decoration:none}
  .rel-foot a:hover{text-decoration:underline}
  .rel-note{font-size:12.5px;line-height:1.75;color:var(--ink-2);margin:16px 0 0;
    padding:12px 14px;background:var(--bg-2);border-radius:10px}
  .rel-hist{margin-top:32px}
  .rel-hist>summary{cursor:pointer;font-family:var(--serif);font-size:17px;color:var(--ink);
    padding:12px 0;list-style:none;display:flex;align-items:center;gap:10px}
  .rel-hist>summary::-webkit-details-marker{display:none}
  .rel-hist>summary::after{content:"▾";color:var(--ink-3);font-size:13px}
  .rel-hist[open]>summary::after{content:"▴"}
  .rel-hist>summary .hint{font-family:var(--sans);font-size:12px;color:var(--ink-3)}
`;

/** 把落地页的版本号与四个平台按钮 href 覆写成最新 Release(OSS 优先)。 */
function patchLanding(html, latest) {
  const hrefByKey = Object.fromEntries(
    [...latest.assets].reverse().map((a) => [a.key, a.oss ?? a.github]),
  );
  let out = html.replace(
    /<span class="ver">[^<]*<\/span>/,
    `<span class="ver">${esc(latest.tag)}</span>`,
  );
  out = out.replace(
    /(<a class="dl-b" data-os=")([^"]+)(" href=")[^"]+(")/g,
    (all, pre, key, mid, post) =>
      `${pre}${key}${mid}${esc(hrefByKey[key] ?? "/downloads")}${post}`,
  );
  return out;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"\']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "\'":"&#39;"})[c]);
}

function fmtSize(bytes) {
  if (typeof bytes !== "number" || bytes <= 0) return "";
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

function fmtDate(iso, lang) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function assetBtn(a, t) {
  // 最新版使用更新源中的真实文件名；历史版使用 GitHub 的原始链接。
  const primary = a.oss ?? a.github;
  const viaMirror = a.oss !== undefined;
  const size = fmtSize(a.size);
  const alt =
    viaMirror === true && a.github
      ? `<a class="rel-alt" href="${esc(a.github)}" rel="noopener">${t.viaGithub}</a>`
      : "";
  return `
        <div>
          <a class="rel-b" data-os="${esc(a.key)}" href="${esc(primary)}" rel="noopener">
            <span class="os">${esc(a.os)}</span>
            <span class="arch">${esc(a.arch)}${size ? ` · ${size}` : ""}</span>
            ${viaMirror ? `<span class="via">${t.mirror}</span>` : ""}
          </a>
          ${alt}
        </div>`;
}

function releaseCard(r, t, isLatest) {
  return `
      <div class="rel-card${isLatest ? " is-latest" : ""}"${isLatest ? ' id="latest-release"' : ""}>
        <div class="rel-top">
          <span class="rel-ver">${esc(r.tag)}</span>
          ${isLatest ? `<span class="rel-badge">${t.latest}</span>` : ""}
          ${r.prerelease ? `<span class="rel-badge">pre-release</span>` : ""}
          <span class="rel-date">${t.released} ${fmtDate(r.publishedAt, t.lang)}</span>
        </div>
        <div class="rel-btns">${r.assets.map((a) => assetBtn(a, t)).join("")}
        </div>
        <div class="rel-foot">
          <a href="${esc(r.htmlUrl)}" target="_blank" rel="noopener">${t.notesLink}</a>
        </div>
      </div>`;
}

function page(releases, t, styleBlock) {
  const [latest, ...rest] = releases;
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.title}</title>
<meta name="description" content="${t.desc}">
${styleBlock}
<style>${EXTRA_CSS}</style>
</head>
<body>
  <div class="nav"><div class="wrap">
    <div class="logo">pi<span class="d">·</span>web</div>
    <div class="nav-links">
      <a href="${t.homeHref}">${t.navHome}</a>
      <a href="${t.docsHref}">${t.navDocs}</a>
      <a class="nav-lang" href="${t.langHref}">${t.langLabel}</a>
      <a class="nav-cta" href="https://github.com/blksails/pi-web" target="_blank" rel="noopener">GitHub →</a>
    </div>
  </div></div>

  <div class="rel-wrap">
    <div class="rel-head">
      <div class="kicker">${t.kicker}</div>
      <h1 class="feat-t serif">${t.h1}</h1>
      <p class="feat-p">${t.lead}</p>
    </div>

    <div class="rel-toolbar">
      <button id="check-release" type="button">${t.refresh}</button>
      <span id="release-status" role="status" aria-live="polite"></span>
    </div>
    ${releaseCard(latest, t, true)}
    <p class="rel-note">${t.unsigned}</p>

    ${
      rest.length > 0
        ? `<details class="rel-hist">
      <summary>${t.history} <span class="hint">(${rest.length} · ${t.historyHint})</span></summary>
      ${rest.map((r) => releaseCard(r, t, false)).join("")}
    </details>`
        : ""
    }

    <div class="rel-foot" style="margin:28px 0 80px">
      <a href="https://github.com/blksails/pi-desktop/releases" target="_blank" rel="noopener">${t.allReleases}</a>
    </div>
  </div>
<script type="application/json" id="download-i18n">${JSON.stringify(t).replace(/</g, "\\u003c")}</script>
<script src="/downloads.js" defer></script>
</body>
</html>
`;
}

async function main() {
  const releases = JSON.parse(await fs.readFile(DATA, "utf8"));
  if (!Array.isArray(releases) || releases.length === 0) {
    console.error("[build-downloads] ✗ _releases.json 为空 —— 先跑 fetch-releases.mjs");
    process.exit(1);
  }

  // 抽取落地页的 <style> 整段复用,保证视觉基线单一来源。
  const indexHtml = await fs.readFile(path.join(LANDING, "index.html"), "utf8");
  const m = indexHtml.match(/<style>[\s\S]*?<\/style>/);
  if (m === null) {
    console.error("[build-downloads] ✗ 未能从 landing/index.html 抽到 <style> —— 落地页结构变了");
    process.exit(1);
  }
  const styleBlock = m[0];

  await fs.writeFile(path.join(LANDING, "downloads.html"), page(releases, T.zh, styleBlock), "utf8");
  await fs.mkdir(path.join(LANDING, "en"), { recursive: true });
  await fs.writeFile(
    path.join(LANDING, "en", "downloads.html"),
    page(releases, T.en, styleBlock),
    "utf8",
  );

  // 落地页下载按钮是手写 HTML,版本号与 href 会过期。每次构建用最新 Release 覆写,
  // 主链接优先走 OSS 国内镜像,没有镜像才留 GitHub。
  const latest = releases[0];
  for (const rel of ["index.html", path.join("en", "index.html")]) {
    const p = path.join(LANDING, rel);
    const before = await fs.readFile(p, "utf8");
    const after = patchLanding(before, latest);
    if (after !== before) await fs.writeFile(p, after, "utf8");
  }

  const mirrored = releases.filter((r) => r.assets.some((a) => a.oss !== undefined)).length;
  console.log(
    `[build-downloads] ✓ downloads.html + en/downloads.html` +
      `(${releases.length} 个版本,${mirrored} 个走镜像;落地页 → ${esc(latest.tag)})`,
  );
}

await main();
