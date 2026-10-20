# pi-web-site

pi-web 的官网与文档站 —— **落地页 `/` + 下载页 `/downloads` + Nextra 文档 `/docs`**，独立于 pi-web 应用部署。

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
- 有状态的 pi-web **应用**部署在别处（如 `app.pi-web.blksails.ai`）；本站的落地页与文档为静态页面，下载查询通过 Pages Function 提供，互不影响。

---

_私有项目 — © blksails。_

## Pi Desktop 下载页

- `/downloads`、`/en/downloads`：中英文下载页，页面打开时和点击「检查最新版本」时查询最新正式版。
- `/api/downloads`：Cloudflare Pages Function，从 Pi Desktop 的 OSS 更新源读取 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`。不依赖 GitHub token，不要求 OSS 配置浏览器 CORS。
- 更新源默认为 `https://blksails-pi-desktop.oss-cn-hangzhou.aliyuncs.com`，与 `pi-desktop` 的 `build.publish` 和 `src/updater-config.mjs` 一致；可用 `PI_DESKTOP_OSS_BASE` 环境变量覆盖（构建期和 Pages Function 分别配置）。
- 发布流程先上传安装包，后上传禁止缓存的更新元数据。三个平台版本一致、安装包元数据完整后才替换下载内容；查询失败或发布尚未完成时，页面保留原有下载链接并允许重试。
- 文件名直接取自更新元数据，并对空格等字符编码；不从 GitHub 资产名推导 OSS 路径。页面提供 macOS Apple 芯片 / Intel、Windows 安装版、Linux AppImage / deb。
- `pnpm build:downloads` 更新入库快照并生成页面，也同步首页下载链接。可选的历史版本取自 `blksails/pi-desktop` GitHub Releases；私有仓库需要有读取权限的 `GITHUB_TOKEN` / `GH_TOKEN`，读取失败不影响最新版本下载。

`GET /api/downloads` 成功返回 `{ release: { tag, version, publishedAt, assets }, checkedAt }`，每个 asset 含 `name`、`os`、`arch`、`key`、`size`、`oss`、`sha512`。上游不可用或元数据不完整返回 HTTP 502 和 `{ error }`。响应均为 `Cache-Control: no-store`。

Cloudflare 部署须从仓库根目录执行 `wrangler pages deploy out`，以同时部署 `functions/`；只上传静态目录的托管方式只能提供构建快照。

本地预览（含真实 Pages Function）：

```bash
pnpm build:downloads
pnpm dlx wrangler@4 pages dev landing
```

离线接口验收使用从实际 OSS 更新源记录的测试 fixture。Postman 未登录，无法检索团队 mock，因此本仓保留本地模拟：

```bash
postman simulation run postman/simulations/downloads.sim.yaml --port 4900 --output ndjson
# 在另一个终端运行：
node --test test/downloads.test.mjs
```

覆盖安装包路径编码、上游 503、无效元数据、发布期间平台版本不一致及上游不可达。模拟请求记录应包含三个 `latest*.yml`。
