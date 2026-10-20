// Recorded OSS electron-builder feeds (2026-10-20); used only as test fixtures.
const http = require("node:http");
const feeds = {
  "latest-mac.yml": "version: 0.1.23\nfiles:\n  - url: Pi Desktop-0.1.23-mac.zip\n    sha512: SPhE8C6W1h2+YroIKy2rHyTVxIli5gatG1BKoXZfOsmE2WlvANc3DoP9+NvuyinNw7GtDYz+IC4srYD4112ZWg==\n    size: 163921389\n  - url: Pi Desktop-0.1.23.dmg\n    sha512: paKbhm96k/mkH4VAr3Wn7GWNx4Tnot6ii/fB/d7gvMegBuPvZGdRDc3mduK02K1IXYBwyCG9rXVSzkYlgOvERw==\n    size: 164787081\n  - url: Pi Desktop-0.1.23-arm64-mac.zip\n    sha512: QQYCPdv1Bge965cIAMVbKkdgpWakJgFi/r/OmZP0gcLODKcWEXgi3ie6LHPZWpfaEP6v4oRA8HwDHcY3Dr/G0A==\n    size: 157466305\n  - url: Pi Desktop-0.1.23-arm64.dmg\n    sha512: Lp95BauTeiP9SFEKpjwPugjcyG9wtVdaj7UZhUUn5G885vDUr2DFiiGGh299aYxItEHf/sGlzyuUdF6pDEKHdA==\n    size: 158379055\npath: Pi Desktop-0.1.23-mac.zip\nsha512: SPhE8C6W1h2+YroIKy2rHyTVxIli5gatG1BKoXZfOsmE2WlvANc3DoP9+NvuyinNw7GtDYz+IC4srYD4112ZWg==\nreleaseDate: '2026-10-20T04:40:51.724Z'\n",
  "latest.yml": "version: 0.1.23\nfiles:\n  - url: Pi Desktop Setup 0.1.23.exe\n    sha512: W3X0G6UVBH7MYlo3Z/Hj0ZnoycuB8HVElcIQMK0uvVmojg8EcDHsasDr8t4LgGUT+PLDfkJV/xzhALr2P8O8CA==\n    size: 116290379\npath: Pi Desktop Setup 0.1.23.exe\nsha512: W3X0G6UVBH7MYlo3Z/Hj0ZnoycuB8HVElcIQMK0uvVmojg8EcDHsasDr8t4LgGUT+PLDfkJV/xzhALr2P8O8CA==\nreleaseDate: '2026-10-20T04:44:13.926Z'\n",
  "latest-linux.yml": "version: 0.1.23\nfiles:\n  - url: Pi Desktop-0.1.23.AppImage\n    sha512: vnNFJ5GV0h5IqBG61Id5wxHLbPkpDYmlNsHEoM6VLUaRFcTadP2LdXhdBVh7OEnd84WfQyzj4MxnsvrOio0GzQ==\n    size: 167771315\n    blockMapSize: 175303\n  - url: pi-desktop_0.1.23_amd64.deb\n    sha512: z2XeKfrr7g6nJU7dnGSBcTo7E4J+izA2h2+OM2YDw28cZABhdNcm+vx7JqocNYygB72QAWJLzS0SCCRRjFg4/Q==\n    size: 129007036\npath: Pi Desktop-0.1.23.AppImage\nsha512: vnNFJ5GV0h5IqBG61Id5wxHLbPkpDYmlNsHEoM6VLUaRFcTadP2LdXhdBVh7OEnd84WfQyzj4MxnsvrOio0GzQ==\nreleaseDate: '2026-10-20T04:38:03.518Z'\n"
};
http.createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  const file = path.split("/").pop();
  if (path.includes("/error/")) { res.writeHead(503); return res.end("Unavailable"); }
  if (!feeds[file]) { res.writeHead(501); return res.end("Not modeled"); }
  let body = feeds[file];
  if (path.includes("/invalid/")) body = "files: []";
  if (path.includes("/mismatch/") && file === "latest.yml") body = body.replace("version: 0.1.23", "version: 0.0.0"); // test-only version
  res.writeHead(200, { "Content-Type": "application/yaml" });
  res.end(body);
}).listen(process.env.PORT || 4500);
