import React from "react";

/**
 * Nextra 文档主题配置。配色呼应落地页的宋瓷青釉（梅子青 #5f8c7d）。
 */
const config = {
  logo: (
    <span style={{ fontFamily: "Noto Serif SC, serif", fontWeight: 600, fontSize: 18 }}>
      pi<span style={{ color: "#5f8c7d" }}>·</span>web
    </span>
  ),
  project: {
    link: "https://github.com/blksails/pi-web",
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
