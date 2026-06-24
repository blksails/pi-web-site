# pi-web-site

pi-web 的官网与文档站 —— **落地页 `/` + Nextra 文档 `/docs`**，独立于 pi-web 应用部署。

> 文档正文的**唯一来源是 pi-web 仓 `docs/product/`**。本站不手维护文档，
> 每次 dev/build 前由 `scripts/sync-content.mjs` 同步拉取并转换。

## 结构

```
pi-web-site/
├── landing/index.html        # 落地页（纯静态，宋瓷青釉风格）— 站点根 /
├── pages/
│   ├── _meta.json            # 顶部导航（隐藏占位 index，露出「文档」）
│   ├── index.mdx             # 开发占位首页（生产被 landing 覆盖）
│   └── docs/                 # ← 同步生成（.gitignore，勿手改）
├── scripts/
│   ├── sync-content.mjs       # 从 pi-web/docs/product 拉取 + 改写链接 + 生成 _meta + 链接校验
│   └── build-site.mjs         # sync → next build(export) → 落地页拷入 out/
├── theme.config.tsx          # Nextra 主题（青釉配色 / logo / 页脚）
└── next.config.mjs           # Nextra + output:export
```

## 路由

| 路径 | 内容 |
| --- | --- |
| `/` | `landing/index.html`（静态落地页） |
| `/docs` | 文档首页（来自 pi-web `docs/product/README.md`） |
| `/docs/00-product-overview` … `/docs/20-glossary` | 各章 |

## 本地开发

```bash
pnpm install
pnpm dev          # 自动先 sync，再 next dev → http://localhost:3000/docs
```

- 落地页本地预览：直接浏览器打开 `landing/index.html`。
- dev 下根路径 `/` 是占位页；生产由 `build:site` 用落地页覆盖。

## 文档来源（同步）

`sync-content.mjs` 的来源路径：

1. 环境变量 `PI_WEB_DOCS_SRC`（CI 用，指向 sparse-checkout 出的目录）；
2. 默认 `../pi-web/docs/product`（与 pi-web 同级时的本地开发）。

改文档请到 **pi-web 仓 `docs/product/`**，再在此 `pnpm sync` 拉取。

## 构建与部署（Cloudflare Pages）

```bash
pnpm build:site   # → out/（/ 落地页，/docs Nextra）
```

CI（GitHub Actions）建议：

```yaml
# 在 pi-web-site 仓
- run: |
    git clone --depth=1 --filter=blob:none --sparse \
      https://github.com/blksails/pi-web tmp-pi-web
    cd tmp-pi-web && git sparse-checkout set docs/product && cd ..
- run: PI_WEB_DOCS_SRC=tmp-pi-web/docs/product pnpm install && PI_WEB_DOCS_SRC=tmp-pi-web/docs/product pnpm build:site
- run: npx wrangler pages deploy out --project-name=pi-web-site
```

- Cloudflare Pages 项目绑定自定义域 `pi-web.blksails.ai`。
- 有状态的 pi-web **应用**部署在别处（如 `app.pi-web.blksails.ai`）；本站是纯静态，互不影响。

---

_私有项目 — © blksails。_
