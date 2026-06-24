import React from "react";
import { useRouter } from "next/router";

/**
 * 语言切换（静态导出下无 Next.js i18n，手动在 /docs ⇄ /en/docs 间跳转）。
 * 当前在英文段 → 显示「中文」并去掉 /en 前缀；否则 → 显示「EN」并加 /en 前缀。
 */
function LanguageToggle() {
  const { asPath } = useRouter();
  const isEn = asPath === "/en" || asPath.startsWith("/en/");
  const target = isEn
    ? asPath.replace(/^\/en/, "") || "/"
    : `/en${asPath === "/" ? "/docs" : asPath}`;
  return (
    <a
      href={target}
      aria-label={isEn ? "切换到中文" : "Switch to English"}
      style={{ fontSize: 14, fontWeight: 500, padding: "0 8px", whiteSpace: "nowrap" }}
    >
      {isEn ? "中文" : "EN"}
    </a>
  );
}

/**
 * Nextra 文档主题配置。配色呼应落地页的宋瓷青釉（梅子青 #5f8c7d）。
 */
const config = {
  navbar: {
    extraContent: LanguageToggle,
  },
  logo: (
    <span style={{ fontFamily: "Noto Serif SC, serif", fontWeight: 600, fontSize: 18 }}>
      pi<span style={{ color: "#5f8c7d" }}>·</span>web
    </span>
  ),
  project: {
    link: "https://github.com/blksails/pi-web",
  },
  // X / Twitter @hysios（用 navbar 的 chat 槽位放第二个社交图标）
  chat: {
    link: "https://x.com/hysios",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-label="X / @hysios">
        <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-7-6.2 7H1.4l8.1-9.3L1 2h7.1l4.9 6.4L18.9 2zm-2.4 18h1.9L7.6 4H5.6l10.9 16z" />
      </svg>
    ),
  },
  docsRepositoryBase: "https://github.com/blksails/pi-web/tree/main/docs/product",
  color: {
    hue: 162, // 青釉绿色相
    saturation: 24,
  },
  footer: {
    content: (
      <span style={{ fontSize: 13 }}>
        素以为绚 · © {new Date().getFullYear()} BLKSAILS
      </span>
    ),
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="pi-web 文档" />
      <meta property="og:description" content="为 pi 智能体，即刻披上一袭 Web。" />
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600&display=swap"
        rel="stylesheet"
      />
    </>
  ),
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: { backToTop: true },
  // 首页落地页是站外静态文件，这里只声明文档站标题
  useNextSeoProps: () => ({ titleTemplate: "%s · pi-web" }),
  i18n: [],
};

export default config;
