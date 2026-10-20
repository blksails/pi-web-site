(() => {
  const button = document.getElementById("check-release");
  const status = document.getElementById("release-status");
  const t = JSON.parse(document.getElementById("download-i18n").textContent);
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  async function refresh() {
    button.disabled = true;
    status.textContent = t.checking;
    try {
      const response = await fetch("/api/downloads", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { release } = await response.json();
      if (!/^v\d+\.\d+\.\d+$/.test(release?.tag) || !release.assets?.length) throw new Error("Invalid release");
      const card = node("div", "rel-card is-latest");
      card.id = "latest-release";
      const top = node("div", "rel-top");
      top.append(node("span", "rel-ver", release.tag), node("span", "rel-badge", t.latest));
      const date = new Date(release.publishedAt);
      if (Number.isFinite(date.getTime())) top.append(node("span", "rel-date", `${t.released} ${date.toLocaleDateString(t.lang)}`));
      const buttons = node("div", "rel-btns");
      for (const asset of release.assets) {
        const url = new URL(asset.oss);
        if (url.protocol !== "https:") throw new Error("Invalid download URL");
        const link = node("a", "rel-b");
        link.href = url.href;
        link.dataset.os = asset.key;
        link.append(node("span", "os", asset.os), node("span", "arch", `${asset.arch} · ${(asset.size / 1048576).toFixed(0)} MB`), node("span", "via", t.mirror));
        buttons.append(link);
      }
      const foot = node("div", "rel-foot");
      const notes = node("a", "", t.notesLink);
      notes.href = `https://github.com/blksails/pi-desktop/releases/tag/${encodeURIComponent(release.tag)}`;
      notes.target = "_blank";
      notes.rel = "noopener";
      foot.append(notes);
      card.append(top, buttons, foot);
      document.getElementById("latest-release").replaceWith(card);
      // The build snapshot may now contain the same release in its history.
      for (const old of document.querySelectorAll(".rel-hist .rel-card")) {
        if (old.querySelector(".rel-ver")?.textContent === release.tag) old.remove();
      }
      status.textContent = `${t.checked} · ${new Date().toLocaleTimeString(t.lang)}`;
    } catch {
      status.textContent = t.failed;
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener("click", refresh);
  refresh();
})();
