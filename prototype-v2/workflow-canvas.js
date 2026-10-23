(function workflowCanvasModule(scope) {
  "use strict";

  const VERSION = 2;
  const STORE_PREFIX = "creative-hook-lab:workflow-node-canvas:";
  const MAX_HISTORY = 30;
  const WORLD = { width: 1960, height: 1320 };
  const PROVIDERS = new Set(["fal", "openrouter", "replicate"]);
  const RATIOS = new Set(["9:16", "1:1", "16:9"]);
  const DURATIONS = new Set([15, 30, 45, 60]);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const clean = (value, max = 120) => String(value ?? "").trim().slice(0, max);
  const normalize = (value) => clean(value, 240).replace(/[đĐ]/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const safeObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const asArray = (value) => Array.isArray(value) ? value : [];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
  const durationSegmentCount = (value) => DURATIONS.has(Number(value)) ? Number(value) / 15 : 0;
  function videoEdgeList(duration) {
    const count = durationSegmentCount(duration); if (!count) return [];
    const result = [["selected-hook", "video"], ["video", "segment-1"]];
    for (let index = 1; index < count; index += 1) result.push([`segment-${index}`, `segment-${index + 1}`]);
    result.push([`segment-${count}`, "motion"], ["motion", "audit"]);
    return result;
  }
  function upgradeStoredState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || ![1, VERSION].includes(Number(value.version))) return null;
    if (Number(value.version) === VERSION) return value;
    return { ...value, version: VERSION, image: value.image && typeof value.image === "object" ? value.image : { provider: "fal", modelId: "" }, video: value.video && typeof value.video === "object" ? value.video : { provider: "fal", modelId: "", ratio: "9:16", duration: 60 }, positions: value.positions && typeof value.positions === "object" ? value.positions : { overview: {}, video: {} }, views: value.views && typeof value.views === "object" ? value.views : { overview: { x: 20, y: 24, zoom: .68 }, video: { x: 20, y: 28, zoom: .82 } }, notes: asArray(value.notes) };
  }

  function parseCommand(raw, context = {}) {
    const input = clean(raw, 240), text = normalize(input);
    if (!text) return { ok: false, message: "Hãy nhập một lệnh." };
    let match;
    if (/^(vua man hinh|fit|fit view)$/.test(text)) return { ok: true, action: { type: "FIT" }, message: "Đã đưa workflow vừa màn hình." };
    if (/^(sap xep lai|dat lai bo cuc|reset layout)$/.test(text)) return { ok: true, action: { type: "RESET_LAYOUT" }, message: "Đã đưa node về bố cục chuẩn." };
    if (/^(quay lai|tong quan|overview)$/.test(text)) return { ok: true, action: { type: "BACK_OVERVIEW" }, message: "Đã về workflow tổng quan." };
    if (/^(mo flow video|mo tao video|video flow)$/.test(text)) return { ok: true, action: { type: "OPEN_VIDEO" }, message: "Đã mở flow video theo đoạn 15 giây." };
    if (/^(kiem tra ket noi|kiem tra key|preflight)$/.test(text)) return { ok: true, action: { type: "PREFLIGHT" }, message: "Đang mở preflight an toàn; thao tác này không chạy inference." };
    if (/^(chay pilot|bat dau pilot)$/.test(text)) return { ok: true, action: { type: "RUN" }, message: "Đã chuyển lệnh sang budget guard hiện có." };
    if ((match = text.match(/^(?:provider|chon provider|doi provider sang)\s+(fal(?:\.ai)?|openrouter|replicate)$/))) return { ok: true, action: { type: "SET_PROVIDER", value: match[1].startsWith("fal") ? "fal" : match[1] }, message: "Đã đổi provider planning." };
    if ((match = input.match(/^(?:model|chọn model|chon model)\s+(.+)$/iu))) return { ok: true, action: { type: "SET_MODEL", value: clean(match[1], 160) }, message: "Đã chọn model nếu model nằm trong catalog server." };
    if ((match = text.match(/^(?:thoi luong|duration)\s+(15|30|45|60)\s*(?:s|giay)?$/))) return { ok: true, action: { type: "SET_DURATION", value: Number(match[1]) }, message: `Đã đặt thời lượng ${match[1]} giây.` };
    if ((match = text.match(/^video\s*(15|30|45|60)\s*(?:s|giay)?$/))) return { ok: true, action: { type: "OPEN_VIDEO_DURATION", value: Number(match[1]) }, message: `Đã mở flow video ${match[1]} giây.` };
    if ((match = text.match(/^(?:ty le|ratio)\s+(9:16|1:1|16:9)$/))) return { ok: true, action: { type: "SET_RATIO", value: match[1] }, message: `Đã đặt tỷ lệ ${match[1]}.` };
    if ((match = input.match(/^(?:chọn|chon|select)\s+(.+)$/iu))) return { ok: true, action: { type: "SELECT_BY_NAME", value: clean(match[1], 80) }, message: "Đã chọn node." };
    if ((match = input.match(/^(?:di chuyển|di chuyen|move)\s+(.+?)\s+(-?\d+)\s+(-?\d+)$/iu))) return { ok: true, action: { type: "MOVE_BY_NAME", value: clean(match[1], 80), x: Number(match[2]), y: Number(match[3]) }, message: "Đã cập nhật vị trí node." };
    if ((match = input.match(/^(?:thêm ghi chú|them ghi chu|add note)\s+(.+)$/iu))) return { ok: true, action: { type: "ADD_NOTE", value: clean(match[1], 100) }, message: "Đã thêm ghi chú cục bộ." };
    const knownNames = asArray(context.nodeNames).map(normalize);
    if (knownNames.includes(text)) return { ok: true, action: { type: "SELECT_BY_NAME", value: input }, message: "Đã chọn node." };
    return { ok: false, message: "Lệnh này chưa được hỗ trợ. Có thể chọn/di chuyển node, đổi provider/model/tỷ lệ/thời lượng, fit canvas, preflight hoặc chạy pilot khi guard đã mở." };
  }

  scope.WorkflowCanvasCore = { parseCommand, normalize, durationSegmentCount, videoEdgeList, upgradeStoredState };
  if (typeof document === "undefined") return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const app = $("[data-wc-app]");
  if (!app) return;
  const CREDENTIAL_PROVIDERS = ["openrouter", "fal", "replicate"];
  const credentialState = { metadata: null, loading: false, models: null, modelsLoading: false, returnFocus: null };
  const FOCUS_MAP = { projects: "project", project: "project", insight: "analyze", analyze: "analyze", creative: "hooks", hooks: "hooks", research: "research", prompt: "prompt", image: "image", video: "video", remix: "test", test: "test", production: "production", voice: "voice", quality: "quality" };
  const requestedFocus = clean(new URLSearchParams(location.search).get("focus"), 40);
  const requestedFocusNode = FOCUS_MAP[requestedFocus] || "";

  const overviewGraph = [
    { id: "project", title: "Dự án", icon: "□", kind: "project", x: 40, y: 120, w: 240, h: 160 },
    { id: "source", title: "Sản phẩm", icon: "▧", kind: "source", x: 330, y: 90, w: 300, h: 235 },
    { id: "analyze", title: "Insight", icon: "◉", kind: "stage", x: 680, y: 115, w: 250, h: 170 },
    { id: "research", title: "Research", icon: "⌕", kind: "stage", x: 980, y: 115, w: 250, h: 170 },
    { id: "hooks", title: "Creative hooks", icon: "▤", kind: "hooks", x: 1280, y: 95, w: 280, h: 205 },
    { id: "prompt", title: "MEGA + Negative JSON", icon: "{}", kind: "prompt", x: 1280, y: 380, w: 280, h: 185 },
    { id: "image", title: "Tạo ảnh", icon: "▧", kind: "image", x: 650, y: 520, w: 255, h: 225 },
    { id: "video", title: "Tạo video", icon: "▹", kind: "video", x: 970, y: 500, w: 255, h: 245 },
    { id: "voice", title: "Voice", icon: "◖", kind: "voice", x: 1280, y: 645, w: 250, h: 165 },
    { id: "production", title: "Production", icon: "▥", kind: "production", x: 710, y: 870, w: 270, h: 175 },
    { id: "quality", title: "Quality", icon: "✓", kind: "quality", x: 1040, y: 870, w: 250, h: 175 },
    { id: "test", title: "Test & Remix", icon: "↻", kind: "test", x: 1350, y: 870, w: 260, h: 180 }
  ];
  const overviewEdges = [["project", "source"], ["source", "analyze"], ["analyze", "research"], ["research", "hooks"], ["hooks", "prompt"], ["prompt", "image"], ["prompt", "video"], ["prompt", "voice"], ["image", "production"], ["video", "production"], ["voice", "production"], ["production", "quality"], ["quality", "test"]];
  const videoGraph = [
    { id: "selected-hook", title: "Hook đã chọn", icon: "◉", kind: "hook", x: 55, y: 70, w: 250, h: 145 },
    { id: "video", title: "Tạo video", icon: "▹", kind: "video", x: 60, y: 310, w: 260, h: 300 },
    { id: "segment-1", title: "01 · Hook", icon: "01", kind: "segment", x: 390, y: 310, w: 210, h: 225 },
    { id: "segment-2", title: "02 · Use case", icon: "02", kind: "segment", x: 640, y: 310, w: 210, h: 225 },
    { id: "segment-3", title: "03 · Demo", icon: "03", kind: "segment", x: 890, y: 310, w: 210, h: 225 },
    { id: "segment-4", title: "04 · CTA", icon: "04", kind: "segment", x: 1140, y: 310, w: 210, h: 225 },
    { id: "motion", title: "Ghép & Motion", icon: "⌁", kind: "motion", x: 520, y: 665, w: 320, h: 150 },
    { id: "audit", title: "Audit", icon: "⌕", kind: "audit", x: 920, y: 665, w: 255, h: 150 }
  ];
  const state = {
    projects: [], projectId: "", snapshot: null, preflight: null,
    mode: "overview", selectedId: "analyze", positions: { overview: {}, video: {} },
    views: { overview: { x: 20, y: 24, zoom: .68 }, video: { x: 20, y: 28, zoom: .82 } },
    image: { provider: "fal", modelId: "" }, video: { provider: "fal", modelId: "", ratio: "9:16", duration: 60 },
    notes: [], history: [], future: [], interaction: null, renderFrame: 0,
    mediaCatalog: { provider: "", mediaType: "", source: "", warning: "", fallbackUsed: false, runtimePolicy: {}, models: [], loading: false, error: "" }
  };
  function setWorkspaceMode(mode) {
    const next = mode === "canvas" ? "canvas" : "autopilot"; app.dataset.wcMode = next;
    $$('[data-wc-mode-button]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.wcModeButton === next)));
    if (next === "canvas") requestAnimationFrame(() => { fitView(); render(); });
  }

  function graph() {
    const builtins = state.mode === "video" ? videoGraph : overviewGraph;
    const segmentCount = durationSegmentCount(state.video.duration);
    const visibleBuiltins = state.mode === "video" ? builtins.filter((node) => !/^segment-/.test(node.id) || Number(node.id.split("-")[1]) <= segmentCount) : builtins;
    return [...visibleBuiltins, ...state.notes.filter((note) => note.mode === state.mode).map((note) => ({ ...note, kind: "note", w: 230, h: 140, icon: "+" }))];
  }
  function edges() {
    if (state.mode !== "video") return overviewEdges;
    return videoEdgeList(state.video.duration);
  }
  function nodeById(id) { return graph().find((node) => node.id === id); }
  function nodePosition(node) { return state.positions[state.mode][node.id] || { x: node.x, y: node.y }; }
  function currentView() { return state.views[state.mode]; }
  function storageKey(projectId = state.projectId) { return `${STORE_PREFIX}${projectId}`; }
  function serializable() { return { version: VERSION, mode: state.mode, selectedId: state.selectedId, positions: state.positions, views: state.views, image: state.image, video: state.video, notes: state.notes }; }
  function clonePresent() { return JSON.parse(JSON.stringify(serializable())); }
  function save() {
    if (!state.projectId) return;
    try { localStorage.setItem(storageKey(), JSON.stringify(serializable())); $("[data-wc-save-state]").lastChild.textContent = "Đã lưu cục bộ"; } catch { $("[data-wc-save-state]").lastChild.textContent = "Không thể lưu cục bộ"; }
  }
  function load(projectId) {
    state.mode = "overview"; state.selectedId = "analyze"; state.positions = { overview: {}, video: {} }; state.views = { overview: { x: 20, y: 24, zoom: .68 }, video: { x: 20, y: 28, zoom: .82 } }; state.image = { provider: "fal", modelId: "" }; state.video = { provider: "fal", modelId: "", ratio: "9:16", duration: 60 }; state.notes = []; state.history = []; state.future = [];
    if (!projectId) return;
    try {
      const raw = upgradeStoredState(JSON.parse(localStorage.getItem(storageKey(projectId)) || "null"));
      if (!raw) return;
      if (["overview", "video"].includes(raw.mode)) state.mode = raw.mode;
      if (raw.positions && raw.positions.overview && raw.positions.video) {
        for (const mode of ["overview", "video"]) for (const [id, position] of Object.entries(raw.positions[mode])) if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) state.positions[mode][id] = { x: clamp(position.x, -500, 2200), y: clamp(position.y, -500, 1500) };
      }
      for (const mode of ["overview", "video"]) { const view = raw.views?.[mode]; if (Number.isFinite(view?.x) && Number.isFinite(view?.y) && Number.isFinite(view?.zoom)) state.views[mode] = { x: clamp(view.x, -2600, 2600), y: clamp(view.y, -1800, 1800), zoom: clamp(view.zoom, .35, 1.5) }; }
      if (PROVIDERS.has(raw.image?.provider)) state.image.provider = raw.image.provider;
      if (typeof raw.image?.modelId === "string") state.image.modelId = clean(raw.image.modelId, 180);
      if (PROVIDERS.has(raw.video?.provider)) state.video.provider = raw.video.provider;
      if (typeof raw.video?.modelId === "string") state.video.modelId = clean(raw.video.modelId, 180);
      if (RATIOS.has(raw.video?.ratio)) state.video.ratio = raw.video.ratio;
      if (DURATIONS.has(Number(raw.video?.duration))) state.video.duration = Number(raw.video.duration);
      state.notes = asArray(raw.notes).filter((note) => /^note-\d+$/.test(note?.id) && ["overview", "video"].includes(note?.mode) && Number.isFinite(note?.x) && Number.isFinite(note?.y)).slice(0, 24).map((note) => ({ id: note.id, title: clean(note.title, 100) || "Ghi chú", mode: note.mode, x: clamp(note.x, -300, 1900), y: clamp(note.y, -300, 1200) }));
      if (typeof raw.selectedId === "string") state.selectedId = raw.selectedId;
    } catch { /* ignore stale local state */ }
  }
  function pushHistory() { state.history.push(clonePresent()); if (state.history.length > MAX_HISTORY) state.history.shift(); state.future = []; }
  function restore(present) { if (!present) return; state.mode = present.mode; state.selectedId = present.selectedId; state.positions = present.positions; state.views = present.views; state.image = present.image || { provider: "fal", modelId: "" }; state.video = present.video; state.notes = present.notes; render(); save(); }
  function undo() { if (!state.history.length) return false; state.future.push(clonePresent()); restore(state.history.pop()); return true; }
  function redo() { if (!state.future.length) return false; state.history.push(clonePresent()); restore(state.future.pop()); return true; }

  function activeRun() { return safeObject(state.snapshot?.activeRun); }
  function currentStages() { const runId = activeRun().id; return asArray(state.snapshot?.stages).filter((item) => !runId || item.runId === runId); }
  function stage(name) { return currentStages().filter((item) => item.stage === name).at(-1) || null; }
  function stageStatus(name) { const item = stage(name); return item?.provenance?.cacheHit || item?.origin === "cache" ? "cache" : item?.status || "pending"; }
  function sourceUrl(kind, fallbackIndex = 0) { const item = asArray(state.snapshot?.sources).find((source) => source.kind === kind) || asArray(state.snapshot?.sources)[fallbackIndex]; const url = item?.url || item?.previewUrl || item?.dataUrl || ""; return /^(?:data:image\/|https?:\/\/)/.test(url) ? url : ""; }
  function strategyHooks() { const output = safeObject(stage("strategy")?.output); return asArray(output.hooks).slice(0, 3).map((item) => typeof item === "string" ? item : item.hook || item.statement || item.title).filter(Boolean); }
  function selectedHook() { return strategyHooks()[0] || ""; }
  function graphNodeStatus(node) {
    const map = { analyze: "analyze", research: "research", hooks: "strategy", prompt: "prompts", image: "prompts", video: "prompts" };
    if (map[node.id]) return stageStatus(map[node.id]);
    if (node.id === "project" && state.projectId) return "complete";
    if (node.id === "source" && asArray(state.snapshot?.sources).length) return "complete";
    if (node.id === "production" && asArray(state.snapshot?.productionBatches).length) return "complete";
    if (["image", "video"].includes(node.id) && asArray(state.snapshot?.mediaJobs).some((job) => job.mediaType === node.id && job.status === "complete")) return "complete";
    return "pending";
  }
  function statusClass(status) { return status === "complete" || status === "imported" ? "is-complete" : status === "running" ? "is-running" : status === "cache" ? "is-cache" : ""; }
  function chip(status) { if (status === "complete" || status === "imported") return '<span class="wc-node-chip is-success">Hoàn tất</span>'; if (status === "running") return '<span class="wc-node-chip is-warning">Đang chạy</span>'; if (status === "cache") return '<span class="wc-node-chip is-hypothesis">Cache hit</span>'; return '<span class="wc-node-chip">Chờ chạy</span>'; }
  function promptChip(status) { if (status === "complete" || status === "imported") return '<span class="wc-node-chip is-success">Prompt sẵn sàng</span>'; if (status === "running") return '<span class="wc-node-chip is-warning">Đang viết prompt</span>'; if (status === "cache") return '<span class="wc-node-chip is-hypothesis">Prompt từ cache</span>'; return '<span class="wc-node-chip">Chờ prompt</span>'; }
  function imageMarkup(url, portrait = false) { return url ? `<div class="wc-node-media${portrait ? " is-portrait" : ""}"><img src="${escapeHtml(url)}" alt="Ảnh source sản phẩm"></div>` : `<div class="wc-node-upload">Chưa có ảnh</div>`; }
  function bodyMarkup(node) {
    const status = graphNodeStatus(node), product = sourceUrl("product"), packaging = sourceUrl("packaging", 1), hooks = strategyHooks();
    if (node.id === "project") { const snapshotProject = safeObject(state.snapshot?.project), project = Object.keys(snapshotProject).length ? snapshotProject : state.projects.find((item) => item.id === state.projectId) || {}; return `<strong>${escapeHtml(project.name || "Dự án đang chọn")}</strong><p>${escapeHtml(project.product || project.market || "Mở để tạo hoặc đổi dự án")}</p>${chip(status)}`; }
    if (node.id === "source") return `<div class="wc-node-source-grid">${imageMarkup(product)}<div class="wc-node-source-side">${imageMarkup(packaging)}<div class="wc-node-upload">+ ${asArray(state.snapshot?.sources).length} ảnh</div></div></div>`;
    if (node.id === "analyze") return `<strong>Nhu cầu · Pain point</strong><p>${escapeHtml(stage("analyze")?.output?.category || "Phân tích từ source sản phẩm thật")}</p>${chip(status)}`;
    if (node.id === "research") return `<strong>Nguồn web · Xu hướng</strong><p>${asArray(stage("research")?.output?.evidence).length || asArray(stage("research")?.output?.sources).length} nguồn đã lưu</p>${chip(status)}`;
    if (node.id === "hooks") return hooks.length ? `<ul class="wc-node-list">${hooks.map((hook, index) => `<li><span>${index + 1}</span>${escapeHtml(hook)}</li>`).join("")}</ul><span class="wc-node-chip is-hypothesis">Giả thuyết</span>` : '<div class="wc-node-upload">Chưa có hook · chạy pipeline</div><span class="wc-node-chip">Chưa có dữ liệu</span>';
    if (node.id === "prompt") return `<strong>MEGA PROMPT + Negative</strong><p>Versioned JSON · backend validate · giữ provenance</p>${promptChip(status)}`;
    if (node.id === "image") return `${imageMarkup("", false)}<p>Chọn provider/model trong Thông số</p>${promptChip(status)}`;
    if (node.id === "video") return `${imageMarkup(product, state.mode === "overview")}<p>${state.video.duration}s · ${escapeHtml(state.video.ratio)} · ${Math.ceil(state.video.duration / 15)} đoạn planning · chưa tự render</p>${promptChip(status)}`;
    if (node.id === "test") return `<div class="wc-node-upload">↻</div><p>Chỉ xác nhận winner khi có measurement + evidence.</p>`;
    if (node.id === "voice") return `<strong>VieNeu-TTS</strong><p>Chỉ phát khi backend trả WAV thật.</p><span class="wc-node-chip">Theo trạng thái bridge</span>`;
    if (node.id === "production") return `<strong>Capacity plan</strong><p>Batch · concurrency · retry · budget. Plan không phải output.</p><span class="wc-node-chip">Mở để lập batch</span>`;
    if (node.id === "quality") return `<strong>8 cổng kiểm</strong><p>Product · Claims · Voice · Audio · Continuity · Format · Novelty · Human</p><span class="wc-node-chip">Backend authoritative</span>`;
    if (node.id === "selected-hook") { const hook = selectedHook(); return hook ? `<span class="wc-node-chip is-hypothesis">Giả thuyết</span><strong>“${escapeHtml(hook)}”</strong>` : '<span class="wc-node-chip">Chưa có dữ liệu</span><strong>Chưa có hook · chạy pipeline</strong>'; }
    if (/^segment-/.test(node.id)) return `${imageMarkup(product)}<p>Minh họa planning · 15s · chưa render</p>`;
    if (node.id === "motion") return `<strong>Cắt ghép · Voice · Phụ đề</strong><p>Planning layer; chưa render hoặc audit AI.</p>`;
    if (node.id === "audit") return `<strong>Chờ render</strong><p>Không có output giả khi media execution tắt.</p>`;
    if (node.kind === "note") return `<strong>${escapeHtml(node.title)}</strong><p>Ghi chú cục bộ của dự án.</p>`;
    return `<p>Chưa có dữ liệu.</p>`;
  }

  function renderNodes() {
    const root = $("[data-wc-nodes]"), nodes = graph(); root.replaceChildren();
    for (const node of nodes) {
      const position = nodePosition(node), button = document.createElement("article");
      button.setAttribute("role", "button"); button.tabIndex = 0; button.className = `wc-node ${statusClass(graphNodeStatus(node))}${state.selectedId === node.id ? " is-selected" : ""}`; button.dataset.wcNode = node.id; button.dataset.kind = node.kind; button.style.setProperty("--node-x", `${position.x}px`); button.style.setProperty("--node-y", `${position.y}px`); button.style.setProperty("--node-w", `${node.w}px`); button.style.setProperty("--node-h", `${node.h}px`); button.setAttribute("aria-pressed", String(state.selectedId === node.id)); button.setAttribute("aria-label", `${node.title}. Dùng phím mũi tên để di chuyển.`);
      button.innerHTML = `<div class="wc-node-head"><span class="wc-node-grip" aria-hidden="true"></span><span class="wc-node-icon" aria-hidden="true">${escapeHtml(node.icon)}</span><strong>${escapeHtml(node.title)}</strong><span class="wc-node-menu" aria-hidden="true">···</span></div><div class="wc-node-body">${bodyMarkup(node)}</div><span class="wc-node-port is-in" aria-hidden="true"></span><span class="wc-node-port is-out" aria-hidden="true"></span>`;
      root.append(button);
    }
    $("[data-wc-empty]").hidden = Boolean(state.projectId);
  }
  function edgePath(from, to) { const a = nodeById(from), b = nodeById(to); if (!a || !b) return ""; const ap = nodePosition(a), bp = nodePosition(b); if (bp.y > ap.y + a.h + 40) { const x1 = ap.x + a.w / 2, y1 = ap.y + a.h, x2 = bp.x + b.w / 2, y2 = bp.y, bend = Math.max(54, (y2 - y1) * .48); return `M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 - bend} ${x2},${y2}`; } const x1 = ap.x + a.w, y1 = ap.y + a.h / 2, x2 = bp.x, y2 = bp.y + b.h / 2, bend = Math.max(54, Math.abs(x2 - x1) * .46); return `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`; }
  function renderEdges() { const svg = $("[data-wc-edges]"); svg.setAttribute("viewBox", `0 0 ${WORLD.width} ${WORLD.height}`); svg.innerHTML = edges().map(([from, to]) => `<path class="wc-edge" d="${edgePath(from, to)}"></path>`).join(""); }
  function renderTransform() { const view = currentView(), world = $("[data-wc-world]"); world.style.transform = `translate3d(${view.x}px,${view.y}px,0) scale(${view.zoom})`; $("[data-wc-zoom]").textContent = `${Math.round(view.zoom * 100)}%`; }

  function selectedMediaType() { const node = nodeById(state.selectedId); return node?.kind === "video" ? "video" : node?.kind === "image" ? "image" : ""; }
  function mediaConfig(mediaType = selectedMediaType()) { return mediaType === "image" ? state.image : mediaType === "video" ? state.video : null; }
  function broadcastMediaPlan(mediaType = selectedMediaType()) { const config = mediaConfig(mediaType); if (mediaType && config) window.dispatchEvent(new CustomEvent("workflow:media-planning-changed", { detail: { mediaType, provider: config.provider, modelId: config.modelId, ratio: config.ratio || "", totalDuration: Number(config.duration || 0) } })); }
  function modelChoices(provider = mediaConfig()?.provider, mediaType = selectedMediaType()) {
    if (state.mediaCatalog.provider === provider && state.mediaCatalog.mediaType === mediaType && state.mediaCatalog.models.length) return state.mediaCatalog.models;
    return asArray(state.snapshot?.providerReadiness?.media?.modelChoices).filter((item) => item.provider === provider && item.mediaType === mediaType && item.modelId).map((item) => ({ ...item, id: item.modelId, name: item.name || item.modelId, available: item.supported !== false }));
  }
  async function readJson(response) { let payload = null; try { payload = await response.json(); } catch { /* safe message below */ } if (!response.ok) { const error = new Error(payload?.message || `Yêu cầu thất bại (${response.status}).`); error.code = payload?.code || payload?.error; error.status = response.status; throw error; } return payload || {}; }
  function normalizedCatalogModels(payload, provider, mediaType) {
    return asArray(payload.models).map((item) => {
      const value = typeof item === "string" ? { id: item } : safeObject(item), id = clean(value.id || value.modelId, 220);
      if (!id) return null;
      const adapterImplemented = value.adapterImplemented === true || value.executionImplemented === true;
      const blockedReason = clean(value.blockedReason || value.reason || (adapterImplemented ? "" : "provider_schema_not_verified"), 240);
      const providerAvailable = value.available !== false && value.supported !== false;
      return { id, modelId: id, name: clean(value.name || value.label || id, 220), provider, mediaType, available: providerAvailable && adapterImplemented, supported: providerAvailable && adapterImplemented, adapterImplemented, blockedReason, source: clean(value.source, 80), description: clean(value.description, 500), capabilities: safeObject(value.capabilities) };
    }).filter(Boolean);
  }
  async function loadMediaCatalog(force = false) {
    const mediaType = selectedMediaType(), config = mediaConfig(mediaType); if (!mediaType || !config) return;
    if (!force && state.mediaCatalog.provider === config.provider && state.mediaCatalog.mediaType === mediaType && (state.mediaCatalog.loading || state.mediaCatalog.models.length || state.mediaCatalog.error)) return;
    state.mediaCatalog = { provider: config.provider, mediaType, source: "", warning: "", fallbackUsed: false, runtimePolicy: {}, models: [], loading: true, error: "" }; renderMediaModelOptions();
    try {
      const payload = await readJson(await fetch(`/api/media/catalog?provider=${encodeURIComponent(config.provider)}&mediaType=${encodeURIComponent(mediaType)}`, { credentials: "same-origin" }));
      if (selectedMediaType() !== mediaType || mediaConfig(mediaType)?.provider !== config.provider) return;
      state.mediaCatalog = { provider: config.provider, mediaType, source: clean(payload.source || "live", 40), warning: clean(payload.warning, 120), fallbackUsed: payload.fallbackUsed === true, runtimePolicy: safeObject(payload.runtimePolicy), models: normalizedCatalogModels(payload, config.provider, mediaType), loading: false, error: "" };
    } catch (error) {
      if (selectedMediaType() !== mediaType || mediaConfig(mediaType)?.provider !== config.provider) return;
      state.mediaCatalog = { provider: config.provider, mediaType, source: "", warning: clean(error.code, 120), fallbackUsed: false, runtimePolicy: {}, models: [], loading: false, error: error.message };
    }
    renderMediaModelOptions();
  }
  function renderMediaModelOptions() {
    const mediaType = selectedMediaType(), config = mediaConfig(mediaType), model = $("[data-wc-model]"), source = $("[data-wc-catalog-source]"), search = normalize($("[data-wc-model-search]")?.value || "");
    if (!model || !source || !mediaType || !config) return;
    const allChoices = modelChoices(config.provider, mediaType), choices = search ? allChoices.filter((choice) => normalize(`${choice.name || ""} ${choice.modelId || choice.id || ""}`).includes(search)) : allChoices;
    const placeholder = state.mediaCatalog.loading ? "Đang tải catalog…" : state.mediaCatalog.error ? "Không tải được catalog" : allChoices.length && !choices.length ? "Không có model khớp tìm kiếm" : choices.length ? "Chọn model" : `Chưa có model ${config.provider} ${mediaType}`;
    model.replaceChildren(new Option(placeholder, ""));
    choices.forEach((choice) => { const id = choice.modelId || choice.id, blocked = choice.adapterImplemented === false || choice.available === false || choice.supported === false, suffix = blocked ? choice.blockedReason === "product_reference_not_supported" ? " · thiếu product reference" : " · chưa có adapter" : " · sẵn sàng chọn"; const option = new Option(`${choice.name || id}${choice.name && choice.name !== id ? ` · ${id}` : ""}${suffix}`, id); option.disabled = blocked; option.dataset.adapter = blocked ? "blocked" : "ready"; model.add(option); });
    if (choices.some((choice) => (choice.modelId || choice.id) === config.modelId && choice.available !== false && choice.supported !== false)) model.value = config.modelId;
    const runnable = allChoices.filter((choice) => choice.adapterImplemented !== false && choice.available !== false && choice.supported !== false).length;
    source.dataset.kind = state.mediaCatalog.error || state.mediaCatalog.warning === "media_provider_not_configured" ? "warning" : "";
    source.textContent = state.mediaCatalog.loading ? "Đang tải catalog backend…" : state.mediaCatalog.error ? `Không tải được catalog: ${state.mediaCatalog.error}` : state.mediaCatalog.warning === "media_provider_not_configured" ? `Chưa có key ${config.provider}. Đang hiển thị ${runnable} model fallback có adapter để chuẩn bị cấu hình.` : state.mediaCatalog.source ? `Catalog ${state.mediaCatalog.source === "live_provider_catalog" || state.mediaCatalog.source === "live" ? "live từ provider" : state.mediaCatalog.source === "curated_fallback" ? "fallback được kiểm soát" : state.mediaCatalog.source}: ${runnable}/${allChoices.length} model có adapter product-reference.` : "Catalog tạm lấy từ preflight; bấm chọn node để tải catalog mới.";
  }
  async function loadNodeMediaSettings() {
    if (!state.projectId) return;
    try {
      const payload = await readJson(await fetch(`/api/media/settings?projectId=${encodeURIComponent(state.projectId)}`, { credentials: "same-origin" }));
      const settings = asArray(payload.settings || payload.nodes || payload);
      for (const setting of settings) {
        const nodeId = setting.nodeId, mediaType = setting.mediaType;
        if (!['image','video'].includes(mediaType) || ![mediaType, `create-${mediaType}`].includes(nodeId) && nodeId !== mediaType) continue;
        const config = mediaConfig(mediaType); if (!config) continue;
        if (PROVIDERS.has(setting.provider)) config.provider = setting.provider;
        if (typeof setting.modelId === "string") config.modelId = clean(setting.modelId, 220);
        if (mediaType === "video" && RATIOS.has(setting.parameters?.aspectRatio || setting.parameters?.ratio)) config.ratio = setting.parameters.aspectRatio || setting.parameters.ratio;
        if (mediaType === "video" && DURATIONS.has(Number(setting.parameters?.totalDuration || setting.parameters?.duration))) config.duration = Number(setting.parameters.totalDuration || setting.parameters.duration);
      }
      render(); if (selectedMediaType()) loadMediaCatalog(true);
    } catch { /* Old backend or missing settings must not break the canvas. */ }
  }
  async function saveNodeMediaSettings() {
    const mediaType = selectedMediaType(), config = mediaConfig(mediaType), status = $("[data-wc-media-status]");
    if (!state.projectId || !mediaType || !config?.modelId) { status.textContent = "Hãy chọn dự án, provider và model trước."; return; }
    status.textContent = "Đang lưu model cho node…";
    try {
      await readJson(await fetch("/api/media/settings", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: state.projectId, nodeId: mediaType, provider: config.provider, mediaType, modelId: config.modelId, parameters: mediaType === "video" ? { aspectRatio: config.ratio, segmentSeconds: 15, totalDuration: config.duration, resolution: "720p", generateAudio: false } : {} }) }));
      status.textContent = "Đã lưu cho dự án. Chưa gửi job và chưa phát sinh phí."; broadcastMediaPlan(mediaType);
    } catch (error) { status.textContent = error.code === "media_provider_not_configured" ? `Chưa có key ${config.provider}. Model vẫn đang được giữ cục bộ; nhập key ở Thiết lập chạy rồi lưu lại.` : error.code === "media_model_adapter_unavailable" ? "Model có trong catalog nhưng chưa có adapter product-reference nên chưa thể lưu để chạy." : error.message; }
  }
  function syncMediaForm(mediaType = selectedMediaType()) {
    const config = mediaConfig(mediaType); if (!config) return;
    const provider = $("[data-media-provider]"), type = $("[data-media-type]"), model = $("[data-media-model]");
    if (provider && provider.value !== config.provider) { provider.value = config.provider; provider.dispatchEvent(new Event("change", { bubbles: true })); }
    if (type && type.value !== mediaType) { type.value = mediaType; type.dispatchEvent(new Event("change", { bubbles: true })); }
    if (model && config.modelId && [...model.options].some((option) => option.value === config.modelId && !option.disabled)) { model.value = config.modelId; model.dispatchEvent(new Event("change", { bubbles: true })); }
  }
  function renderInspector() {
    const node = nodeById(state.selectedId) || graph()[0], summary = $("[data-wc-selection-summary]"), mediaParams = $("[data-wc-media-params]");
    if (node) { const mediaEnabled = state.snapshot?.providerReadiness?.media?.executionEnabled === true; $("[data-wc-inspector-kicker]").textContent = node.kind === "video" ? "Video node" : "Đang chọn"; $("[data-wc-inspector-title]").textContent = node.title; summary.innerHTML = `<strong>${escapeHtml(node.title)}</strong><p>${["image", "video"].includes(node.kind) ? mediaEnabled ? "Chọn model và lưu vào dự án. Tạo job vẫn cần budget media riêng." : "Có thể chọn và lưu model; server đang khóa media execution nên chưa phát sinh job/phí." : "Kéo trực tiếp, dùng phím mũi tên hoặc nhập tọa độ bên dưới."}</p>${node.id === "video" && state.mode === "overview" ? '<button type="button" class="wc-button" data-wc-open-video-flow>Mở flow 15 giây</button>' : state.mode === "video" ? '<button type="button" class="wc-button" data-wc-back-overview>Về tổng quan</button>' : ""}`; }
    const mediaType = selectedMediaType(), config = mediaConfig(mediaType);
    mediaParams.hidden = !mediaType;
    $$('[data-wc-video-only]').forEach((control) => { control.hidden = mediaType !== "video"; });
    $$('[data-wc-provider-options] button').forEach((button) => button.classList.toggle("is-active", button.dataset.value === config?.provider));
    $$('[data-wc-ratio-options] button').forEach((button) => button.classList.toggle("is-active", button.dataset.value === state.video.ratio));
    $$('[data-wc-duration-options] button').forEach((button) => button.classList.toggle("is-active", Number(button.dataset.value) === state.video.duration));
    $("[data-wc-segments]").textContent = `${durationSegmentCount(state.video.duration)} × 15s · cấu hình planning cục bộ; chưa gửi provider`;
    if (mediaType) renderMediaModelOptions();
    const position = node ? nodePosition(node) : { x: 0, y: 0 }; $("[data-wc-node-x]").value = Math.round(position.x); $("[data-wc-node-y]").value = Math.round(position.y);
    const cache = safeObject(state.snapshot?.aiCache), policy = safeObject(cache.policy), stats = safeObject(cache.stats);
    if (Number.isFinite(Number(policy.ttlHours))) $("[data-wc-cache-form] [name='ttlHours']").value = Number(policy.ttlHours);
    if (Number.isFinite(Number(policy.maxEntries))) $("[data-wc-cache-form] [name='maxEntries']").value = Number(policy.maxEntries);
    if (Number.isFinite(Number(policy.preflightGetAttempts))) $("[data-wc-cache-form] [name='preflightGetAttempts']").value = Number(policy.preflightGetAttempts);
    $("[data-wc-cache-stats]").textContent = cache.policy ? `${Number(stats.validEntries || 0)}/${Number(stats.entries || 0)} hợp lệ · research ${Number(policy.effectiveResearchTtlHours || Math.min(Number(policy.ttlHours || 6), 6))}h` : "Backend chưa trả cache";
    const stageName = { analyze: "analyze", research: "research", hooks: "strategy", prompt: "prompts", image: "prompts", video: "prompts" }[node?.id], stageItem = stageName ? stage(stageName) : null, provenance = safeObject(stageItem?.provenance), promptPolicy = safeObject(provenance.promptPolicy), cacheUsage = safeObject(provenance.cacheUsage), cachedTokens = Number(cacheUsage.cachedTokens), providerHit = cacheUsage.status === "hit" || (Number.isFinite(cachedTokens) && cachedTokens > 0);
    $("[data-wc-provider-cache]").textContent = providerHit ? `Provider prompt-cache: hit · ${Number.isFinite(cachedTokens) ? cachedTokens.toLocaleString("vi-VN") : "không rõ"} cached tokens.` : cacheUsage.status === "write" ? `Provider prompt-cache: write · ${Number.isFinite(Number(cacheUsage.cacheWriteTokens)) ? Number(cacheUsage.cacheWriteTokens).toLocaleString("vi-VN") : "không rõ"} tokens được ghi.` : cacheUsage.status === "miss" ? "Provider prompt-cache: miss. Lần gọi này không được tính là cache hit." : "Provider prompt-cache: provider chưa báo số liệu.";
    const stableBytes = Number(promptPolicy.stablePrefixBytes), dynamicBytes = Number(promptPolicy.dynamicContextBytes), imageInputs = Number(promptPolicy.imageInputs); $("[data-wc-context-bytes]").textContent = Number.isFinite(stableBytes) ? `Stable prefix ${stableBytes.toLocaleString("vi-VN")} bytes · dynamic context ${Number.isFinite(dynamicBytes) ? dynamicBytes.toLocaleString("vi-VN") : "—"} bytes · ${Number.isFinite(imageInputs) ? imageInputs : 0} ảnh · policy ${promptPolicy.mode || "none"}.` : "Context theo stage chưa có số liệu.";
  }
  function renderHeader() {
    const budget = safeObject(state.snapshot?.pilotBudget), hasBudget = Object.keys(budget).length > 0, spent = Number(budget.spentUsd || 0), held = Number(budget.heldUsd || 0), remaining = Number(budget.remainingUsd ?? Math.max(0, Number(budget.capUsd || 0) - spent - held));
    $("[data-wc-budget-spent]").textContent = hasBudget ? `$${spent.toFixed(2)} đã dùng` : "— đã dùng"; $("[data-wc-budget-held]").textContent = hasBudget ? `$${held.toFixed(2)} giữ` : "— giữ"; $("[data-wc-budget-remaining]").textContent = hasBudget ? `$${remaining.toFixed(2)} còn` : "— còn";
    $(".wc-budget-brief").setAttribute("aria-label", hasBudget ? `Ngân sách pilot: đã dùng ${spent.toFixed(2)} đô la, đang giữ ${held.toFixed(2)} đô la, còn ${remaining.toFixed(2)} đô la; trạng thái ${budget.state || "không rõ"}.` : "Ngân sách pilot chưa tải.");
    const originalRun = $("[data-run-workflow]"), proxyRun = $("[data-wc-run]"), modalRun = $("[data-wc-provider-run-action]");
    proxyRun.disabled = !originalRun || originalRun.disabled;
    if (modalRun) modalRun.disabled = !originalRun || originalRun.disabled;
    const originalPreflight = $("[data-provider-preflight]"), modalPreflight = $("[data-wc-provider-preflight-action]");
    if (modalPreflight) modalPreflight.disabled = !originalPreflight || originalPreflight.disabled;
    const ready = state.preflight?.ready === true && originalRun && !originalRun.disabled, key = safeObject(state.preflight?.pilotKey), creditsMode = key.billingMode === "openrouter_credits";
    const readiness = $("[data-wc-readiness]"); readiness.classList.toggle("is-ready", ready);
    const checked = Number.isFinite(Number(state.preflight?.checkedAt));
    readiness.innerHTML = `<span aria-hidden="true"></span>${ready ? (creditsMode ? "Credit cap đạt · BYOK kiểm tra khi chạy" : "Strict total cap đã đạt · Sẵn sàng chạy") : checked ? (creditsMode ? "Cap OpenRouter credits chưa đạt · Chạy đang khóa" : key.includesByok === false ? "Strict cap chưa bao gồm BYOK · Chạy đang khóa" : "Preflight/cap chưa đạt · Chạy đang khóa") : "Chưa kiểm tra key · Chạy đang khóa"}`;
    const modalStatus = $("[data-wc-provider-run-status]");
    if (modalStatus) modalStatus.textContent = ready ? "Đã kiểm tra xong. Chạy pilot chỉ bắt đầu khi anh bấm nút bên cạnh." : checked ? "Kiểm tra chưa đạt; nút chạy vẫn khóa. Xem chẩn đoán ở phần Kết nối API." : "Kiểm tra key, model và budget guard trước khi chạy.";
    $("[data-wc-design-state]").textContent = `${state.mode === "video" ? "Flow video 15s" : "Bản thiết kế"} · ${activeRun().status || "Chưa chạy AI"}`;
  }
  function renderTimeline() {
    let timeline = $("[data-wc-timeline]");
    if (state.mode !== "video") { timeline?.remove(); return; }
    if (!timeline) { timeline = document.createElement("div"); timeline.className = "wc-timeline"; timeline.dataset.wcTimeline = ""; $("[data-wc-viewport]").append(timeline); }
    const count = durationSegmentCount(state.video.duration), labels = ["Hook", "Use case", "Demo", "CTA"];
    timeline.innerHTML = `<button type="button" aria-label="Preview chưa khả dụng" disabled>▷</button><div>${labels.slice(0, count).map((label, index) => `<span${index === 0 ? ' class="is-active"' : ""}><b>0${index + 1} · ${label}</b><small>15s</small></span>`).join("")}</div><output>00:${String(state.video.duration).padStart(2, "0")}</output>`;
  }
  function render() { renderNodes(); renderEdges(); renderTransform(); renderInspector(); renderHeader(); renderTimeline(); save(); }

  function resetInspectorScroll() { const panel = $("[data-wc-panel='params']"); if (panel) requestAnimationFrame(() => { panel.scrollTop = 0; }); }
  function setSelection(id) { if (!nodeById(id)) return { ok: false, message: "Node không tồn tại trong flow đang mở." }; state.selectedId = id; render(); resetInspectorScroll(); if (selectedMediaType()) loadMediaCatalog(); return { ok: true }; }
  function findNodeByName(name) { const needle = normalize(name); return graph().find((node) => normalize(node.id) === needle || normalize(node.title) === needle || normalize(node.title).includes(needle)); }
  function fitView() {
    const viewport = $("[data-wc-viewport]"), nodes = graph(); if (!nodes.length) return;
    const bounds = nodes.reduce((acc, node) => { const p = nodePosition(node); return { minX: Math.min(acc.minX, p.x), minY: Math.min(acc.minY, p.y), maxX: Math.max(acc.maxX, p.x + node.w), maxY: Math.max(acc.maxY, p.y + node.h) }; }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const width = Math.max(1, bounds.maxX - bounds.minX), height = Math.max(1, bounds.maxY - bounds.minY), zoom = clamp(Math.min((viewport.clientWidth - 90) / width, (viewport.clientHeight - 150) / height), .35, 1.1);
    state.views[state.mode] = { zoom, x: (viewport.clientWidth - width * zoom) / 2 - bounds.minX * zoom, y: Math.max(24, (viewport.clientHeight - height * zoom) / 2 - bounds.minY * zoom - (state.mode === "video" ? 40 : 0)) };
  }
  async function cachePolicySet(values) {
    if (!state.projectId) throw new Error("Hãy chọn dự án.");
    const response = await fetch("/api/workflow", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cache.policy.set", projectId: state.projectId, ...values }) });
    let payload = null; try { payload = await response.json(); } catch { /* safe error below */ }
    if (!response.ok) throw new Error(payload?.message || `Backend chưa hỗ trợ cache policy (${response.status}).`);
    return payload;
  }

  function credentialDate(value) { if (!value) return ""; const date = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value); return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date); }
  function credentialMetadata(payload) {
    const providers = asArray(payload?.providers).filter((item) => CREDENTIAL_PROVIDERS.includes(item?.provider)).map((item) => ({ provider: item.provider, configured: item.configured === true, source: ["vault", "environment", "none"].includes(item.source) ? item.source : "none", updatedAt: item.updatedAt || null }));
    return { vaultReady: payload?.vaultReady === true, providers };
  }
  function renderProviderCredentials() {
    const metadata = credentialState.metadata, vaultReady = metadata?.vaultReady === true, vault = $("[data-wc-provider-vault-state]");
    vault.dataset.kind = metadata && !vaultReady ? "error" : "";
    vault.textContent = !metadata ? "Chưa tải được trạng thái vault." : vaultReady ? "Vault đã sẵn sàng. Có thể lưu hoặc thay key; thao tác lưu không chạy model hay tạo media." : "Vault chưa sẵn sàng để nhận key mới. Secret Cloudflare hiện có vẫn có thể được backend sử dụng.";
    for (const provider of CREDENTIAL_PROVIDERS) {
      const form = $(`[data-wc-provider-form="${provider}"]`), item = metadata?.providers.find((entry) => entry.provider === provider) || { configured: false, source: "none" }, stateNode = $("[data-wc-provider-state]", form), status = $("[data-wc-provider-status]", form), submit = $("button[type='submit']", form), updated = credentialDate(item.updatedAt);
      stateNode.dataset.kind = item.configured ? "ready" : "";
      stateNode.textContent = item.configured ? item.source === "vault" ? "Vault" : item.source === "environment" ? "Secret hiện có" : "Đã cấu hình" : "Chưa cấu hình";
      if (!form.dataset.pendingCheck) status.textContent = item.configured ? `${item.source === "vault" ? "Key đã lưu trong vault" : "Đang dùng Secret Cloudflare"}${updated ? ` · cập nhật ${updated}` : ""}. Không hiển thị giá trị key.` : "Chưa có key. Dán key mới để lưu vào vault.";
      submit.textContent = item.configured ? "Thay key & kiểm tra" : "Lưu & kiểm tra";
      submit.disabled = credentialState.loading || !vaultReady;
    }
  }
  function roleModelMetadata(payload) {
    const roles = ["analyze", "research", "strategy", "prompt"], models = safeObject(payload?.models), rawChoices = safeObject(payload?.choices), choices = {};
    for (const role of roles) choices[role] = [...new Set(asArray(rawChoices[role]).filter((id) => typeof id === "string" && id.length > 0 && id.length <= 200))];
    return { source: payload?.source === "project" ? "project" : "default", models: Object.fromEntries(roles.map((role) => [role, typeof models[role] === "string" ? models[role] : ""])), choices };
  }
  function renderRoleModels() {
    const form = $("[data-wc-role-models]"), metadata = credentialState.models, status = $("[data-wc-role-model-status]", form), source = $("[data-wc-model-source]", form), roles = ["analyze", "research", "strategy", "prompt"];
    $("[data-wc-project-manage]", form).hidden = Boolean(state.projectId);
    source.textContent = !state.projectId ? "Cần chọn dự án" : credentialState.modelsLoading ? "Đang tải…" : metadata ? metadata.source === "project" ? "Theo dự án" : "Mặc định server" : "Chưa tải";
    let complete = Boolean(state.projectId && metadata);
    for (const role of roles) {
      const select = $(`select[name="${role}"]`, form), ids = asArray(metadata?.choices?.[role]); select.replaceChildren(new Option(!state.projectId ? "Chọn dự án trước" : ids.length ? "Chọn model" : "Không có model được phép", ""));
      ids.forEach((id) => select.add(new Option(id, id))); if (ids.includes(metadata?.models?.[role])) select.value = metadata.models[role];
      select.disabled = credentialState.modelsLoading || !state.projectId || !ids.length; complete = complete && Boolean(select.value);
    }
    $("button[type='submit']", form).disabled = credentialState.modelsLoading || !complete;
    if (!form.dataset.pendingCheck) status.textContent = !state.projectId ? "Cần có dự án trước. Đóng cửa sổ này để chọn dự án ở thanh trên hoặc mở quản lý dự án để tạo mới." : metadata ? "Chỉ model nằm trong policy server mới có thể lưu. Chưa gửi request tới model." : "Không tải được model policy; cấu hình cũ vẫn giữ nguyên trên server.";
  }
  async function loadRoleModels() {
    const projectId = state.projectId; credentialState.models = null;
    if (!projectId) { renderRoleModels(); return; }
    if (credentialState.modelsLoading) return;
    credentialState.modelsLoading = true; renderRoleModels();
    try {
      const response = await fetch(`/api/provider-models?projectId=${encodeURIComponent(projectId)}`, { method: "GET", credentials: "same-origin", headers: { Accept: "application/json" } });
      if (response.status === 401) { location.assign(`/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
      if (!response.ok) throw new Error();
      const metadata = roleModelMetadata(await response.json()); if (state.projectId === projectId) credentialState.models = metadata;
    } catch { if (state.projectId === projectId) credentialState.models = null; }
    finally { credentialState.modelsLoading = false; renderRoleModels(); if (state.projectId && state.projectId !== projectId && !$("[data-wc-provider-dialog]").hidden) loadRoleModels(); }
  }
  async function loadProviderCredentials() {
    if (credentialState.loading) return;
    credentialState.loading = true; renderProviderCredentials();
    try {
      const response = await fetch("/api/provider-credentials", { method: "GET", credentials: "same-origin", headers: { Accept: "application/json" } });
      if (response.status === 401) { location.assign(`/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
      if (!response.ok) throw new Error();
      credentialState.metadata = credentialMetadata(await response.json());
    } catch { credentialState.metadata = null; }
    finally { credentialState.loading = false; renderProviderCredentials(); }
  }
  async function saveProviderCredential(form) {
    const provider = form.dataset.wcProviderForm, input = $("input[name='apiKey']", form), status = $("[data-wc-provider-status]", form), submit = $("button[type='submit']", form);
    if (credentialState.loading || !CREDENTIAL_PROVIDERS.includes(provider) || !input || !form.reportValidity()) return;
    let apiKey = input.value.trim(); input.value = "";
    if (!apiKey) { status.textContent = "Key không được để trống."; return; }
    let body = JSON.stringify({ provider, apiKey }); apiKey = "";
    credentialState.loading = true; submit.disabled = true; submit.setAttribute("aria-busy", "true"); status.textContent = "Đang lưu key vào vault…";
    try {
      const pending = fetch("/api/provider-credentials", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body }); body = "";
      const response = await pending;
      if (response.status === 401) { location.assign(`/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
      if (!response.ok) throw new Error(`credential_save_${response.status}`);
      credentialState.metadata = credentialMetadata(await response.json());
      form.dataset.pendingCheck = "true"; status.textContent = "Đã lưu metadata an toàn. Đang chạy preflight đọc catalog; chưa gọi model hoặc tạo media.";
      window.dispatchEvent(new CustomEvent("workflow:provider-credentials-changed", { detail: { provider } }));
      const preflight = await perform({ type: "PREFLIGHT" });
      if (!preflight.ok) { delete form.dataset.pendingCheck; status.textContent = `Key đã lưu; chưa chạy được preflight. ${preflight.message}`; }
    } catch { delete form.dataset.pendingCheck; status.textContent = "Không lưu được key. Giá trị đã được xóa khỏi form; hãy kiểm tra vault/backend rồi nhập lại."; }
    finally { body = ""; credentialState.loading = false; submit.removeAttribute("aria-busy"); renderProviderCredentials(); }
  }
  async function saveRoleModels(form) {
    if (credentialState.modelsLoading || !state.projectId || !credentialState.models || !form.reportValidity()) return;
    const projectId = state.projectId, models = Object.fromEntries(["analyze", "research", "strategy", "prompt"].map((role) => [role, $(`select[name="${role}"]`, form).value])), status = $("[data-wc-role-model-status]", form), submit = $("button[type='submit']", form);
    if (Object.entries(models).some(([role, id]) => !credentialState.models.choices[role]?.includes(id))) { status.textContent = "Model không còn nằm trong policy server. Hãy tải lại thiết lập."; return; }
    credentialState.modelsLoading = true; submit.disabled = true; submit.setAttribute("aria-busy", "true"); status.textContent = "Đang lưu model theo dự án…";
    try {
      const response = await fetch("/api/provider-models", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ projectId, models }) });
      if (response.status === 401) { location.assign(`/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
      if (!response.ok) throw new Error();
      if (state.projectId !== projectId) return;
      credentialState.models = roleModelMetadata(await response.json()); form.dataset.pendingCheck = "true"; status.textContent = "Models đã lưu cho dự án. Đang chạy lại preflight; chưa gọi inference.";
      window.dispatchEvent(new CustomEvent("workflow:provider-configuration-changed", { detail: { projectId } }));
      const preflight = await perform({ type: "PREFLIGHT" }); if (!preflight.ok) { delete form.dataset.pendingCheck; status.textContent = `Models đã lưu; chưa chạy được preflight. ${preflight.message}`; }
    } catch { delete form.dataset.pendingCheck; status.textContent = "Không lưu được models. Cấu hình cũ trên server vẫn được giữ."; }
    finally { credentialState.modelsLoading = false; submit.removeAttribute("aria-busy"); renderRoleModels(); }
  }
  function openProviderCredentials(trigger = document.activeElement) {
    if (document.body.classList.contains("wc-details-open")) closeDetails();
    credentialState.returnFocus = trigger?.closest?.("[data-wc-legacy]") ? $("[data-wc-tool='providers']") : trigger;
    const dialog = $("[data-wc-provider-dialog]"), backdrop = $(".wc-provider-backdrop"), skipLink = $(".skip-link");
    backdrop.hidden = false; dialog.hidden = false; dialog.inert = false; dialog.removeAttribute("inert"); app.inert = true; app.setAttribute("aria-hidden", "true"); if (skipLink) { skipLink.inert = true; skipLink.setAttribute("aria-hidden", "true"); }
    $("[data-wc-provider-close]", dialog)?.focus({ preventScroll: true }); loadProviderCredentials(); loadRoleModels();
  }
  function closeProviderCredentials() {
    const dialog = $("[data-wc-provider-dialog]"), skipLink = $(".skip-link");
    $$('[data-wc-provider-form] input[name="apiKey"]', dialog).forEach((input) => { input.value = ""; });
    dialog.hidden = true; dialog.inert = true; dialog.setAttribute("inert", ""); $(".wc-provider-backdrop").hidden = true; app.inert = false; app.removeAttribute("aria-hidden"); if (skipLink) { skipLink.inert = false; skipLink.removeAttribute("aria-hidden"); } if (credentialState.returnFocus?.focus) credentialState.returnFocus.focus();
  }
  function openProjectManager() {
    closeProviderCredentials(); if (state.mode !== "overview") state.mode = "overview"; state.selectedId = "project"; render(); openDetailsForSelection();
    requestAnimationFrame(() => { const form = $("[data-project-create-form]"); if (!form) return; form.scrollIntoView({ block: "center" }); $("input, select, button", form)?.focus({ preventScroll: true }); });
  }
  let detailsReturnFocus = null;
  const DETAIL_MAP = {
    project: ["[aria-labelledby='project-title']"], source: ["[aria-labelledby='source-title']"],
    analyze: ["[aria-labelledby='pipeline-title']"], research: ["[aria-labelledby='pipeline-title']", "[data-wc-panel-id='research-ops']"], hooks: ["[aria-labelledby='pipeline-title']"],
    prompt: ["[aria-labelledby='prompt-title']"], image: ["[aria-labelledby='media-title']"], video: ["[aria-labelledby='media-title']"],
    test: ["[aria-labelledby='test-title']"], production: ["[data-wc-panel-id='production']"], voice: ["[data-wc-panel-id='voice']"], quality: ["[data-wc-panel-id='quality']"],
    "selected-hook": ["[aria-labelledby='pipeline-title']"], motion: ["[data-wc-panel-id='production']"], audit: ["[data-wc-panel-id='quality']"]
  };
  function openDetailsForSelection() {
    if (selectedMediaType()) syncMediaForm(selectedMediaType());
    detailsReturnFocus = document.activeElement; document.body.classList.add("wc-details-open"); $("[data-wc-close-details]").hidden = false; app.inert = true; app.setAttribute("aria-hidden", "true"); const skipLink = $(".skip-link"); if (skipLink) { skipLink.inert = true; skipLink.setAttribute("aria-hidden", "true"); } const legacy = $("[data-wc-legacy]"); legacy.inert = false; legacy.removeAttribute("inert");
    const node = nodeById(state.selectedId) || overviewGraph[0], selectors = DETAIL_MAP[node.id] || (/^segment-/.test(node.id) ? ["[aria-labelledby='media-title']"] : ["[aria-labelledby='pipeline-title']"]), panels = $$(".workflow-panel", legacy);
    panels.forEach((panel) => { panel.hidden = !selectors.some((selector) => panel.matches(selector)); });
    $("[data-wc-dialog-kicker]").textContent = `Node · ${node.kind}`; $("[data-wc-dialog-title]").textContent = node.title; $("[data-wc-dialog-copy]").textContent = node.id === "project" ? "Tạo hoặc chọn dự án để mọi source, prompt và kết quả có cùng scope." : node.id === "quality" ? "Chỉ đọc trạng thái quality do backend lưu; không tự duyệt asset." : "Chỉnh đúng phần việc của node; dữ liệu được giữ theo dự án đang chọn.";
    $(".wc-dialog-step-rail").hidden = true;
    if (["production", "voice", "quality"].includes(node.id)) loadOperationalDashboard();
    $(".wc-legacy-close")?.focus({ preventScroll: true });
    requestAnimationFrame(() => $(selectors[0])?.scrollIntoView({ block: "start" }));
  }

  async function perform(action, source = "manual") {
    if (!action || typeof action.type !== "string") return { ok: false, message: "Lệnh không hợp lệ." };
    if (action.type === "SELECT") return setSelection(action.id);
    if (action.type === "SELECT_BY_NAME") { const node = findNodeByName(action.value); return node ? setSelection(node.id) : { ok: false, message: "Không tìm thấy node trong flow đang mở." }; }
    if (action.type === "MOVE_BY_NAME") { const node = findNodeByName(action.value); if (!node) return { ok: false, message: "Không tìm thấy node để di chuyển." }; action = { type: "MOVE", id: node.id, x: action.x, y: action.y }; }
    if (action.type === "MOVE") { const node = nodeById(action.id); if (!node || !Number.isFinite(action.x) || !Number.isFinite(action.y)) return { ok: false, message: "Tọa độ node không hợp lệ." }; pushHistory(); state.positions[state.mode][node.id] = { x: clamp(action.x, -400, 2100), y: clamp(action.y, -400, 1400) }; state.selectedId = node.id; render(); return { ok: true }; }
    if (action.type === "FIT") { fitView(); render(); return { ok: true }; }
    if (action.type === "ZOOM") { const view = currentView(); view.zoom = clamp(view.zoom + action.delta, .35, 1.5); renderTransform(); save(); return { ok: true }; }
    if (action.type === "RESET_LAYOUT") { pushHistory(); state.positions[state.mode] = {}; fitView(); render(); return { ok: true }; }
    if (action.type === "UNDO") return { ok: undo(), message: state.history.length ? "Đã hoàn tác." : "Không còn bước để hoàn tác." };
    if (action.type === "REDO") return { ok: redo(), message: state.future.length ? "Đã làm lại." : "Không còn bước để làm lại." };
    if (action.type === "SET_PROVIDER") { const mediaType = selectedMediaType(), config = mediaConfig(mediaType); if (!config) return { ok: false, message: "Hãy chọn node Tạo ảnh hoặc Tạo video trước khi đổi provider." }; if (!PROVIDERS.has(action.value)) return { ok: false, message: "Provider không được hỗ trợ." }; pushHistory(); config.provider = action.value; config.modelId = ""; state.mediaCatalog = { provider: "", mediaType: "", source: "", warning: "", fallbackUsed: false, runtimePolicy: {}, models: [], loading: false, error: "" }; syncMediaForm(mediaType); render(); broadcastMediaPlan(mediaType); loadMediaCatalog(true); return { ok: true }; }
    if (action.type === "SET_MODEL") { const mediaType = selectedMediaType(), config = mediaConfig(mediaType); if (!config) return { ok: false, message: "Hãy chọn node Tạo ảnh hoặc Tạo video trước khi đổi model." }; const choice = modelChoices(config.provider, mediaType).find((item) => item.modelId === action.value && item.supported !== false && item.adapterImplemented !== false); if (!choice) return { ok: false, message: `Model có thể xuất hiện trong catalog ${mediaType}, nhưng chưa có adapter product-reference để chạy an toàn.` }; pushHistory(); config.modelId = choice.modelId; syncMediaForm(mediaType); render(); broadcastMediaPlan(mediaType); return { ok: true }; }
    if (action.type === "SET_DURATION") { if (selectedMediaType() !== "video") return { ok: false, message: "Hãy chọn node Tạo video trước khi đổi thời lượng." }; if (!DURATIONS.has(Number(action.value))) return { ok: false, message: "Chỉ hỗ trợ 15, 30, 45 hoặc 60 giây." }; pushHistory(); state.video.duration = Number(action.value); if (/^segment-/.test(state.selectedId) && Number(state.selectedId.split("-")[1]) > durationSegmentCount(state.video.duration)) state.selectedId = "video"; render(); broadcastMediaPlan("video"); return { ok: true }; }
    if (action.type === "SET_RATIO") { if (selectedMediaType() !== "video") return { ok: false, message: "Hãy chọn node Tạo video trước khi đổi tỷ lệ." }; if (!RATIOS.has(action.value)) return { ok: false, message: "Tỷ lệ chưa được hỗ trợ trong inspector." }; pushHistory(); state.video.ratio = action.value; render(); broadcastMediaPlan("video"); return { ok: true }; }
    if (action.type === "OPEN_VIDEO") { pushHistory(); state.mode = "video"; state.selectedId = "video"; fitView(); render(); return { ok: true }; }
    if (action.type === "OPEN_VIDEO_DURATION") { if (!DURATIONS.has(Number(action.value))) return { ok: false, message: "Chỉ hỗ trợ 15, 30, 45 hoặc 60 giây." }; pushHistory(); state.video.duration = Number(action.value); state.mode = "video"; state.selectedId = "video"; fitView(); render(); return { ok: true }; }
    if (action.type === "BACK_OVERVIEW") { pushHistory(); state.mode = "overview"; state.selectedId = "video"; fitView(); render(); return { ok: true }; }
    if (action.type === "ADD_NOTE") { pushHistory(); const id = `note-${Date.now()}`; state.notes.push({ id, title: clean(action.value, 100) || "Ghi chú", mode: state.mode, x: 420 + state.notes.length * 24, y: 80 + state.notes.length * 22 }); state.selectedId = id; render(); return { ok: true }; }
    if (action.type === "PREFLIGHT") { const button = $("[data-provider-preflight]"); if (!button || button.disabled) return { ok: false, message: "Preflight đang bận hoặc không khả dụng." }; button.click(); return { ok: true }; }
    if (action.type === "RUN") { const button = $("[data-run-workflow]"); if (!button || button.disabled) return { ok: false, message: "Pilot đang khóa. Hãy chọn dự án/source và chạy preflight tới khi budget guard của mode hiện tại đạt." }; button.click(); return { ok: true }; }
    if (action.type === "OPEN_DETAILS") { openDetailsForSelection(); return { ok: true }; }
    if (action.type === "OPEN_PROVIDER_SETTINGS") { openProviderCredentials(source === "manual" ? document.activeElement : $("[data-wc-tool='providers']")); return { ok: true }; }
    if (action.type === "SET_PROJECT") { const select = $("[data-workflow-project-select]"); if (!select || ![...select.options].some((option) => option.value === action.value)) return { ok: false, message: "Dự án không tồn tại." }; projectChanged(action.value); select.value = action.value; select.dispatchEvent(new Event("change", { bubbles: true })); return { ok: true }; }
    return { ok: false, message: source === "chat" ? "Lệnh chưa được hỗ trợ." : "Thao tác chưa được hỗ trợ." };
  }

  function addChat(role, message) { const log = $("[data-wc-chat-log]"), article = document.createElement("article"); article.className = role === "user" ? "is-user" : "is-agent"; const icon = document.createElement("span"); icon.setAttribute("aria-hidden", "true"); icon.textContent = role === "user" ? "○" : "◇"; const paragraph = document.createElement("p"); paragraph.textContent = message; article.append(icon, paragraph); log.append(article); while (log.children.length > 30) log.firstElementChild.remove(); article.scrollIntoView({ block: "nearest" }); }
  async function runCommand(raw) { addChat("user", raw); const parsed = parseCommand(raw, { nodeNames: graph().flatMap((node) => [node.id, node.title]) }); if (!parsed.ok) return addChat("agent", parsed.message); const result = await perform(parsed.action, "chat"); addChat("agent", result.ok ? parsed.message : result.message); }

  function projectChanged(projectId) { if (state.projectId === projectId) return; state.projectId = projectId; state.snapshot = null; state.preflight = null; credentialState.models = null; operationalState.dashboard = null; state.mediaCatalog = { provider: "", mediaType: "", source: "", warning: "", fallbackUsed: false, runtimePolicy: {}, models: [], loading: false, error: "" }; load(projectId); if (requestedFocusNode && overviewGraph.some((node) => node.id === requestedFocusNode)) { state.mode = "overview"; state.selectedId = requestedFocusNode; setWorkspaceMode("canvas"); } else setWorkspaceMode("autopilot"); render(); if (projectId) loadNodeMediaSettings(); if (!$("[data-wc-provider-dialog]").hidden) loadRoleModels(); }
  function syncProjectOptions(projects, selectedProjectId = "") { state.projects = projects; const select = $("[data-wc-project]"), prior = selectedProjectId || state.projectId; select.replaceChildren(new Option("Chọn dự án", "")); projects.forEach((project) => select.add(new Option(`${project.name} · ${project.product}`, project.id))); if ([...select.options].some((option) => option.value === prior)) select.value = prior; }

  const operationalState = { dashboard: null, audioUrl: "", loading: false };
  function setOpBusy(form, busy, busyLabel) { const button = $("button[type='submit']", form); if (!button) return; if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent; button.disabled = busy; button.setAttribute("aria-busy", String(busy)); button.textContent = busy ? busyLabel : button.dataset.idleLabel; }
  function renderOperationalDashboard(payload) {
    operationalState.dashboard = safeObject(payload); const batches = asArray(payload?.batches), quality = $("[data-wc-quality-batch]"), prior = quality.value;
    quality.replaceChildren(new Option("Chọn batch", "")); batches.filter((batch) => !state.projectId || !batch.projectId || batch.projectId === state.projectId).forEach((batch) => quality.add(new Option(`${batch.targetCount || 0} video · ${String(batch.id || "").slice(0, 8)} · ${batch.status || "planned"}`, batch.id)));
    if ([...quality.options].some((option) => option.value === prior)) quality.value = prior;
    const root = $("[data-wc-production-results]"), visible = batches.filter((batch) => !state.projectId || !batch.projectId || batch.projectId === state.projectId).slice(0, 8); root.replaceChildren();
    if (!visible.length) root.append(Object.assign(document.createElement("p"), { className: "empty-state", textContent: "Dự án chưa có batch." }));
    visible.forEach((batch) => { const card = document.createElement("article"); card.className = "wc-op-card"; const title = document.createElement("strong"), meta = document.createElement("span"), status = document.createElement("b"); title.textContent = `${batch.targetCount || 0} video · ${batch.durationSeconds || "—"}s · ${batch.format || "—"}`; meta.textContent = `${batch.readyCount || 0} ready / ${batch.plannedCount || 0} planned`; status.textContent = batch.status === "blocked_provider" ? "Chờ connector" : batch.status || "planned"; card.append(title, meta, status); root.append(card); });
  }
  async function loadOperationalDashboard(force = false) {
    if (operationalState.loading || (!force && operationalState.dashboard)) return; operationalState.loading = true;
    try {
      const payload = await readJson(await fetch("/api/production/dashboard", { credentials: "same-origin" })); renderOperationalDashboard(payload);
      try { const integrations = await readJson(await fetch("/api/integrations/status", { credentials: "same-origin" })), voice = safeObject(integrations.integrations?.voice || integrations.providers?.voice || integrations.voice), select = $("[data-wc-voice-select]"), prior = select.value; select.replaceChildren(new Option("Default do VieNeu bridge cấu hình", "")); asArray(voice.presets || integrations.voicePresets).forEach((preset) => { const id = typeof preset === "string" ? preset : preset.id, label = typeof preset === "string" ? preset : preset.name || preset.label || preset.id; if (id) select.add(new Option(label, id)); }); if ([...select.options].some((option) => option.value === prior)) select.value = prior; } catch { /* optional integration metadata */ }
    } catch (error) { $("[data-wc-production-results]").innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; }
    finally { operationalState.loading = false; }
  }
  function renderResearchEvidence(payload) {
    const root = $("[data-wc-research-results]"), evidence = asArray(payload.evidence), hypotheses = asArray(payload.hypotheses); root.replaceChildren();
    if (!evidence.length) root.append(Object.assign(document.createElement("p"), { className: "empty-state", textContent: payload.status === "queued" ? "Research đã vào hàng đợi; chưa có evidence." : "Backend chưa trả evidence." }));
    evidence.forEach((item) => { const card = document.createElement("article"); card.className = "wc-op-card"; const link = document.createElement("a"), copy = document.createElement("p"), meta = document.createElement("small"); link.href = item.url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = item.title || item.url; copy.textContent = item.snippet || "Không có đoạn trích."; meta.textContent = `${item.sourceType || "source"} · truy xuất ${item.retrievedAt || payload.retrievedAt || "không rõ"}`; card.append(link, copy, meta); root.append(card); });
    if (hypotheses.length) { const note = document.createElement("article"); note.className = "wc-op-card is-hypothesis"; const title = document.createElement("strong"), list = document.createElement("ul"); title.textContent = "Hypothesis chưa kiểm chứng"; hypotheses.forEach((item) => { const li = document.createElement("li"); li.textContent = typeof item === "string" ? item : item.text; list.append(li); }); note.append(title, list); root.append(note); }
  }
  async function renderQualityBatch(batchId) {
    const root = $("[data-wc-quality-results]"); if (!batchId) { root.innerHTML = '<p class="empty-state">Chọn batch để tải asset và trạng thái gate.</p>'; return; } root.innerHTML = '<p class="empty-state">Đang tải quality…</p>';
    try {
      const payload = await readJson(await fetch(`/api/production/batches/${encodeURIComponent(batchId)}`, { credentials: "same-origin" })), assets = asArray(payload.assets);
      const gateDefinitions = [
        ["productFidelity", "Product fidelity"], ["claims", "Claims"], ["voicePronunciation", "Voice pronunciation"],
        ["audio", "Audio"], ["continuity", "Continuity"], ["format", "Format"], ["novelty", "Novelty"], ["humanApproval", "Human approval"]
      ];
      root.replaceChildren();
      if (!assets.length) root.append(Object.assign(document.createElement("p"), { className: "empty-state", textContent: "Batch chưa có asset." }));
      assets.slice(0, 32).forEach((asset) => {
        const gates = safeObject(asset.qualityGates), automatedQualified = gateDefinitions.slice(0, -1).every(([key]) => {
          const gate = safeObject(gates[key]); return gate.status === "pass" && Boolean(gate.evidenceRef);
        }), human = safeObject(gates.humanApproval), humanQualified = human.status === "approved" && human.reviewerType === "human" && Boolean(human.approvedBy) && Boolean(human.evidenceRef), structurallyQualified = automatedQualified && humanQualified;
        const card = document.createElement("article"); card.className = "wc-op-card";
        const title = document.createElement("strong"), stateLine = document.createElement("span"), list = document.createElement("ul"), caveat = document.createElement("small");
        title.textContent = `Asset ${String(asset.ordinal || 0).padStart(3, "0")}`;
        stateLine.textContent = `${asset.status || "unknown"} · QA backend ${asset.qualityStatus || "chưa kiểm"} · ${structurallyQualified ? "reference check đủ cấu trúc" : "reference check chưa đủ"}`;
        gateDefinitions.forEach(([key, label]) => {
          const raw = gates[key], value = safeObject(raw), status = typeof raw === "string" ? raw : value.status || "chưa kiểm", evidence = typeof raw === "object" && Boolean(value.evidenceRef);
          const li = document.createElement("li");
          li.textContent = key === "humanApproval" ? `${label}: ${status} · ${evidence ? "có evidence ref" : "thiếu evidence ref"} · reviewer ${value.reviewerType || "chưa có"}${value.approvedBy ? ` (${value.approvedBy})` : ""}` : `${label}: ${status} · ${evidence ? "có evidence ref" : "thiếu evidence ref"}`;
          list.append(li);
        });
        caveat.textContent = "Màn hình chỉ kiểm tra trạng thái và sự hiện diện của evidence reference; không tự xác thực nội dung bằng chứng.";
        card.append(title, stateLine, list, caveat); root.append(card);
      });
    }
    catch (error) { root.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; }
  }

  window.addEventListener("workflow:projects", (event) => syncProjectOptions(asArray(event.detail?.projects), event.detail?.selectedProjectId));
  window.addEventListener("workflow:project-changing", (event) => projectChanged(event.detail?.projectId || ""));
  window.addEventListener("workflow:snapshot", (event) => { const projectId = event.detail?.projectId || ""; projectChanged(projectId); state.snapshot = event.detail?.snapshot || null; if (projectId) $("[data-wc-project]").value = projectId; render(); });
  window.addEventListener("workflow:preflight", (event) => { state.preflight = safeObject(event.detail); renderHeader(); });
  window.addEventListener("workflow:open-source-manager", () => { if (!state.projectId) return openProjectManager(); state.mode = "overview"; state.selectedId = "source"; render(); openDetailsForSelection(); });
  window.addEventListener("workflow:open-media-setup", (event) => {
    if (!state.projectId) return openProjectManager(); const mediaType = event.detail?.mediaType === "video" ? "video" : "image";
    state.mode = "overview"; state.selectedId = mediaType; setWorkspaceMode("canvas"); render();
    const paramsTab = $('[data-wc-tab="params"]'); paramsTab?.click(); loadMediaCatalog(); window.setTimeout(() => $("[data-wc-model-search]")?.focus(), 0);
  });

  $("[data-wc-project]").addEventListener("change", (event) => perform({ type: "SET_PROJECT", value: event.target.value }));
  $$('[data-wc-mode-button]').forEach((button) => button.addEventListener("click", () => setWorkspaceMode(button.dataset.wcModeButton)));
  $("[data-wc-preflight]").addEventListener("click", () => perform({ type: "PREFLIGHT" }));
  $("[data-wc-run]").addEventListener("click", () => perform({ type: "RUN" }));
  $("[data-wc-settings]").addEventListener("click", () => perform({ type: "OPEN_DETAILS" }));
  $("[data-wc-open-details]").addEventListener("click", () => perform({ type: "OPEN_DETAILS" }));
  $("[data-wc-provider-open-top]").addEventListener("click", (event) => openProviderCredentials(event.currentTarget));
  $$('[data-wc-provider-close]').forEach((control) => control.addEventListener("click", closeProviderCredentials));
  $("[data-wc-provider-open]")?.addEventListener("click", (event) => openProviderCredentials(event.currentTarget));
  $("[data-wc-provider-preflight-action]").addEventListener("click", () => perform({ type: "PREFLIGHT" }));
  $("[data-wc-provider-run-action]").addEventListener("click", () => perform({ type: "RUN" }));
  $$('[data-wc-provider-form]').forEach((form) => form.addEventListener("submit", (event) => { event.preventDefault(); saveProviderCredential(form); }));
  $("[data-wc-role-models]").addEventListener("submit", (event) => { event.preventDefault(); saveRoleModels(event.currentTarget); });
  $("[data-wc-project-manage]").addEventListener("click", openProjectManager);
  function closeDetails() { document.body.classList.remove("wc-details-open"); $(".wc-legacy-backdrop").hidden = true; const legacy = $("[data-wc-legacy]"); legacy.inert = true; legacy.setAttribute("inert", ""); const skipLink = $(".skip-link"); if (skipLink) { skipLink.inert = false; skipLink.removeAttribute("aria-hidden"); } app.inert = false; app.removeAttribute("aria-hidden"); if (detailsReturnFocus?.focus) detailsReturnFocus.focus(); }
  $$('[data-wc-close-details]').forEach((button) => button.addEventListener("click", closeDetails));
  document.addEventListener("keydown", (event) => { if (event.key !== "Escape") return; if (!$("[data-wc-provider-dialog]").hidden) closeProviderCredentials(); else if (document.body.classList.contains("wc-details-open")) closeDetails(); });
  $$('[data-wc-tab]').forEach((button) => button.addEventListener("click", () => { $$('[data-wc-tab]').forEach((item) => item.setAttribute("aria-selected", String(item === button))); $$('[data-wc-panel]').forEach((panel) => { panel.hidden = panel.dataset.wcPanel !== button.dataset.wcTab; }); }));
  $$('[data-wc-command-hint]').forEach((button) => button.addEventListener("click", () => runCommand(button.dataset.wcCommandHint)));
  $("[data-wc-chat-form]").addEventListener("submit", (event) => { event.preventDefault(); const input = event.currentTarget.elements.command, value = input.value; input.value = ""; runCommand(value); });
  $("[data-wc-provider-options]").addEventListener("click", (event) => { const button = event.target.closest("button[data-value]"); if (button) perform({ type: "SET_PROVIDER", value: button.dataset.value }); });
  $("[data-wc-ratio-options]").addEventListener("click", (event) => { const button = event.target.closest("button[data-value]"); if (button) perform({ type: "SET_RATIO", value: button.dataset.value }); });
  $("[data-wc-duration-options]").addEventListener("click", (event) => { const button = event.target.closest("button[data-value]"); if (button) perform({ type: "SET_DURATION", value: Number(button.dataset.value) }); });
  $("[data-wc-model]").addEventListener("change", (event) => event.target.value && perform({ type: "SET_MODEL", value: event.target.value }));
  $("[data-wc-model-search]").addEventListener("input", renderMediaModelOptions);
  $("[data-wc-save-media]").addEventListener("click", saveNodeMediaSettings);
  $("[data-wc-apply-position]").addEventListener("click", () => perform({ type: "MOVE", id: state.selectedId, x: Number($("[data-wc-node-x]").value), y: Number($("[data-wc-node-y]").value) }));
  $("[data-wc-selection-summary]").addEventListener("click", (event) => { if (event.target.closest("[data-wc-open-video-flow]")) perform({ type: "OPEN_VIDEO" }); if (event.target.closest("[data-wc-back-overview]")) perform({ type: "BACK_OVERVIEW" }); });
  $("[data-wc-cache-form]").addEventListener("submit", async (event) => { event.preventDefault(); const status = $("[data-wc-cache-status]"), data = Object.fromEntries(new FormData(event.currentTarget)), values = { ttlHours: Number(data.ttlHours), maxEntries: Number(data.maxEntries), preflightGetAttempts: Number(data.preflightGetAttempts) }; status.textContent = "Đang lưu policy…"; try { await cachePolicySet(values); status.textContent = "Đã lưu cache policy trên server."; } catch (error) { status.textContent = error.message; } });
  $("[data-wc-create-project]").addEventListener("click", openProjectManager);
  $("[data-wc-research-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-wc-research-status]");
    if (!state.projectId || !form.reportValidity()) { status.textContent = "Hãy chọn dự án và nhập câu hỏi."; return; }
    setOpBusy(form, true, "Đang research…"); status.textContent = "";
    try { const data = Object.fromEntries(new FormData(form)), payload = await readJson(await fetch("/api/research", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: state.projectId, market: data.market, query: data.query }) })); renderResearchEvidence(payload); status.textContent = payload.status === "queued" ? "Research đã vào hàng đợi." : "Research hoàn tất."; }
    catch (error) { status.textContent = error.code === "jev_bridge_not_configured" ? "Jev chưa được cấu hình; không tạo kết quả giả." : error.message; }
    finally { setOpBusy(form, false); }
  });
  $("[data-wc-production-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-wc-production-status]");
    if (!state.projectId || !form.reportValidity()) { status.textContent = "Hãy chọn dự án."; return; }
    const data = Object.fromEntries(new FormData(form)), signature = JSON.stringify(data); if (!form.dataset.requestId || form.dataset.requestSignature !== signature) { form.dataset.requestId = crypto.randomUUID?.() || `plan-${Date.now()}`; form.dataset.requestSignature = signature; }
    const body = { requestId: form.dataset.requestId, projectId: state.projectId, targetCount: Number(data.targetCount), durationSeconds: Number(data.durationSeconds), format: data.format, conceptCount: Number(data.conceptCount), variationsPerConcept: Number(data.variationsPerConcept), renderConcurrency: Number(data.renderConcurrency), estimatedShotSeconds: Number(data.estimatedShotSeconds), expectedPassRate: Number(data.expectedPassRate), retryRate: Number(data.retryRate), windowHours: Number(data.windowHours) }; if (data.budgetUsd) body.budgetUsd = Number(data.budgetUsd);
    setOpBusy(form, true, "Đang lập plan…");
    try { const payload = await readJson(await fetch("/api/production/plan", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); delete form.dataset.requestId; delete form.dataset.requestSignature; status.textContent = payload.batch?.status === "blocked_provider" ? "Plan đã lưu; đang chờ connector." : "Capacity plan đã lưu."; operationalState.dashboard = null; await loadOperationalDashboard(true); }
    catch (error) { status.textContent = error.message; }
    finally { setOpBusy(form, false); }
  });
  $("[data-wc-voice-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-wc-voice-status]"), result = $("[data-wc-voice-result]");
    if (!state.projectId || !form.reportValidity()) { status.textContent = "Hãy chọn dự án và nhập lời thoại."; return; }
    const data = Object.fromEntries(new FormData(form)); if (!data.voiceId) delete data.voiceId; setOpBusy(form, true, "Đang tạo WAV…");
    try { const response = await fetch("/api/voice", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: state.projectId, ...data }) }); if (!response.ok) await readJson(response); const blob = await response.blob(); if (!blob.size || !blob.type.includes("audio")) throw new Error("Server không trả audio WAV hợp lệ."); if (operationalState.audioUrl) URL.revokeObjectURL(operationalState.audioUrl); operationalState.audioUrl = URL.createObjectURL(blob); result.replaceChildren(); const audio = document.createElement("audio"), meta = document.createElement("p"); audio.controls = true; audio.preload = "metadata"; audio.src = operationalState.audioUrl; meta.textContent = `${Math.round(blob.size / 1024)} KB · voice ${decodeURIComponent(response.headers.get("X-Voice-Id") || "server default")}`; result.append(audio, meta); status.textContent = "Đã nhận audio thật từ VieNeu bridge."; }
    catch (error) { result.innerHTML = `<p class="empty-state">${escapeHtml(error.code === "vieneu_bridge_not_configured" ? "VieNeu chưa được cấu hình; không phát audio demo." : error.message)}</p>`; status.textContent = error.message; }
    finally { setOpBusy(form, false); }
  });
  $("[data-wc-quality-batch]").addEventListener("change", (event) => renderQualityBatch(event.target.value));
  $("[data-wc-tools]")?.addEventListener?.("click", () => {});
  $$('[data-wc-tool]').forEach((button) => button.addEventListener("click", () => { const action = button.dataset.wcTool; if (action === "add") perform({ type: "ADD_NOTE", value: "Ghi chú mới" }); if (action === "fit") perform({ type: "FIT" }); if (action === "providers") perform({ type: "OPEN_PROVIDER_SETTINGS" }); if (action === "settings") perform({ type: "OPEN_DETAILS" }); }));
  $$('[data-wc-view]').forEach((button) => button.addEventListener("click", () => { const action = button.dataset.wcView; if (action === "undo") perform({ type: "UNDO" }); if (action === "redo") perform({ type: "REDO" }); if (action === "zoom-in") perform({ type: "ZOOM", delta: .1 }); if (action === "zoom-out") perform({ type: "ZOOM", delta: -.1 }); if (action === "fit") perform({ type: "FIT" }); }));

  const viewport = $("[data-wc-viewport]");
  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const nodeElement = event.target.closest("[data-wc-node]");
    if (nodeElement) {
      const node = nodeById(nodeElement.dataset.wcNode), position = nodePosition(node); state.selectedId = node.id; $$('[data-wc-node]').forEach((item) => { const selected = item === nodeElement; item.classList.toggle("is-selected", selected); item.setAttribute("aria-pressed", String(selected)); }); renderInspector(); resetInspectorScroll(); if (selectedMediaType()) loadMediaCatalog(); save(); nodeElement.setPointerCapture(event.pointerId); state.interaction = { type: "node", pointerId: event.pointerId, element: nodeElement, id: node.id, startX: event.clientX, startY: event.clientY, origin: { ...position }, preview: { ...position }, moved: false };
    } else {
      viewport.setPointerCapture(event.pointerId); const view = currentView(); state.interaction = { type: "pan", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { x: view.x, y: view.y }, preview: { x: view.x, y: view.y }, moved: false }; viewport.classList.add("is-dragging");
    }
  });
  viewport.addEventListener("pointermove", (event) => {
    const move = state.interaction; if (!move || move.pointerId !== event.pointerId) return; const dx = event.clientX - move.startX, dy = event.clientY - move.startY; move.moved ||= Math.abs(dx) + Math.abs(dy) > 3;
    if (move.type === "node") { move.preview = { x: clamp(move.origin.x + dx / currentView().zoom, -400, 2100), y: clamp(move.origin.y + dy / currentView().zoom, -400, 1400) }; }
    else move.preview = { x: clamp(move.origin.x + dx, -2600, 2600), y: clamp(move.origin.y + dy, -1800, 1800) };
    if (!state.renderFrame) state.renderFrame = requestAnimationFrame(() => { state.renderFrame = 0; if (move.type === "node") { move.element.style.setProperty("--node-x", `${move.preview.x}px`); move.element.style.setProperty("--node-y", `${move.preview.y}px`); const old = state.positions[state.mode][move.id]; state.positions[state.mode][move.id] = move.preview; renderEdges(); if (old) state.positions[state.mode][move.id] = old; else delete state.positions[state.mode][move.id]; } else { const view = currentView(), prior = { x: view.x, y: view.y }; view.x = move.preview.x; view.y = move.preview.y; renderTransform(); view.x = prior.x; view.y = prior.y; } });
  });
  function endPointer(event) {
    const move = state.interaction; if (!move || move.pointerId !== event.pointerId) return; state.interaction = null; viewport.classList.remove("is-dragging");
    if (!move.moved) return;
    pushHistory();
    if (move.type === "node") { state.positions[state.mode][move.id] = move.preview; state.selectedId = move.id; }
    else { currentView().x = move.preview.x; currentView().y = move.preview.y; }
    render();
  }
  viewport.addEventListener("pointerup", endPointer); viewport.addEventListener("pointercancel", endPointer);
  viewport.addEventListener("wheel", (event) => { event.preventDefault(); const view = currentView(), rect = viewport.getBoundingClientRect(), old = view.zoom, next = clamp(old * (event.deltaY > 0 ? .9 : 1.1), .35, 1.5), px = event.clientX - rect.left, py = event.clientY - rect.top, wx = (px - view.x) / old, wy = (py - view.y) / old; view.x = px - wx * next; view.y = py - wy * next; view.zoom = next; renderTransform(); save(); }, { passive: false });
  viewport.addEventListener("dblclick", (event) => { const node = event.target.closest("[data-wc-node]"); if (node?.dataset.wcNode === "video") perform({ type: "OPEN_VIDEO" }); });
  viewport.addEventListener("keydown", (event) => {
    const node = event.target.closest("[data-wc-node]");
    if (node && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); perform({ type: "SELECT", id: node.dataset.wcNode }); }
    if (node && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); const item = nodeById(node.dataset.wcNode), position = nodePosition(item), step = event.shiftKey ? 1 : 16, dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0, dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0; perform({ type: "MOVE", id: item.id, x: position.x + dx, y: position.y + dy }); }
    if (!node && (event.key === "+" || event.key === "=")) { event.preventDefault(); perform({ type: "ZOOM", delta: .1 }); }
    if (!node && event.key === "-") { event.preventDefault(); perform({ type: "ZOOM", delta: -.1 }); }
    if (!node && event.key === "0") { event.preventDefault(); perform({ type: "FIT" }); }
  });

  const originalRun = $("[data-run-workflow]"); if (originalRun) new MutationObserver(renderHeader).observe(originalRun, { attributes: true, attributeFilter: ["disabled", "aria-busy"] });
  const originalPreflight = $("[data-provider-preflight]"); if (originalPreflight) new MutationObserver(renderHeader).observe(originalPreflight, { attributes: true, attributeFilter: ["disabled", "aria-busy"] });
  window.addEventListener("workflow:preflight", (event) => { if (!Number.isFinite(Number(event.detail?.checkedAt))) return; $$('[data-wc-provider-form][data-pending-check="true"]').forEach((form) => { delete form.dataset.pendingCheck; $("[data-wc-provider-status]", form).textContent = "Preflight đã trả chẩn đoán an toàn. Xem trạng thái chi tiết trong Kết nối API; media vẫn chưa được tạo."; }); const modelForm = $("[data-wc-role-models][data-pending-check='true']"); if (modelForm) { delete modelForm.dataset.pendingCheck; $("[data-wc-role-model-status]", modelForm).textContent = "Preflight đã kiểm tra lại key/catalog/model policy. Chưa gọi inference."; } });
  window.addEventListener("workflow:preflight-failed", () => { $$('[data-wc-provider-form][data-pending-check="true"]').forEach((form) => { delete form.dataset.pendingCheck; $("[data-wc-provider-status]", form).textContent = "Key đã lưu, nhưng preflight thất bại. Chạy Kiểm tra kết nối lại; chưa gọi model."; }); const modelForm = $("[data-wc-role-models][data-pending-check='true']"); if (modelForm) { delete modelForm.dataset.pendingCheck; $("[data-wc-role-model-status]", modelForm).textContent = "Models đã lưu, nhưng preflight thất bại. Chạy Kiểm tra kết nối lại; chưa gọi inference."; } });
  const legacySelect = $("[data-workflow-project-select]"); if (legacySelect?.options.length > 1) syncProjectOptions($$("option", legacySelect).slice(1).map((option) => ({ id: option.value, name: option.textContent, product: "" })), legacySelect.value);
  if (requestedFocusNode) state.selectedId = requestedFocusNode;
  render();
  if (requestedFocusNode) requestAnimationFrame(openDetailsForSelection);
  window.addEventListener("pagehide", () => { if (operationalState.audioUrl) URL.revokeObjectURL(operationalState.audioUrl); }, { once: true });
})(globalThis);
