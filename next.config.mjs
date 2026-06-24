import nextra from "nextra";

/**
 * Nextra 仅负责 /docs/** 文档；站点根路径 `/` 的落地页是 landing/index.html，
 * 由 build:site 在静态导出后拷入 out/ 根目录（见 scripts/build-site.mjs）。
 * 不使用 basePath：文档天然位于 pages/docs/ → 路由即 /docs/**。
 */
const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  defaultShowCopyCode: true,
});

export default withNextra({
  output: "export",
  images: { unoptimized: true },
  // 末尾斜杠便于 Cloudflare Pages 以目录形式提供静态页
  trailingSlash: true,
});
