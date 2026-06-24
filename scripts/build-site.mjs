#!/usr/bin/env node
/**
 * build-site.mjs — 一键产出可部署到 Cloudflare Pages 的 out/。
 *
 * 步骤：
 *   1. 同步文档（pi-web/docs/product → pages/docs）
 *   2. next build（output: 'export'）→ out/，文档位于 out/docs/**
 *   3. 把 landing/ 落地页拷入 out/ 根目录 → 站点根 `/` 即落地页
 *
 * 结果路由：/  → 落地页（静态）；/docs/** → Nextra 文档。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "out");
const LANDING = path.join(ROOT, "landing");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function main() {
  run("node scripts/sync-content.mjs");
  run("next build");

  // 落地页覆盖到 out/ 根（覆盖 Nextra 的占位 index.html）
  await copyDir(LANDING, OUT);
  console.log("\n✓ 落地页已拷入 out/ 根目录");
  console.log("✓ 站点就绪：out/  → 部署到 Cloudflare Pages");
  console.log("  /        落地页（landing/index.html）");
  console.log("  /docs/   Nextra 文档");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
