import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/downloads.js";

const base = process.env.DOWNLOADS_TEST_OSS_BASE || "http://127.0.0.1:4900/oss";
const query = (suffix = "") => onRequestGet({ env: { PI_DESKTOP_OSS_BASE: base + suffix } });

test("serves the published installers with correctly encoded OSS names", async () => {
  const response = await query();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const { release, checkedAt } = await response.json();
  assert.equal(release.tag, "v0.1.23");
  assert.deepEqual(release.assets.map(a => a.key), ["mac-arm", "mac-x64", "win", "linux", "linux-deb"]);
  assert.match(release.assets[2].oss, /Pi%20Desktop%20Setup%200\.1\.23\.exe$/);
  assert.ok(Number.isFinite(Date.parse(checkedAt)));
  assert.ok(release.assets.every(a => !/blockmap|\.zip$/.test(a.name)));
});

for (const scenario of ["error", "invalid", "mismatch"]) {
  test(`rejects ${scenario} metadata with a retryable response`, async () => {
    const response = await query(`/${scenario}`);
    assert.equal(response.status, 502);
    assert.ok((await response.json()).error);
  });
}
test("handles an unreachable update origin", async () => {
  const response = await onRequestGet({ env: { PI_DESKTOP_OSS_BASE: "http://127.0.0.1:1" } });
  assert.equal(response.status, 502);
});
