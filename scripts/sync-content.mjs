#!/usr/bin/env node
/**
 * sync-content.mjs — 把 pi-web 仓的产品文档同步到本站 Nextra 的 pages/。
 *
 * 单一来源：pi-web 仓 docs/product/（中文 22 章 + README）与其 en/ 子目录（英文版）。
 * 本站不手维护文档正文，每次 dev/build 前自动拉取（package.json 的 predev/prebuild 钩子）。
 *
 * 双语落地（静态导出 output:'export' 与 Next.js 原生 i18n 路由不兼容，故用目录分 locale）：
 *   - 中文（默认）：docs/product/*.md      → pages/docs/*.mdx       → /docs/**
 *   - 英文：        docs/product/en/*.md   → pages/en/docs/*.mdx    → /en/docs/**
 *   语言切换由 theme.config.tsx 的 navbar.extraContent 手动链接（/docs ⇄ /en/docs）。
 *
 * 来源路径优先级：
 *   1. 环境变量 PI_WEB_DOCS_SRC（CI 里指向 sparse-checkout 出的目录）
 *   2. 默认 ../pi-web/docs/product（与 pi-web 同级时的本地开发）
 *
 * 处理（每个 locale 内）：
 *   - 排除 REVIEW-CHECKLIST.md 与点文件（内部用，不发布）
 *   - README.md → docs 首页 index.mdx（中文标题「概览」/英文「Overview」）
 *   - 各章 → 同名 .mdx
 *   - 站内链接 ./xx-name.md(#anchor) → ./xx-name(#anchor)（去 .md 后缀）
 *   - 依数字前缀生成 _meta.js（侧栏顺序 + 标题取首个 H1）
 *   - 链接完整性校验：发现指向缺失目标的 ./*.md 链接即报错退出（构建 gate）
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const PAGES_DIR = path.join(SITE_ROOT, "pages");

const SRC = process.env.PI_WEB_DOCS_SRC
  ? path.resolve(process.env.PI_WEB_DOCS_SRC)
  : path.resolve(SITE_ROOT, "..", "pi-web", "docs", "product");

const EXCLUDE = new Set(["REVIEW-CHECKLIST.md"]);

/** 取首个 H1，去掉「NN · 」前缀作为标题 */
function titleFromMarkdown(md, fallback) {
  const m = md.match(/^#\s+(.+?)\s*$/m);
  if (!m) return fallback;
  return m[1].replace(/^\d+\s*·\s*/, "").trim();
}

/** ./07-agent-development.md(#x) → ./07-agent-development(#x)；README.md → 链到 index（./） */
function rewriteLinks(md) {
  return md.replace(
    /\]\(\.\/([0-9A-Za-z._-]+)\.md(#[^)]*)?\)/g,
    (_all, name, anchor = "") =>
      name === "README" ? `](./${anchor})` : `](./${name}${anchor})`
  );
}

/**
 * MDX 安全转义：这些文档按 CommonMark 写就，正文里的 `{` `}` 与裸 `<`
 * 会被 MDX 当作 JSX 表达式/标签而编译失败。此函数保护 fenced code(```)
 * 与 inline code(`…`) 段不动，仅转义其余 prose 中的 `{` `}` `<` 为 HTML 实体
 * （渲染时还原为原字符）。
 */
function mdxSafe(md) {
  const parts = md.split(/(```[\s\S]*?```|`[^`]*`)/g);
  return parts
    .map((seg, i) => {
      if (i % 2 === 1) return seg; // 受保护的代码段，原样保留
      return seg
        .replace(/\{/g, "&#123;")
        .replace(/\}/g, "&#125;")
        .replace(/</g, "&lt;")
        // 正文行首的 import/export 会被 MDX 当作 ESM 语句 → 首字母实体化（渲染不变）
        .replace(/^(import|export)\b/gm, (w) => `&#${w.charCodeAt(0)};${w.slice(1)}`);
    })
    .join("");
}

/**
 * 同步单个 locale 的文档树。
 * @returns {Promise<{count:number, ordered:[string,string][], broken:number}>}
 */
async function syncLocale(srcDir, outDir, readmeTitle) {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const entries = await fs.readdir(srcDir);
  const mdFiles = entries
    .filter((f) => f.endsWith(".md") && !f.startsWith(".") && !EXCLUDE.has(f))
    .sort();

  const known = new Set(mdFiles.map((f) => f.replace(/\.md$/, "")));
  const meta = {};
  const ordered = [];
  let broken = 0;

  for (const file of mdFiles) {
    const raw = await fs.readFile(path.join(srcDir, file), "utf8");

    // 链接完整性校验（对照本 locale 的源文件集合）
    for (const m of raw.matchAll(/\]\(\.\/([0-9A-Za-z._-]+)\.md(#[^)]*)?\)/g)) {
      const target = m[1];
      if (target !== "README" && !known.has(target) && !EXCLUDE.has(`${target}.md`)) {
        console.error(
          `✗ ${path.relative(SRC, path.join(srcDir, file))} 链接指向缺失目标：./${target}.md`
        );
        broken++;
      }
    }

    const body = mdxSafe(rewriteLinks(raw));
    const isReadme = file === "README.md";
    const slug = isReadme ? "index" : file.replace(/\.md$/, "");
    const title = isReadme ? readmeTitle : titleFromMarkdown(raw, slug);

    await fs.writeFile(path.join(outDir, `${slug}.mdx`), body, "utf8");
    if (isReadme) meta.index = title;
    else ordered.push([slug, title]);
  }

  // 顺序：index 在前，其余按数字前缀
  ordered.sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true }));
  for (const [slug, title] of ordered) meta[slug] = title;

  const metaJs =
    "// 由 scripts/sync-content.mjs 自动生成，请勿手改\nexport default " +
    JSON.stringify(meta, null, 2) +
    "\n";
  await fs.writeFile(path.join(outDir, "_meta.js"), metaJs, "utf8");

  return { count: mdFiles.length, ordered, broken };
}

