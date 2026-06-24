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

## CI/CD（GitHub Actions）

已内置两个 workflow：

| 文件 | 仓库 | 触发 | 作用 |
| --- | --- | --- | --- |
| `.github/workflows/deploy.yml` | **pi-web-site** | push main · `repository_dispatch(docs-updated)` · 手动 | 稀疏检出 pi-web 的 `docs/product` → `pnpm build:site` → 部署 CF Pages |
| `.github/workflows/trigger-docs-deploy.yml` | **blksails/pi-web** | push main 改 `docs/product/**` | 跨仓 `repository_dispatch` 通知本站重新部署 |

**上线前置（一次性）：**

1. 把本仓推到 GitHub：`blksails/pi-web-site`。
2. 在 **pi-web-site** 仓加 secrets：
   - `CLOUDFLARE_API_TOKEN` —— Cloudflare 控制台「Edit Cloudflare Pages」模板 token；
   - `CLOUDFLARE_ACCOUNT_ID` —— `c1cc6314f2222379ec14714b992ba3df`。
3. 在 **blksails/pi-web** 仓加 secret：
   - `DOCS_DEPLOY_TOKEN` —— fine-grained PAT，授予 `blksails/pi-web-site` 的 *Contents: Read and write*（用于 dispatch）。

之后：改文档（pi-web）或改站点（pi-web-site）push 到 main，即自动构建并发布。

- Cloudflare Pages 项目绑定自定义域 `pi-web.blksails.ai`。
- 有状态的 pi-web **应用**部署在别处（如 `app.pi-web.blksails.ai`）；本站是纯静态，互不影响。

---

_私有项目 — © blksails。_
