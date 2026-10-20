This production export was built on 2026-10-20 with `pnpm build:site`.

Documentation source: the archived pi-web checkout at commit
f493dce1 (docs/product), using README.md and the numbered public chapters
in Chinese and English. The active pi-web checkout no longer contains
this legacy product-documentation directory. Internal review and revamp
planning documents are excluded from the export.

The deployment archive contains the complete static website. Pages Functions
are built from the accompanying source, including functions/api/downloads.js
and lib/desktop-releases.mjs. Deployment uses the repository's existing
Cloudflare secrets and explicitly targets its production branch, main.

The downloads page reads OSS update metadata at runtime; subsequent desktop
releases do not require rebuilding this archive.