async function main() {
  // 中文（默认 locale）
  let zh;
  try {
    zh = await syncLocale(SRC, path.join(PAGES_DIR, "docs"), "概览");
  } catch {
    console.error(`✗ 找不到文档来源：${SRC}\n  设 PI_WEB_DOCS_SRC 或确保 pi-web 与本站同级。`);
    process.exit(1);
  }

  let broken = zh.broken;
  let enCount = 0;

  // 英文版（可选）：docs/product/en/ 存在才同步
  const enSrc = path.join(SRC, "en");
  let hasEn = false;
  try {
    hasEn = (await fs.stat(enSrc)).isDirectory();
  } catch {
    hasEn = false;
  }

  if (hasEn) {
    const en = await syncLocale(enSrc, path.join(PAGES_DIR, "en", "docs"), "Overview");
    broken += en.broken;
    enCount = en.count;
    // /en 段顶层 _meta：仅声明 docs 为 page（/en 无独立 index 页，语言切换直达 /en/docs）
    const enMeta =
      "// 由 scripts/sync-content.mjs 自动生成，请勿手改\nexport default " +
      JSON.stringify({ docs: { title: "Docs", type: "page" } }, null, 2) +
      "\n";
    await fs.writeFile(path.join(PAGES_DIR, "en", "_meta.js"), enMeta, "utf8");
  } else {
    // 无英文源时清理可能的旧产物，避免悬空页面
    await fs.rm(path.join(PAGES_DIR, "en"), { recursive: true, force: true });
  }

  if (broken > 0) {
    console.error(`✗ 同步中止：发现 ${broken} 处悬空链接。`);
    process.exit(1);
  }

  console.log(
    `✓ 已从 ${path.relative(SITE_ROOT, SRC) || SRC} 同步：中文 ${zh.count} 篇 → pages/docs/` +
      (hasEn ? `，英文 ${enCount} 篇 → pages/en/docs/` : "（无英文源，跳过）")
  );
  console.log(`  中文顺序：index, ${zh.ordered.map(([s]) => s).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
