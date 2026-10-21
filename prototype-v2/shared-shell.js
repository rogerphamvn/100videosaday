(() => {
  "use strict";
  const nav = document.querySelector(".side-nav, .studio-nav");
  if (!nav) return;
  const items = [
    ["projects", "Dự án", "/studio#projects", "M3 7h7l2 2h9v11H3zM3 7V4h7l2 3"],
    ["insight", "Insight sản phẩm", "/?tab=insight", "M9 18h6M10 21h4M8 14a7 7 0 1 1 8 0l-1 2H9z"],
    ["creative", "Creative Lab", "/?tab=creative", "M9 3h6M10 3v6l-6 11h16L14 9V3M8 15h8"],
    ["remix", "Test & Remix", "/?tab=remix", "M4 6h4l8 12h4M4 18h4l8-12h4M17 3l3 3-3 3M17 15l3 3-3 3"],
    ["video", "Video Studio", "/?tab=video", "M3 5h13v14H3zM16 10l5-3v10l-5-3"],
    ["production", "Production", "/studio#production", "M4 20V10l6 3V6l6 3V3h4v17z"],
    ["research", "Research", "/studio#research", "M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0"],
    ["voice", "Voice", "/studio#voice", "M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0zM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"],
    ["quality", "Quality", "/studio#quality", "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"]
  ];
  nav.classList.add("shared-nav");
  nav.setAttribute("aria-label", "Các khu vực Creative Hook Lab");
  nav.replaceChildren(...items.map(([id, label, href, path]) => {
    const link = document.createElement("a");
    link.href = href;
    link.dataset.shellSection = id;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    const shape = document.createElementNS(svg.namespaceURI, "path");
    shape.setAttribute("d", path); svg.append(shape);
    const text = document.createElement("span"); text.textContent = label;
    link.append(svg, text);
    return link;
  }));
  const shell = document.querySelector("[data-workspace]");
  function update() {
    const hash = location.hash.slice(1);
    const active = shell ? shell.dataset.workspace : ["projects", "production", "research", "voice", "quality"].includes(hash) ? hash : "production";
    for (const link of nav.querySelectorAll("a")) {
      const selected = link.dataset.shellSection === active;
      link.classList.toggle("is-current", selected);
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }
  window.addEventListener("hashchange", update);
  if (shell) new MutationObserver(update).observe(shell, { attributes: true, attributeFilter: ["data-workspace"] });
  update();
})();
