(() => {
  "use strict";
  const hash = location.hash.replace(/^#/, "").toLowerCase();
  const query = new URLSearchParams(location.search);
  const tab = String(query.get("tab") || "").toLowerCase();
  const map = {
    projects: "project", project: "project", insight: "insight", creative: "hooks",
    remix: "remix", video: "video", production: "production", research: "research",
    voice: "voice", quality: "quality"
  };
  const focus = map[hash] || map[tab] || "production";
  const target = new URL("/workflow", location.origin);
  target.searchParams.set("focus", focus);
  const projectId = query.get("projectId");
  if (projectId && /^project_[a-z0-9-]{1,120}$/i.test(projectId)) target.searchParams.set("projectId", projectId);
  location.replace(`${target.pathname}${target.search}`);
})();
