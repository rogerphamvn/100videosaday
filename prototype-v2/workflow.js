(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { projects: [], projectId: "", projectSelectionEpoch: 0, snapshot: null, validatedPrompt: null, busy: false, runStarting: false, hasProduct: false, pipelineReady: false, pilotKeyReady: false, pilotKeyScope: "", pilotKeyExpiresAt: 0, pilotKeyTimer: 0, mediaExecutionEnabled: false, mediaModelChoices: [], mediaSettings: [], mediaBudget: null, mediaRuntimeJobs: [], mediaQuote: null, mediaCatalogRequest: 0, runtimePromptReady: false, autopilotReadiness: null, autopilotPlan: null, autopilotRun: null, autopilotRunConfirmationId: "", autopilotRefreshTimer: 0 };
  const live = $("[data-live-region]");
  const SOURCE_LIMIT = 256 * 1024;
  const PILOT_CAP_USD = 2;
  const PREFLIGHT_TTL_MS = 5 * 60 * 1000;
  const ALLOWED_IMAGES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const COST_REVIEW_CODES = new Set(["budget_held", "budget_reconciling", "paid_stage_locked", "integration_timeout", "integration_unreachable", "integration_redirect_blocked", "integration_response_too_large", "openrouter_request_failed", "openrouter_invalid_response", "openrouter_provenance_missing", "model_execution_mismatch", "prompt_author_model_mismatch", "web_search_usage_unverified", "openrouter_usage_missing", "pilot_budget_settlement_conflict", "model_output_invalid", "uncited_research_output", "research_evidence_invalid", "research_citations_missing", "research_citation_mismatch", "uncited_strategy_output", "prompt_authorship_mismatch", "prompt_author_model_not_approved"]);

  function announce(message) {
    live.textContent = "";
    requestAnimationFrame(() => { live.textContent = message; });
  }
  function setStatus(node, message, kind = "") {
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }
  function setBusy(control, busy, label = "Đang xử lý…") {
    const button = control.matches?.("button") ? control : $("button[type='submit']", control);
    if (!button) return;
    if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
    button.textContent = busy ? label : button.dataset.idleLabel;
  }
  function formatError(payload, status) {
    if (payload?.message) return payload.message;
    if (payload?.fields && typeof payload.fields === "object") return Object.entries(payload.fields).map(([field, value]) => `${field}: ${value}`).join(" ");
    return payload?.error ? `${payload.error} (${status})` : `Yêu cầu thất bại (${status}).`;
  }
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
    if (response.status === 401) {
      location.assign(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      throw new Error("Cần đăng nhập lại.");
    }
    let payload = null;
    try { payload = await response.json(); } catch { /* non-JSON is invalid for workflow */ }
    if (!response.ok) {
      const error = new Error(formatError(payload, response.status));
      error.status = response.status; error.code = payload?.error; error.payload = payload;
      throw error;
    }
    return payload;
  }
  const workflowAction = (action, values) => request("/api/workflow", { method: "POST", body: JSON.stringify({ action, ...values }) });
  const asArray = (value) => Array.isArray(value) ? value : [];
  const safeObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const PREFLIGHT_STATES = new Set(["not_configured", "configured_unverified", "verified", "key_verified", "key_rejected", "invalid_response", "network_error", "provider_unavailable", "timeout", "response_too_large", "redirect_blocked", "role_mismatch", "catalog_missing"]);
  const ROLE_LABELS = { analyze: "Analyze", research: "Research", strategy: "Strategy", prompt: "Prompt" };
  const formatDate = (value) => {
    if (!value) return "không có ngày";
    const date = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
  const money = (value) => Number.isFinite(Number(value)) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(value)) : "—";
  const firstFinite = (...values) => values.find((value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)));
  const isSafeUrl = (value) => { try { return ["http:", "https:"].includes(new URL(value, location.origin).protocol); } catch { return false; } };
  const isHttpsUrl = (value) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
  function sameAutopilotScope(expected, current) {
    return Boolean(expected?.projectId) && expected.projectId === current?.projectId && (expected.epoch === undefined || expected.epoch === current?.epoch) && (!expected.runId || expected.runId === current?.runId) && (!expected.planId || expected.planId === current?.planId);
  }
  function validAutopilotPlan(plan) {
    return Boolean(plan?.id && plan?.fingerprint && typeof plan.confirmationId === "string" && plan.confirmationId);
  }
  function make(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = String(text); return node; }
  function runIntentKey(projectId) { return `creative-hook-lab:run-intent:${projectId}`; }
  function mediaPrefsKey(projectId) { return `creative-hook-lab:media-preferences:${projectId}`; }
  function autopilotRunKey(projectId) { return `creative-hook-lab:autopilot-run:${projectId}`; }
  function autopilotIntentKey(planId) { return `creative-hook-lab:autopilot-intent:${planId}`; }
  function readAutopilotRunRef(projectId) { try { const value = JSON.parse(localStorage.getItem(autopilotRunKey(projectId)) || "null"); return value?.runId ? value : null; } catch { return null; } }
  function writeAutopilotRunRef(projectId, runId, confirmationId) { try { localStorage.setItem(autopilotRunKey(projectId), JSON.stringify({ runId, confirmationId })); } catch { /* durable run remains server-side */ } }
  function getAutopilotIntent(planId) { try { const saved = sessionStorage.getItem(autopilotIntentKey(planId)); if (saved) return saved; } catch { /* continue */ } const id = crypto.randomUUID?.() || `auto-${Date.now()}`; try { sessionStorage.setItem(autopilotIntentKey(planId), id); } catch { /* current click only */ } return id; }
  function loadMediaPreferences(projectId) {
    if (!projectId) return null;
    try {
      const value = JSON.parse(localStorage.getItem(mediaPrefsKey(projectId)) || "null");
      if (!["fal", "openrouter", "replicate"].includes(value?.provider) || !["image", "video"].includes(value?.mediaType)) return null;
      return { provider: value.provider, mediaType: value.mediaType, modelId: typeof value.modelId === "string" ? value.modelId : "" };
    } catch { return null; }
  }
  function saveMediaPreferences() {
    if (!state.projectId) return;
    const provider = $("[data-media-provider]")?.value, mediaType = $("[data-media-type]")?.value, modelId = $("[data-media-model]")?.value || "";
    if (!["fal", "openrouter", "replicate"].includes(provider) || !["image", "video"].includes(mediaType)) return;
    try { localStorage.setItem(mediaPrefsKey(state.projectId), JSON.stringify({ provider, mediaType, modelId })); } catch { /* preferences stay in the current tab */ }
  }
  function getRunRequestId(projectId) {
    try { const saved = sessionStorage.getItem(runIntentKey(projectId)); if (saved) return saved; } catch { /* session storage can be disabled */ }
    const requestId = crypto.randomUUID?.() || `run-${Date.now()}-${Array.from(crypto.getRandomValues(new Uint32Array(2)), (value) => value.toString(36)).join("")}`;
    try { sessionStorage.setItem(runIntentKey(projectId), requestId); } catch { /* keep in this click only */ }
    return requestId;
  }
  function clearRunRequestId(projectId) { try { sessionStorage.removeItem(runIntentKey(projectId)); } catch { /* no-op */ } }
  function sourceScope(snapshot = state.snapshot) {
    const sourceRevision = snapshot?.project?.sourceRevision ?? snapshot?.sourceRevision ?? snapshot?.sourceSnapshot?.id ?? asArray(snapshot?.sources).map((item) => item.sha256 || item.id).join(":");
    return state.projectId ? `${state.projectId}:${String(sourceRevision ?? "none")}` : "";
  }
  function invalidatePilotPreflight(reason = "invalidated") { state.pilotKeyReady = false; state.pilotKeyScope = ""; state.pilotKeyExpiresAt = 0; if (state.pilotKeyTimer) window.clearTimeout(state.pilotKeyTimer); state.pilotKeyTimer = 0; window.dispatchEvent(new CustomEvent("workflow:preflight", { detail: { ready: false, reason, pilotKey: {} } })); }
  function pilotPreflightFresh() { return state.pilotKeyReady && state.pilotKeyScope === sourceScope() && Date.now() < state.pilotKeyExpiresAt; }
  function clearPromptEditor() { state.validatedPrompt = null; $("[data-mega-json]").value = ""; $("[data-negative-json]").value = ""; $("[data-prompt-export]").disabled = true; $("[data-prompt-validation]").textContent = "Chưa validate"; }

  async function loadProjects(preferredId = state.projectId) {
    const apiState = $("[data-api-state]");
    setStatus(apiState, "Đang đồng bộ dự án…");
    try {
      const dashboard = await request("/api/production/dashboard");
      state.projects = asArray(dashboard?.projects);
      const select = $("[data-workflow-project-select]");
      select.replaceChildren(new Option("Chọn dự án", ""));
      state.projects.forEach((project) => select.add(new Option(`${project.name} · ${project.product}`, project.id)));
      if (preferredId && state.projects.some((project) => project.id === preferredId)) select.value = preferredId;
      setStatus(apiState, "Dữ liệu production đã đồng bộ", "success");
      window.dispatchEvent(new CustomEvent("workflow:projects", { detail: { projects: state.projects, selectedProjectId: select.value } }));
      if (select.value) await chooseProject(select.value);
      else renderEmptyProject();
    } catch (error) {
      setStatus(apiState, error.message, "error"); renderEmptyProject();
    }
  }

  async function chooseProject(projectId) {
    const projectChanged = state.projectId !== projectId, selectionEpoch = ++state.projectSelectionEpoch;
    state.projectId = projectId; state.snapshot = null;
    window.dispatchEvent(new CustomEvent("workflow:project-changing", { detail: { projectId } }));
    if (projectChanged) { invalidatePilotPreflight(); clearPromptEditor(); state.autopilotReadiness = null; state.autopilotPlan = null; state.autopilotRun = null; state.autopilotRunConfirmationId = ""; if (state.autopilotRefreshTimer) window.clearTimeout(state.autopilotRefreshTimer); state.autopilotRefreshTimer = 0; renderAutopilotRun(null); closeAutopilotConfirm(); setStatus($("[data-run-status]"), "Chưa có run. API không kết nối sẽ dừng pipeline với lỗi rõ ràng."); }
    const url = new URL(location.href); if (projectId) url.searchParams.set("projectId", projectId); else url.searchParams.delete("projectId"); history.replaceState(null, "", url);
    if (!projectId) { renderEmptyProject(); return; }
    $("[data-project-state]").textContent = "Đang tải…";
    $$('[data-requires-project]').forEach((panel) => panel.removeAttribute("aria-disabled"));
    try {
      const snapshot = await request(`/api/workflow?projectId=${encodeURIComponent(projectId)}`); if (state.projectSelectionEpoch !== selectionEpoch || state.projectId !== projectId) return; state.snapshot = snapshot;
      renderSnapshot();
      announce("Đã tải workflow dự án.");
    } catch (error) { if (state.projectSelectionEpoch !== selectionEpoch || state.projectId !== projectId) return;
      $("[data-project-state]").textContent = "Không tải được";
      setStatus($("[data-run-status]"), error.message, "error");
    }
  }

  async function refreshSnapshot() { if (state.projectId) await chooseProject(state.projectId); }
  function renderEmptyProject() {
    state.projectId = ""; state.snapshot = null; invalidatePilotPreflight(); clearPromptEditor();
    $("[data-project-state]").textContent = "Chưa chọn";
    $$('[data-requires-project]').forEach((panel) => panel.setAttribute("aria-disabled", "true"));
    renderSources([]); renderProviders({}, false); renderBudget(null, null); renderStages([], null); renderResearch([]); renderDrafts([]); renderJobs([]); renderResults([], [], [], [], []);
    clearRunError();
    state.autopilotReadiness = null; state.autopilotPlan = null; state.autopilotRun = null; renderAutopilotReadiness(null); renderAutopilotSources([]); renderAutopilotRun(null); closeAutopilotConfirm();
    updateProgress();
    window.dispatchEvent(new CustomEvent("workflow:snapshot", { detail: { projectId: "", snapshot: null } }));
  }

  function updateProgress() {
    const snapshot = state.snapshot || {};
    const sources = asArray(snapshot.sources), stages = snapshot.activeRun?.id ? asArray(snapshot.stages).filter((stage) => stage.runId === snapshot.activeRun.id) : [], drafts = asArray(snapshot.drafts), jobs = asArray(snapshot.mediaJobs), measurements = asArray(snapshot.measurements);
    const completeStages = new Set(stages.filter((item) => ["complete", "imported"].includes(item.status)).map((item) => item.stage));
    const eligibleCreatives = getEligibleCreativeDrafts(drafts, jobs), eligibleCreativeIds = new Set(eligibleCreatives.map((draft) => draft.id));
    const done = {
      project: Boolean(state.projectId),
      sources: sources.some((item) => item.kind === "product") && sources.some((item) => item.kind === "packaging"),
      research: ["analyze", "research", "strategy"].every((stage) => completeStages.has(stage)),
      prompts: drafts.some(isValidatedPromptDraft),
      media: eligibleCreatives.length > 0,
      measure: measurements.some((item) => eligibleCreativeIds.has(item.draftId))
    };
    $$('[data-progress-step]').forEach((item) => item.classList.toggle("is-complete", Boolean(done[item.dataset.progressStep])));
  }

  function renderSnapshot() {
    const snapshot = state.snapshot || {};
    if (state.pilotKeyScope && state.pilotKeyScope !== sourceScope(snapshot)) invalidatePilotPreflight("source_changed");
    const project = snapshot.project || state.projects.find((item) => item.id === state.projectId);
    $("[data-project-state]").textContent = project ? `${project.name} · ${project.product}` : "Dự án đã chọn";
    renderSources(asArray(snapshot.sources));
    renderProviders(safeObject(snapshot.providerReadiness));
    renderBudget(snapshot.pilotBudget || snapshot.budget || snapshot.activeRun?.budget || null, snapshot.activeRun);
    renderStages(asArray(snapshot.stages), snapshot.activeRun);
    renderResearch(asArray(snapshot.stages), snapshot.activeRun);
    renderDrafts(asArray(snapshot.drafts));
    renderJobs(asArray(snapshot.mediaJobs));
    renderResults(asArray(snapshot.measurements), asArray(snapshot.winners), asArray(snapshot.clones), asArray(snapshot.drafts), asArray(snapshot.mediaJobs));
    updateProgress();
    window.dispatchEvent(new CustomEvent("workflow:snapshot", { detail: { projectId: state.projectId, snapshot } }));
    renderAutopilotSources(asArray(snapshot.sources));
    loadAutopilotReadiness();
  }

  function autopilotBlockerText(value) {
    const item = safeObject(value), code = typeof value === "string" ? value : item.code || "", labels = {
      product_source_required: "Cần ít nhất một ảnh sản phẩm",
      missing_product_source: "Cần ít nhất một ảnh sản phẩm",
      missing_packaging_source: "Nên thêm ảnh packaging",
      media_provider_not_configured: "Provider tạo creative chưa có key",
      media_node_not_configured: "Chưa chọn model tạo creative",
      media_node_type_mismatch: "Model đã lưu không đúng loại đầu ra",
      workflow_provider_not_configured: "OpenRouter chưa có key",
      openrouter_key_missing: "OpenRouter chưa có key",
      fal_key_missing: "fal.ai chưa có key",
      replicate_key_missing: "Replicate chưa có key",
      autopilot_disabled: "Chế độ tự động chưa được bật trên máy chủ",
      pilot_execution_disabled: "Pipeline AI chưa được bật trên máy chủ",
      media_execution_disabled: "Tạo ảnh/video chưa được bật trên máy chủ",
      autopilot_run_unresolved: "Dự án đang có một tiến trình cần hoàn tất hoặc xử lý",
      media_job_held: "Một lượt tạo ảnh/video đang chờ kiểm tra chi phí",
      pilot_budget_unavailable: "Ngân sách AI chưa sẵn sàng",
      scheduler_not_ready: "Bộ chạy nền đang khởi động; thử lại sau ít phút",
      autopilot_inputs_changed: "Ảnh hoặc model đã thay đổi"
    }; return item.message || item.label || labels[code] || code || "Cấu hình chưa sẵn sàng";
  }
  function providerKeyLabel(code) {
    return ({ openrouter_key_missing: "OpenRouter", fal_key_missing: "fal.ai", replicate_key_missing: "Replicate" })[String(code)] || String(code);
  }
  function selectedAutopilotOutput() {
    const form = $("[data-autopilot-form]"), mediaType = form ? new FormData(form).get("mediaType") : "image";
    return mediaType === "video" ? { mediaType: "video", nodeId: "video", segmentSeconds: 15 } : { mediaType: "image", nodeId: "image" };
  }
  function renderAutopilotSources(sources = []) {
    const root = $("[data-auto-source-grid]"), stateNode = $("[data-auto-source-state]"), snapshotNode = $("[data-auto-source-snapshot]"), action = $("[data-auto-source-action]"); if (!root) return;
    root.replaceChildren();
    if (!state.projectId) { stateNode.textContent = "Chưa chọn dự án"; action.textContent = "Tạo dự án"; root.append(make("p", "", "Chọn dự án ở thanh trên cùng để xem ảnh thật.")); snapshotNode.textContent = "Autopilot chỉ chạy trên bộ ảnh được khóa trong bước xác nhận."; return; }
    const visible = sources.filter((source) => ["product", "packaging"].includes(source.kind)).slice(0, 4);
    if (!visible.length) root.append(make("p", "", "Dự án chưa có ảnh sản phẩm hoặc packaging."));
    visible.forEach((source) => {
      const card = make("article", "wc-auto-source-item"), src = source.url || source.previewUrl || source.dataUrl, meta = make("div");
      if (src && (src.startsWith("data:image/") || isSafeUrl(src))) { const image = new Image(); image.src = src; image.alt = source.kind === "product" ? "Ảnh sản phẩm thật" : "Ảnh packaging thật"; card.append(image); }
      else card.append(make("p", "", "API không trả preview"));
      meta.append(make("strong", "", source.kind === "product" ? "Sản phẩm" : "Packaging"), make("small", "", source.filename || source.id || "Source")); card.append(meta); root.append(card);
    });
    stateNode.textContent = `${visible.length} ảnh`;
    action.textContent = visible.length ? "Thêm / quản lý ảnh" : "Thêm ảnh sản phẩm";
    snapshotNode.textContent = state.autopilotReadiness?.sourceSnapshotId ? `Mã bộ ảnh ${state.autopilotReadiness.sourceSnapshotId} · phiên bản ${state.autopilotReadiness.sourceRevision ?? "—"}` : "Đang kiểm tra bộ ảnh với hệ thống.";
  }
  function renderAutopilotModels(readiness = state.autopilotReadiness) {
    const root = $("[data-auto-models]"), summary = $("[data-auto-model-summary]"); if (!root) return;
    const openrouter = safeObject(state.snapshot?.providerReadiness?.openrouter), roleModels = safeObject(openrouter.models), roles = Object.entries(roleModels).filter(([, id]) => typeof id === "string" && id.trim());
    const selected = safeObject(readiness?.selectedOutput); root.replaceChildren();
    const roleRow = document.createElement("div"); roleRow.append(make("dt", "", "AI pipeline"), make("dd", "", roles.length ? roles.map(([role, id]) => `${ROLE_LABELS[role] || role}: ${id}`).join(" · ") : "Chưa có model vai trò đã xác minh")); root.append(roleRow);
    const outputRow = document.createElement("div"); outputRow.append(make("dt", "", "Creative"), make("dd", "", selected.modelId ? `${selected.provider} · ${selected.modelId}` : "Chưa có model tạo creative đã lưu; hệ thống sẽ hiển thị lựa chọn cần thiết trước khi chạy")); root.append(outputRow);
    summary.textContent = selected.modelId ? `${selected.provider} · ${selected.modelId}` : roles.length ? `${roles.length} model vai trò · creative chưa chọn` : "chưa sẵn sàng";
  }
  function renderAutopilotReadiness(readiness) {
    state.autopilotReadiness = readiness || null;
    const start = $("[data-auto-start]"), blocker = $("[data-auto-blocker]"), title = $("[data-auto-blocker-title]"), copy = $("[data-auto-blocker-copy]"), action = $("[data-auto-open-setup]"), status = $("[data-auto-status]"); if (!start) return;
    if (!state.projectId) { start.disabled = true; blocker.hidden = true; setStatus(status, "Chọn dự án để bắt đầu."); renderAutopilotModels(null); return; }
    const blockerCodes = asArray(readiness?.blockers).map((value) => typeof value === "string" ? value : safeObject(value).code || ""), blockers = asArray(readiness?.blockers).map(autopilotBlockerText), missingKeys = asArray(readiness?.missingKeys).map(providerKeyLabel), needsMediaSetup = blockerCodes.some((code) => ["media_node_not_configured", "media_node_type_mismatch"].includes(code));
    start.disabled = readiness?.ready !== true;
    blocker.hidden = readiness?.ready === true;
    if (readiness?.ready === true) { setStatus(status, "Ảnh, key, model và giới hạn chi phí đã sẵn sàng. Bấm Bắt đầu tự động để xem kế hoạch xác nhận.", "success"); }
    else {
      title.textContent = missingKeys.length ? `Thiếu key: ${missingKeys.join(", ")}` : "Autopilot chưa sẵn sàng"; copy.textContent = blockers.length ? blockers.join(" · ") : "Hệ thống chưa xác nhận ảnh, model và giới hạn chi phí.";
      action.dataset.autoSetupAction = missingKeys.length ? "credentials" : needsMediaSetup ? "media" : "refresh"; action.textContent = missingKeys.length ? "Nhập key" : needsMediaSetup ? "Chọn model" : "Kiểm tra lại"; setStatus(status, "Chưa có lượt gọi trả phí nào được gửi.");
    }
    renderAutopilotModels(readiness); renderAutopilotSources(asArray(state.snapshot?.sources));
  }
  async function loadAutopilotReadiness(force = false) {
    if (!state.projectId) return renderAutopilotReadiness(null);
    const projectId = state.projectId, epoch = state.projectSelectionEpoch, status = $("[data-auto-status]"); if (force || !state.autopilotReadiness) setStatus(status, "Đang tự kiểm tra source, key và model…");
    try {
      const output = selectedAutopilotOutput(), query = new URLSearchParams({ projectId, mediaType: output.mediaType, nodeId: output.nodeId, ...(output.mediaType === "video" ? { segmentSeconds: "15" } : {}) });
      const payload = await request(`/api/autopilot/readiness?${query}`); if (!sameAutopilotScope({ projectId, epoch }, { projectId: state.projectId, epoch: state.projectSelectionEpoch })) return;
      const readiness = safeObject(payload.readiness);
      if (state.autopilotPlan && (state.autopilotPlan.frozen?.sourceSnapshotId !== readiness.sourceSnapshotId || Number(state.autopilotPlan.frozen?.modelRevision) !== Number(readiness.modelRevision))) closeAutopilotConfirm("Source hoặc model đã đổi; kế hoạch cũ đã hết hiệu lực.");
      renderAutopilotReadiness(readiness);
      const active = safeObject(readiness.activeRun), saved = readAutopilotRunRef(projectId), runId = active.id || saved?.runId, confirmationId = active.confirmationId || saved?.confirmationId || "";
      if (runId && state.autopilotRun?.id !== runId) { state.autopilotRunConfirmationId = confirmationId; state.autopilotRun = { ...active, id: runId }; loadAutopilotRun(runId); }
    } catch (error) { if (!sameAutopilotScope({ projectId, epoch }, { projectId: state.projectId, epoch: state.projectSelectionEpoch })) return; renderAutopilotReadiness(null); setStatus(status, error.message, "error"); }
  }
  function openAutopilotConfirm(plan) {
    state.autopilotPlan = plan; const dialog = $("[data-auto-confirm]"), backdrop = $("[data-auto-confirm-close].wc-auto-confirm-backdrop");
    const output = safeObject(plan.output), frozen = safeObject(plan.frozen), readiness = safeObject(plan.readiness), budgetAuthorization = safeObject(plan.mediaBudgetAuthorization), budgetBefore = safeObject(budgetAuthorization.before), budgetAfter = safeObject(budgetAuthorization.minimumAfter), project = state.snapshot?.project || state.projects.find((item) => item.id === state.projectId) || {};
    $("[data-auto-confirm-scope]").textContent = `${project.name || "Dự án"} · ${plan.goal || "Mục tiêu creative"} · ${output.mediaType === "video" ? "1 đoạn video 15 giây" : "1 ảnh"}`;
    $("[data-auto-confirm-source]").textContent = `${frozen.sourceSnapshotId || readiness.sourceSnapshotId || "—"} · revision ${frozen.sourceRevision ?? readiness.sourceRevision ?? "—"}`;
    $("[data-auto-confirm-model-revision]").textContent = `model ${frozen.modelRevision ?? "—"} · lựa chọn ${frozen.selectionRevision ?? "—"}`;
    $("[data-auto-confirm-fingerprint]").textContent = plan.fingerprint || "—";
    $("[data-auto-confirm-output-model]").textContent = `${frozen.provider || "—"} · ${frozen.modelId || "—"}`;
    $("[data-auto-confirm-budget]").textContent = `${money(plan.budgetUsd)} tổng · tối đa ${money(plan.maxPerJobUsd)} dành cho ảnh/video`;
    $("[data-auto-confirm-project-budget]").textContent = budgetAuthorization.changesGlobalProjectBudget ? `Sẽ đổi từ ${money(budgetBefore.totalUsd)} / ${money(budgetBefore.maxPerJobUsd)} mỗi lượt thành tối thiểu ${money(budgetAfter.totalUsd)} / ${money(budgetAfter.maxPerJobUsd)} mỗi lượt. Thiết lập này tiếp tục áp dụng cho các lượt tạo thủ công sau đó.` : "Giữ nguyên; kế hoạch không nâng ngân sách media chung của dự án.";
    $("[data-auto-confirm-limitations]").textContent = asArray(plan.limitations).length ? asArray(plan.limitations).join(" · ") : "Một đầu ra. Video chỉ là một đoạn 15 giây. Giới hạn của ứng dụng không đảm bảo provider sẽ dừng tính phí đúng tại con số này.";
    setStatus($("[data-auto-confirm-status]"), ""); dialog.hidden = false; dialog.inert = false; backdrop.hidden = false; $("[data-auto-confirm-start]").disabled = plan.status !== "ready"; document.body.classList.add("wc-auto-confirm-open"); $("[data-auto-confirm-start]").focus();
  }
  function closeAutopilotConfirm(message = "") {
    const dialog = $("[data-auto-confirm]"), backdrop = $("[data-auto-confirm-close].wc-auto-confirm-backdrop"); if (!dialog) return;
    dialog.hidden = true; dialog.inert = true; backdrop.hidden = true; document.body.classList.remove("wc-auto-confirm-open");
    if (message) { state.autopilotPlan = null; setStatus($("[data-auto-status]"), message, "error"); }
  }
  function renderAutopilotRun(run) {
    state.autopilotRun = run; const panel = $("[data-auto-run]"); if (!run?.id) { panel.hidden = true; return; } panel.hidden = false;
    const stateLabel = $("[data-auto-run-state]"), message = $("[data-auto-run-message]"), list = $("[data-auto-run-steps]"), budget = safeObject(run.budget), statusLabels = { pending: "Chưa bắt đầu", queued: "Đang chờ", running: "Đang làm", paused: "Đã tạm dừng", held: "Đang giữ để kiểm tra", failed: "Có lỗi", complete: "Hoàn tất", cancelled: "Đã hủy" }, stepLabels = { "workflow:analyze": "Phân tích sản phẩm", "workflow:research": "Nghiên cứu", "workflow:strategy": "Góc quảng cáo", "workflow:prompts": "Viết prompt", "media:quote": "Kiểm tra chi phí media", "media:submit": "Gửi lượt tạo media", "media:poll": "Nhận kết quả media" }; stateLabel.textContent = statusLabels[run.status] || "Đang kiểm tra"; stateLabel.dataset.kind = run.status;
    list.replaceChildren(); const steps = asArray(run.steps); if (!steps.length) list.append(make("li", "", `Bước ${run.phase || "chuẩn bị"} · chờ hệ thống cập nhật`));
    steps.forEach((step) => { const value = safeObject(step), stepKey = value.key || value.name || value.phase, li = make("li", ["running", "queued"].includes(value.status) ? "is-active" : ["failed", "held"].includes(value.status) ? "is-failed" : "", `${value.label || stepLabels[stepKey] || stepKey || "Bước"}: ${statusLabels[value.status] || value.status || "Chưa bắt đầu"}`); if (value.providerJobId) { const detail = document.createElement("details"), summary = document.createElement("summary"), code = document.createElement("code"); summary.textContent = "Chi tiết kỹ thuật"; code.textContent = `Provider job: ${value.providerJobId}`; detail.append(summary, code); li.append(detail); } list.append(li); });
    $("[data-auto-run-authorized]").textContent = money(budget.authorizedUsd); $("[data-auto-run-reserved]").textContent = money(budget.reservedUsd); $("[data-auto-run-held]").textContent = money(budget.heldUsd); $("[data-auto-run-spent]").textContent = money(budget.spentUsd); $("[data-auto-run-remaining]").textContent = money(budget.remainingUsd);
    const blockers = asArray(run.blockers).map(autopilotBlockerText); if (run.blockedReason) blockers.push(autopilotBlockerText(run.blockedReason)); const limitations = asArray(run.limitations); message.textContent = blockers.length ? `${statusLabels[run.status] || "Đã dừng"}: ${blockers.join(" · ")}` : limitations.length ? limitations.join(" · ") : "Tiến độ được lưu trên hệ thống; đóng trình duyệt không làm mất công việc đang chạy.";
    const terminal = ["complete", "failed", "cancelled", "held"].includes(run.status), cancel = $("[data-auto-cancel]"); cancel.disabled = terminal || !state.autopilotRunConfirmationId; cancel.title = !terminal && !state.autopilotRunConfirmationId ? "Máy chủ chưa trả mã xác nhận để dừng tiến trình này." : "";
    if (state.autopilotRefreshTimer) window.clearTimeout(state.autopilotRefreshTimer); state.autopilotRefreshTimer = 0;
    if (!terminal) state.autopilotRefreshTimer = window.setTimeout(() => loadAutopilotRun(run.id), 8000);
  }
  async function loadAutopilotRun(runId = state.autopilotRun?.id) {
    if (!runId) return; const projectId = state.projectId, epoch = state.projectSelectionEpoch;
    try { const payload = await request(`/api/autopilot/runs/${encodeURIComponent(runId)}`), savedRunId = readAutopilotRunRef(projectId)?.runId; if (!sameAutopilotScope({ projectId, epoch, runId }, { projectId: state.projectId, epoch: state.projectSelectionEpoch, runId: savedRunId === runId ? savedRunId : state.autopilotRun?.id })) return; renderAutopilotRun(payload.run); }
    catch (error) { if (sameAutopilotScope({ projectId, epoch }, { projectId: state.projectId, epoch: state.projectSelectionEpoch })) setStatus($("[data-auto-status]"), `Không tải được tiến trình: ${error.message}`, "error"); }
  }

  function renderSources(sources) {
    $("[data-source-count]").textContent = `${sources.length} / 4 source`;
    const hasProduct = sources.some((item) => item.kind === "product");
    state.hasProduct = hasProduct;
    updateRunButton();
    if (state.projectId && !hasProduct) setStatus($("[data-run-status]"), "Cần ít nhất một ảnh product trước khi chạy pipeline.");
    const root = $("[data-source-grid]"); root.replaceChildren();
    if (!sources.length) { root.append(make("p", "empty-state", "Chưa có source trong dự án.")); return; }
    sources.forEach((source) => {
      const card = make("article", "source-card-real");
      const visual = make("div", "source-preview");
      const src = source.url || source.previewUrl || source.dataUrl;
      if (src && (src.startsWith("data:image/") || isSafeUrl(src))) { const image = new Image(); image.src = src; image.alt = source.kind === "product" ? "Source sản phẩm" : "Source packaging"; visual.append(image); }
      else visual.append(make("span", "source-placeholder", "Preview không được API trả về"));
      const meta = make("div", "source-meta"); meta.append(make("strong", "", source.kind === "product" ? "Sản phẩm" : "Packaging"), make("span", "", source.filename || source.id));
      if (source.byteSize) meta.append(make("small", "", `${Math.ceil(source.byteSize / 1024)} KiB`));
      const remove = make("button", "text-danger", "Xóa"); remove.type = "button"; remove.dataset.sourceDelete = source.id;
      card.append(visual, meta, remove); root.append(card);
    });
  }

  function renderProviders(readiness, loaded = true) {
    const root = $("[data-provider-strip]"); root.replaceChildren();
    if (!loaded) {
      state.pipelineReady = false;
      configureMediaChoices({});
      updateRunButton();
      ["Research: chọn dự án để kiểm tra", "Model: chọn dự án để kiểm tra", "Media: không dùng trong pilot này"].forEach((label) => root.append(make("span", "is-blocked", label)));
      return;
    }
    const research = safeObject(readiness.research || readiness.openrouterWebSearch || readiness.jev), openrouter = safeObject(readiness.openrouter), media = safeObject(readiness.media);
    const models = safeObject(openrouter.models), configuredModels = Object.entries(models).filter(([, id]) => typeof id === "string" && id.trim());
    const mappings = safeObject(media.mappings), configuredMappings = Object.entries(mappings).filter(([, id]) => typeof id === "string" && id.trim());
    configureMediaChoices(media);
    const openrouterReady = openrouter.configured === true && configuredModels.length === 4 && openrouter.policySatisfied === true;
    const webSearchReady = research.provider === "openrouter" ? research.configured === true && research.webSearchEnabled === true : research.webSearchEnabled === true || research.openrouterWebSearchEnabled === true || research.ready === true;
    state.pipelineReady = openrouterReady && webSearchReady && (readiness.executionEnabled === true || readiness.pilotExecutionEnabled === true || openrouter.executionEnabled === true);
    updateRunButton();
    const items = [
      { ok: webSearchReady, label: `Research / OpenRouter Web Search: ${webSearchReady ? "sẵn sàng · source URL/title/snippet" : "chưa được backend xác nhận"}` },
      { ok: openrouterReady, label: `Model / OpenRouter: ${openrouter.configured !== true ? "chưa cấu hình key" : openrouter.policySatisfied !== true ? `${configuredModels.length}/4 model ID · sai policy vai trò` : `${configuredModels.length}/4 model ID · catalog preflight khi chạy`}`, title: configuredModels.map(([stage, id]) => `${stage}: ${id}`).join("\n") },
      { ok: true, label: "Media: ngoài phạm vi pilot · không gửi job ảnh/video", title: configuredMappings.map(([kind, id]) => `${kind}: ${id}`).join("\n") }
    ];
    items.forEach((value) => { const item = make("span", value.ok ? "is-configured" : "is-blocked", value.label); if (value.title) item.title = value.title; root.append(item); });
  }

  function normalizeMediaChoices(media) {
    const direct = asArray(media.modelChoices).map((item) => {
      const value = safeObject(item), provider = String(value.provider || "").toLowerCase(), mediaType = String(value.mediaType || "").toLowerCase(), modelId = typeof value.modelId === "string" ? value.modelId.trim() : "";
      if (!["fal", "openrouter", "replicate"].includes(provider) || !["image", "video"].includes(mediaType)) return null;
      return { provider, mediaType, modelId, configured: value.configured === true && Boolean(modelId), supported: value.supported !== false, executionImplemented: value.executionImplemented === true, status: value.status || "" };
    }).filter(Boolean);
    if (direct.length) return direct;
    const mappingKeys = { falImage: ["fal", "image"], falVideo: ["fal", "video"], openrouterImage: ["openrouter", "image"], openrouterVideo: ["openrouter", "video"], replicateImage: ["replicate", "image"], replicateVideo: ["replicate", "video"] };
    return Object.entries(mappingKeys).map(([key, [provider, mediaType]]) => ({ provider, mediaType, modelId: typeof media.mappings?.[key] === "string" ? media.mappings[key].trim() : "", configured: Boolean(media.mappings?.[key]), supported: Boolean(media.mappings?.[key]), executionImplemented: false, status: media.mappings?.[key] ? "configured_unverified" : "not_configured" }));
  }
  function configureMediaChoices(media) {
    state.mediaExecutionEnabled = media.executionEnabled === true;
    state.mediaModelChoices = normalizeMediaChoices(media);
    const execution = $("[data-media-execution-state]"); if (execution) { execution.textContent = state.mediaExecutionEnabled ? "Execution đã bật" : "Execution đang khóa"; execution.dataset.kind = state.mediaExecutionEnabled ? "ready" : ""; }
    const preferences = loadMediaPreferences(state.projectId), provider = $("[data-media-provider]"), mediaType = $("[data-media-type]");
    if (provider && mediaType) { provider.value = preferences?.provider || "fal"; mediaType.value = preferences?.mediaType || "image"; }
    populateMediaModels(preferences?.modelId || "");
    renderMediaSegmentNote(mediaType?.value || "image");
    if (state.projectId) loadMediaRuntime();
  }
  async function populateMediaModels(preferredModelId = "") {
    const provider = $("[data-media-provider]")?.value || "fal", mediaType = $("[data-media-type]")?.value || "image", select = $("[data-media-model]"), note = $("[data-media-capability]");
    if (!select || !note) return;
    const prior = preferredModelId || select.value, requestNumber = ++state.mediaCatalogRequest;
    select.replaceChildren(new Option("Đang tải catalog provider…", "")); select.disabled = true;
    let source = "snapshot", warning = "";
    try {
      const payload = await request(`/api/media/catalog?provider=${encodeURIComponent(provider)}&mediaType=${encodeURIComponent(mediaType)}`);
      if (requestNumber !== state.mediaCatalogRequest) return;
      const discovered = asArray(payload.models).map((item) => ({ provider, mediaType, modelId: String(item?.modelId || item?.id || "").trim(), name: item?.name || item?.modelId || item?.id, configured: true, supported: item?.adapterImplemented === true, executionImplemented: item?.adapterImplemented === true, adapterImplemented: item?.adapterImplemented === true, blockedReason: item?.blockedReason || "", status: item?.status || "" })).filter((item) => item.modelId);
      state.mediaModelChoices = [...state.mediaModelChoices.filter((item) => item.provider !== provider || item.mediaType !== mediaType), ...discovered]; source = payload.source || "provider"; warning = payload.warning || "";
    } catch (error) { if (requestNumber !== state.mediaCatalogRequest) return; warning = error.code || error.message; }
    if (requestNumber !== state.mediaCatalogRequest) return;
    select.disabled = false;
    const matches = state.mediaModelChoices.filter((item) => item.provider === provider && item.mediaType === mediaType);
    select.replaceChildren(new Option(matches.length ? "Chọn model từ server" : `Chưa có model ${provider} ${mediaType}`, ""));
    matches.forEach((choice) => {
      const stateLabel = !choice.modelId ? "model chưa khai báo" : choice.adapterImplemented === false || !choice.executionImplemented ? choice.blockedReason === "product_reference_not_supported" ? "thiếu product reference" : "chưa có adapter" : "có adapter";
      const option = new Option(`${choice.name && choice.name !== choice.modelId ? `${choice.name} · ` : ""}${choice.modelId || "Model chưa khai báo"} · ${stateLabel}`, choice.modelId || "");
      option.disabled = !choice.modelId || !choice.supported || !choice.executionImplemented;
      select.add(option);
    });
    if ([...select.options].some((option) => option.value === prior && !option.disabled)) select.value = prior;
    const selected = matches.find((item) => item.modelId === select.value), ready = Boolean(selected?.supported && selected?.executionImplemented);
    note.textContent = !matches.length ? `${provider} chưa trả ${mediaType} model.` : warning === "media_provider_not_configured" ? `Chưa có key ${provider}; đang hiển thị catalog fallback. Có thể chọn model, nhưng phải nhập key trước khi lưu.` : !selected ? `Catalog ${source}. Chọn model có adapter; thao tác chọn chưa tạo job.` : ready ? `${selected.modelId}: adapter product-reference sẵn sàng. ${state.mediaExecutionEnabled ? "Có thể lấy quote; chỉ gửi provider sau nút xác nhận." : "Có thể lưu/quote, nhưng server đang khóa submit trả phí."}` : `${selected.modelId}: chưa có adapter an toàn.`;
    note.dataset.kind = ready ? "ready" : selected ? "unsupported" : "";
    updateMediaSubmit();
  }
  function updateMediaSubmit() {
    const form = $("[data-media-form]"), button = $("button[type='submit']", form), draftId = $("[data-media-draft]", form)?.value, modelId = $("[data-media-model]", form)?.value, provider = $("[data-media-provider]", form)?.value, mediaType = $("[data-media-type]", form)?.value;
    if (!button) return;
    const selected = state.mediaModelChoices.find((item) => item.provider === provider && item.mediaType === mediaType && item.modelId === modelId);
    const ready = Boolean(draftId) && state.runtimePromptReady && selected?.supported === true && selected?.executionImplemented === true;
    button.disabled = !ready;
    button.title = ready ? "Lưu node rồi lấy quote; bước này chưa gửi job generation" : "Cần prompt runtime đã xác minh và model có adapter product-reference";
  }

  function mediaNodeParameters(mediaType) {
    if (mediaType !== "video") return {};
    let config = null; try { config = JSON.parse(localStorage.getItem(`creative-hook-lab:workflow-node-canvas:${state.projectId}`) || "null")?.video; } catch { /* use safe defaults */ }
    const totalDuration = [15, 30, 45, 60].includes(Number(config?.duration)) ? Number(config.duration) : 15;
    const aspectRatio = ["9:16", "1:1", "16:9"].includes(config?.ratio) ? config.ratio : "9:16";
    return { aspectRatio, segmentSeconds: 15, totalDuration, resolution: "720p", generateAudio: false };
  }
  function renderMediaSegmentNote(mediaType = $("[data-media-type]")?.value || "image") {
    const note = $("[data-media-segment-note]"); if (!note) return;
    if (mediaType !== "video") { note.textContent = "Ảnh được báo giá theo một job. Việc chọn model hoặc lưu cấu hình chưa gọi provider."; return; }
    const parameters = mediaNodeParameters("video"), total = parameters.totalDuration;
    note.textContent = total > 15 ? `Kế hoạch ${total} giây = ${Math.ceil(total / 15)} đoạn. Quote/job hiện tại chỉ tạo đúng một đoạn 15 giây từ prompt đoạn đã chọn; chưa tự tạo đủ ${total} giây hoặc tự ghép.` : "Kế hoạch 15 giây. Quote/job hiện tại tạo một đoạn 15 giây từ prompt đã chọn; chưa tự ghép hoặc hậu kỳ.";
  }
  function clearMediaQuote(message = "") {
    state.mediaQuote = null; const panel = $("[data-media-quote]"); if (panel) panel.hidden = true; const confirm = $("[data-media-confirm]"); if (confirm) { confirm.disabled = true; delete confirm.dataset.idempotencyKey; } if (message) setStatus($("[data-media-status]"), message);
  }
  function renderMediaBudget(budget) {
    state.mediaBudget = budget || null; const form = $("[data-media-budget-form]"); if (!form) return;
    form.elements.totalUsd.value = Number(budget?.totalUsd || 0).toFixed(2); form.elements.maxPerJobUsd.value = Number(budget?.maxPerJobUsd || 0).toFixed(2);
    setStatus($("[data-media-budget-status]"), budget?.state === "active" ? `${money(budget.remainingUsd)} còn lại · ${money(budget.maxPerJobUsd)} tối đa/job · provider không có hard cap.` : "0 USD · đang tạm dừng.", budget?.state === "active" ? "success" : "");
  }
  function renderMediaRuntimeJobs(jobs) {
    state.mediaRuntimeJobs = asArray(jobs); const root = $("[data-media-runtime-jobs]"); if (!root) return; root.replaceChildren();
    if (!state.mediaRuntimeJobs.length) { root.append(make("p", "empty-state", "Chưa có media runtime job.")); return; }
    state.mediaRuntimeJobs.forEach((job) => { const card = make("article", "job-card"), title = make("strong", "", `${job.mediaType || "media"} · ${job.modelId || "model"}`), meta = make("p", "", `${job.status || "unknown"} · giữ ${money(job.reservedUsd)}${job.actualUsd == null ? "" : ` · thực ${money(job.actualUsd)}`}`); card.append(title, meta); if (["submitted", "processing"].includes(job.status)) { const poll = make("button", "secondary-button", "Cập nhật trạng thái"); poll.type = "button"; poll.dataset.mediaPoll = job.id; card.append(poll); } for (const url of asArray(job.assets)) { const link = make("a", "secondary-button", "Mở asset"); link.href = url; link.target = "_blank"; link.rel = "noreferrer"; card.append(link); } if (job.holdReason) card.append(make("small", "", `Hold: ${job.holdReason}`)); root.append(card); });
  }
  async function loadMediaRuntime(force = false) {
    const projectId = state.projectId; if (!projectId || (!force && state.mediaRuntimeProjectId === projectId)) return; state.mediaRuntimeProjectId = projectId;
    try { const [settings, budget, jobs] = await Promise.all([request(`/api/media/settings?projectId=${encodeURIComponent(projectId)}`), request(`/api/media/budget?projectId=${encodeURIComponent(projectId)}`), request(`/api/media/jobs?projectId=${encodeURIComponent(projectId)}`)]); if (state.projectId !== projectId) return; state.mediaSettings = asArray(settings.settings); renderMediaBudget(budget.budget); renderMediaRuntimeJobs(jobs.jobs); const mediaType = $("[data-media-type]")?.value, saved = state.mediaSettings.find((item) => item.nodeId === mediaType && item.mediaType === mediaType); if (saved) { $("[data-media-provider]").value = saved.provider; await populateMediaModels(saved.modelId); } }
    catch (error) { if (state.projectId === projectId) setStatus($("[data-media-status]"), `Không tải được media runtime: ${error.message}`, "error"); }
  }

  function updateRunButton() {
    const button = $("[data-run-workflow]");
    if (!button) return;
    const preflightFresh = pilotPreflightFresh();
    if (state.pilotKeyReady && !preflightFresh) invalidatePilotPreflight();
    button.disabled = state.runStarting || !state.projectId || !state.hasProduct || !state.pipelineReady || !preflightFresh;
    button.title = !state.projectId ? "Hãy chọn dự án" : !state.hasProduct ? "Cần ít nhất một ảnh sản phẩm" : !state.pipelineReady ? "OpenRouter execution và Web Search chưa sẵn sàng" : !preflightFresh ? "Bấm Kiểm tra kết nối để xác minh budget guard cho source hiện tại" : "Chạy pilot với budget guard phía server";
  }
  function normalizeBudget(rawBudget, activeRun) {
    const budget = safeObject(rawBudget), cap = firstFinite(budget.capUsd, budget.limitUsd, budget.maxUsd, budget.budgetCapUsd, activeRun?.budgetCapUsd), reserved = firstFinite(budget.reservedUsd, budget.reservationUsd), held = firstFinite(budget.heldUsd), spent = firstFinite(budget.spentUsd, budget.actualUsd, budget.usedUsd), remaining = firstFinite(budget.remainingUsd, cap !== undefined && reserved !== undefined ? Math.max(0, Number(cap) - Number(reserved)) : undefined);
    return { cap, reserved, held, spent, remaining, state: budget.state || budget.status || (activeRun?.status === "reconciling" ? "reconciling" : activeRun?.status || "not_started") };
  }
  function renderBudget(rawBudget, activeRun) {
    const budget = normalizeBudget(rawBudget, activeRun);
    $("[data-budget-cap]").textContent = money(budget.cap ?? PILOT_CAP_USD);
    $("[data-budget-reserved]").textContent = money(budget.reserved);
    $("[data-budget-held]").textContent = money(budget.held);
    $("[data-budget-spent]").textContent = money(budget.spent);
    $("[data-budget-remaining]").textContent = money(budget.remaining);
    const labels = { not_started: "Chưa có run. Backend sẽ giữ và đối soát ngân sách khi anh bấm chạy.", active: "Budget pilot đang hoạt động; chưa có bước nào tự chạy.", ready: "Sẵn sàng chạy; chưa phát sinh chi phí.", reserved: "Ngân sách đã được giữ cho run này.", running: "Pipeline đang chạy trong ngân sách đã giữ.", held: "Run đang hold. Không retry cho tới khi server đối soát hoặc mở lại; giữ cùng request ID khi được phép tiếp tục.", paused: "Budget pilot đang tạm dừng ở server.", reconciling: "Đang đối soát chi phí chưa chắc chắn; chưa cho phép gửi thêm request.", exhausted: "Đã chạm trần ngân sách; pipeline dừng an toàn.", complete: "Run hoàn tất; số đã chi do backend đối soát." };
    const node = $("[data-budget-state]"); node.textContent = labels[budget.state] || `Trạng thái ngân sách: ${budget.state}`; node.dataset.state = budget.state;
  }
  function clearRunError() {
    const root = $("[data-run-error]"); if (!root) return; root.hidden = true; root.open = false; $("[data-run-error-body]").replaceChildren();
  }
  function renderRunError(error) {
    const root = $("[data-run-error]"), body = $("[data-run-error-body]"); if (!root || !body) return;
    body.replaceChildren();
    const payload = safeObject(error.payload), safeDetails = safeObject(payload.details), run = safeObject(payload.run);
    const budget = payload.budget || payload.pilotBudget || safeDetails.budget || safeDetails.pilotBudget;
    const budgetState = normalizeBudget(budget, run).state;
    const reconciliationRequired = ["held", "reconciling"].includes(budgetState) || ["pilot_budget_reservation_exists"].includes(error.code) || COST_REVIEW_CODES.has(error.code);
    const details = [error.code && `Mã: ${error.code}`, (payload.phase || safeDetails.phase || safeDetails.stage || run.currentStage) && `Bước: ${payload.phase || safeDetails.phase || safeDetails.stage || run.currentStage}`, !reconciliationRequired && (payload.retryable === true || safeDetails.retryable === true) && "Có thể thử lại", !reconciliationRequired && (payload.resumeSameRun === true || safeDetails.resumeSameRun === true) && "Tiếp tục cùng run/request ID", (payload.requestId || safeDetails.requestId || run.requestId) && `Request: ${payload.requestId || safeDetails.requestId || run.requestId}`].filter(Boolean);
    if (details.length) body.append(make("p", "", details.join(" · ")));
    if (budget) { const value = normalizeBudget(budget, null); body.append(make("p", "", `Ngân sách: trần ${money(value.cap)} · dự trù ${money(value.reserved)} · hold ${money(value.held)} · đã chi ${money(value.spent)} · còn ${money(value.remaining)} · ${value.state}`)); }
    if (reconciliationRequired) body.append(make("p", "", "Chi phí chưa được đối soát. Không retry bước có phí cho tới khi server mở lại run; khi được phép, giữ nguyên request ID."));
    const keyStatus = safeObject(safeDetails.keyStatus);
    if (Object.keys(keyStatus).length) { const creditsMode = keyStatus.billingMode === "openrouter_credits", reset = keyStatus.reset === null || keyStatus.reset === false || keyStatus.reset === "" ? "không" : keyStatus.reset || "chưa xác nhận"; body.append(make("p", "", creditsMode ? `OpenRouter credits only · BYOK phải được xác minh trên từng response · limit ${money(keyStatus.limitUsd)} · còn ${money(keyStatus.remainingUsd)} · reset ${reset} · credit cap ${keyStatus.creditCapReady === true ? "đạt" : "chưa đạt"}.` : `OpenRouter strict cap: limit ${money(keyStatus.limitUsd)} · còn ${money(keyStatus.remainingUsd)} · reset ${reset} · gồm BYOK ${keyStatus.includesByok === true ? "có" : "chưa xác nhận"} · budget ready ${keyStatus.budgetReady === true ? "có" : "chưa"}.`)); }
    if (!details.length && !budget) body.append(make("p", "", "Backend không trả thêm chi tiết an toàn."));
    root.hidden = false;
  }

  function providerUiState(status, roles = null) {
    const safeStatus = PREFLIGHT_STATES.has(status) ? status : "configured_unverified";
    if (safeStatus === "not_configured") return "missing";
    if (safeStatus === "role_mismatch" || safeStatus === "catalog_missing") return "model_unavailable";
    if (safeStatus === "verified" && roles) {
      const roleValues = Object.values(roles).map((role) => safeObject(role).status);
      if (roleValues.some((value) => value === "role_mismatch" || value === "catalog_missing" || value === "not_configured")) return "model_unavailable";
    }
    if (safeStatus === "verified") return "key_verified";
    return safeStatus;
  }
  function providerStateLabel(value) {
    return ({ missing: "missing", configured_unverified: "configured_unverified", key_verified: "key_verified", key_rejected: "key_rejected", invalid_response: "invalid_response", network_error: "network_error", provider_unavailable: "provider_unavailable", timeout: "timeout", response_too_large: "response_too_large", redirect_blocked: "redirect_blocked", model_unavailable: "model_unavailable" })[value] || "configured_unverified";
  }
  function providerDetail(name, uiState, provider = {}) {
    if (uiState === "missing") return name === "openrouter" ? "Thiếu OPENROUTER_API_KEY ở Worker Secrets." : name === "fal" ? "Thiếu FAL_KEY ở Worker Secrets." : "Connector chưa được cấu hình trên server.";
    if (uiState === "model_unavailable") return "Key đã được đọc nhưng model gán cho vai trò chưa có trong catalog hoặc sai policy.";
    if (uiState === "key_verified") return name === "fal" || name === "replicate" ? "Trạng thái key do server trả về; preflight không thử tạo media." : name === "openrouter" ? "Key và catalog đã xác minh; cap pilot được kiểm tra riêng bên dưới. Chưa chạy inference." : "Kết nối đã được backend xác minh.";
    if (name === "openrouter" && uiState === "key_rejected") return provider.phase === "catalog" ? "Key đã qua bước xác minh nhưng bị từ chối khi đọc catalog." : "OpenRouter từ chối key ở bước xác minh.";
    if (name === "openrouter" && uiState === "invalid_response") return provider.phase === "catalog" ? "Key đã xác minh; catalog trả dữ liệu không đúng cấu trúc." : "Endpoint xác minh key trả dữ liệu không đúng cấu trúc.";
    if (name === "openrouter" && uiState === "response_too_large") return provider.phase === "catalog" ? "Key đã xác minh; catalog vượt giới hạn đọc an toàn 2 MiB." : "Phản hồi xác minh key vượt giới hạn đọc an toàn.";
    if (name === "openrouter" && uiState === "timeout") return provider.phase === "catalog" ? "Key đã xác minh; đọc catalog quá thời gian 15 giây." : "Xác minh key quá thời gian 15 giây.";
    if (name === "openrouter" && uiState === "provider_unavailable") return provider.phase === "catalog" ? "Key đã xác minh; OpenRouter catalog đang không khả dụng." : "Endpoint xác minh key của OpenRouter đang không khả dụng.";
    if (name === "openrouter" && uiState === "network_error") return provider.phase === "catalog" ? "Key đã xác minh; Worker không kết nối được catalog OpenRouter." : "Worker không kết nối được endpoint xác minh key.";
    if (name === "openrouter" && uiState === "redirect_blocked") return provider.phase === "catalog" ? "Key đã xác minh; catalog chuyển hướng ngoài endpoint cố định nên đã bị chặn." : "Endpoint xác minh key chuyển hướng nên đã bị chặn.";
    return name === "fal" || name === "replicate" ? "Secret hiện diện; chưa gọi generation để xác minh." : "Cấu hình hiện diện nhưng chưa được xác minh thành công.";
  }
  function renderProviderPreflight(payload) {
    const data = safeObject(payload), names = ["openrouter", "jev", "fal", "replicate"];
    const renderedStates = {};
    names.forEach((name) => {
      const provider = safeObject(data[name]), roles = name === "openrouter" ? safeObject(provider.roles) : null;
      const uiState = providerUiState(provider.status, roles), card = $(`[data-provider-check="${name}"]`);
      if (!card) return;
      const badge = $("[data-provider-state]", card), detail = $("[data-provider-detail]", card);
      badge.dataset.state = uiState; badge.textContent = providerStateLabel(uiState); detail.textContent = providerDetail(name, uiState, provider);
      renderedStates[name] = uiState;
      if (name === "openrouter") {
        const list = $("[data-provider-role-list]", card); list.replaceChildren();
        Object.entries(ROLE_LABELS).forEach(([roleName, label]) => {
          const role = safeObject(roles[roleName]), roleState = providerUiState(role.status), item = document.createElement("li");
          item.append(make("b", "", label), make("span", "", providerStateLabel(roleState)));
          if (role.configuredModelId) item.title = String(role.configuredModelId);
          list.append(item);
        });
      }
    });
    const summary = $("[data-provider-preflight-summary]");
    const openrouter = safeObject(data.openrouter), pilotKey = safeObject(openrouter.pilotKey), openrouterState = renderedStates.openrouter, openrouterVerified = openrouterState === "key_verified", falPresent = renderedStates.fal !== "missing";
    const billingMode = pilotKey.billingMode === "openrouter_credits" ? "openrouter_credits" : "strict_total", budgetReady = pilotKey.budgetReady === true;
    state.pilotKeyReady = openrouterVerified && budgetReady;
    state.pilotKeyScope = state.pilotKeyReady ? sourceScope() : "";
    state.pilotKeyExpiresAt = state.pilotKeyReady ? Date.now() + PREFLIGHT_TTL_MS : 0;
    if (state.pilotKeyTimer) window.clearTimeout(state.pilotKeyTimer);
    if (state.pilotKeyReady) state.pilotKeyTimer = window.setTimeout(() => { invalidatePilotPreflight("expired"); updateRunButton(); }, PREFLIGHT_TTL_MS + 50);
    const openrouterCard = $('[data-provider-check="openrouter"]');
    if (openrouterCard) {
      $$(".provider-cap-detail, .provider-cap-blocker", openrouterCard).forEach((node) => node.remove());
      const cap = make("p", "provider-cap-detail");
      cap.dataset.kind = budgetReady ? "ready" : "blocked";
      cap.textContent = billingMode === "openrouter_credits" ? `OpenRouter credits only · BYOK phải được xác minh trên từng response · limit ${money(pilotKey.limitUsd)} · còn ${money(pilotKey.remainingUsd)} · reset ${pilotKey.reset === null || pilotKey.reset === false || pilotKey.reset === "" ? "không" : pilotKey.reset || "chưa xác nhận"} · credit cap ${pilotKey.creditCapReady === true ? "đạt" : "chưa đạt"}.` : `Strict total cap · limit ${money(pilotKey.limitUsd)} · còn ${money(pilotKey.remainingUsd)} · reset ${pilotKey.reset === null || pilotKey.reset === false || pilotKey.reset === "" ? "không" : pilotKey.reset || "chưa xác nhận"} · gồm BYOK ${pilotKey.includesByok === true ? "có" : "chưa xác nhận"} · budget ready ${budgetReady ? "đạt" : "chưa đạt"}.`;
      openrouterCard.append(cap);
      if (openrouterVerified && !budgetReady) openrouterCard.append(make("p", "provider-cap-blocker", billingMode === "openrouter_credits" ? "Chặn pilot: credit cap phải ≤ 2 USD, không reset và còn allowance. Mọi response vẫn phải xác nhận không dùng BYOK." : "Chặn pilot: credential phải báo trần tổng ≤ 2 USD, không reset, bao gồm BYOK và còn allowance."));
    }
    summary.textContent = openrouterState === "missing" ? "Chờ key OpenRouter" : openrouterState === "model_unavailable" ? "Model chưa khả dụng" : openrouterVerified && budgetReady ? (billingMode === "openrouter_credits" ? "OpenRouter credits only · sẵn sàng" : falPresent ? "Pilot OpenRouter sẵn sàng · fal chờ xác minh" : "Pilot OpenRouter sẵn sàng · media tắt") : openrouterVerified ? "Key hợp lệ · budget guard chưa đạt" : openrouterState === "configured_unverified" ? "OpenRouter chưa xác minh" : `OpenRouter: ${providerStateLabel(openrouterState)}`;
    summary.dataset.kind = state.pilotKeyReady ? "success" : "";
    const execution = $("[data-provider-execution]");
    const pilotEnabled = data.pilotExecutionEnabled === true, executionEnabled = data.executionEnabled === true;
    execution.replaceChildren(make("strong", "", pilotEnabled && state.pilotKeyReady ? "Pilot execution đã bật và budget guard đã đạt. " : pilotEnabled ? "Pilot execution đã bật nhưng budget guard chưa đạt. " : executionEnabled ? "Execution flag đã bật. " : "AI execution đang tạm dừng. "), document.createTextNode(pilotEnabled && state.pilotKeyReady ? (billingMode === "openrouter_credits" ? "Chỉ OpenRouter credits trong envelope 2 USD được phép chạy; mỗi response bị khóa nếu không xác nhận is_byok=false. Media vẫn ngoài phạm vi." : "Chỉ pipeline pilot được phép chạy trong envelope cố định 2 USD; preflight không gọi AI và media vẫn ngoài phạm vi.") : pilotEnabled ? "Nút chạy vẫn khóa cho tới khi preflight xác nhận budget guard của mode hiện tại." : executionEnabled ? "Preflight không gọi AI; mỗi job vẫn cần budget hợp lệ trước khi chạy." : "Key hợp lệ chưa tự cho phép chạy. Cần bật execution ở server và xác nhận budget cho từng job."));
    updateRunButton();
    window.dispatchEvent(new CustomEvent("workflow:preflight", { detail: { ready: pilotPreflightFresh(), checkedAt: Date.now(), expiresAt: state.pilotKeyExpiresAt, pilotKey } }));
  }

  function stageLatest(stages, name, activeRun) {
    if (!activeRun?.id) return null;
    return stages.filter((stage) => stage.stage === name && stage.runId === activeRun.id).at(-1) || null;
  }
  function renderStages(stages, activeRun) {
    const root = $("[data-stage-list]"); root.replaceChildren();
    const names = [["analyze", "Phân tích source"], ["research", "Deep research"], ["strategy", "Motivator + hooks"], ["prompts", "MEGA + Negative JSON"]];
    names.forEach(([name, label], index) => {
      const stage = stageLatest(stages, name, activeRun), card = make("article", `stage-card is-${stage?.status || "pending"}`);
      const top = make("div", "stage-top"); top.append(make("span", "stage-index", String(index + 1).padStart(2, "0")), make("strong", "", label), make("b", "stage-status", stage?.status || "pending")); card.append(top);
      if (stage?.blockedReason) card.append(make("p", "stage-error", stage.blockedReason));
      if (stage?.error) card.append(make("p", "stage-error", typeof stage.error === "string" ? stage.error : JSON.stringify(stage.error)));
      const provenance = safeObject(stage?.provenance), facts = [];
      if (stage?.origin || provenance.origin) facts.push(`origin: ${stage?.origin || provenance.origin}`);
      if (provenance.requestedModelId) facts.push(`requested: ${provenance.requestedModelId}`);
      if (provenance.actualModelId) facts.push(`actual: ${provenance.actualModelId}`);
      if (provenance.providerRunId) facts.push(`provider run: ${provenance.providerRunId}`);
      if (provenance.verificationStatus) facts.push(provenance.verificationStatus);
      if (facts.length) card.append(make("small", "stage-provenance", facts.join(" · ")));
      if (stage?.output) { const details = document.createElement("details"), summary = document.createElement("summary"), pre = document.createElement("pre"); summary.textContent = "Xem output JSON"; pre.textContent = JSON.stringify(stage.output, null, 2); details.append(summary, pre); card.append(details); }
      root.append(card);
    });
  }

  function extractResearch(stages, activeRun) {
    const analysis = stageLatest(stages, "analyze", activeRun)?.output || {};
    const research = stageLatest(stages, "research", activeRun)?.output || {};
    const strategy = stageLatest(stages, "strategy", activeRun)?.output || {};
    const synthesis = safeObject(research.synthesis);
    return {
      analysis,
      evidence: asArray(research.evidence || research.sources),
      trends: asArray(synthesis.trends || research.trends || research.trendObservations),
      motivators: asArray(strategy.motivators || strategy.motivatorMap || synthesis.motivators || (strategy.motivator ? [strategy.motivator] : [])),
      hooks: asArray(strategy.hooks)
    };
  }
  function appendEvidenceRefs(card, refs, evidenceById) {
    if (!Array.isArray(refs) || !refs.length) return;
    const row = make("div", "citation-row");
    refs.forEach((ref) => { const evidence = evidenceById.get(ref), label = evidence ? [evidence.title || ref, evidence.publishedAt ? formatDate(evidence.publishedAt) : null].filter(Boolean).join(" · ") : ref; if (evidence?.url && isSafeUrl(evidence.url)) { const link = make("a", "", label); link.href = evidence.url; link.target = "_blank"; link.rel = "noreferrer"; row.append(link); } else row.append(make("span", "", label)); });
    card.append(row);
  }
  function renderResearch(stages, activeRun) {
    const { analysis, evidence, trends, motivators, hooks } = extractResearch(stages, activeRun), evidenceById = new Map(evidence.filter((item) => item?.id).map((item) => [item.id, item]));
    const analysisRoot = $("[data-analysis-summary]"); analysisRoot.replaceChildren();
    const analysisFacts = [
      ["Nhận diện", [analysis.productName, analysis.category].filter(Boolean).join(" · ")],
      ["Đặc điểm quan sát", asArray(analysis.observedFeatures).join("; ")],
      ["Target giả thuyết", asArray(analysis.targetHypotheses).join("; ")],
      ["Pain points", asArray(analysis.painPoints).join("; ")],
      ["Use cases", asArray(analysis.useCases).join("; ")],
      ["Điểm chưa biết", asArray(analysis.unknowns).join("; ")]
    ].filter(([, copy]) => copy);
    if (!analysisFacts.length) analysisRoot.append(make("p", "empty-state", "Chưa có analysis từ API."));
    analysisFacts.forEach(([label, copy]) => { const card = make("article", "analysis-fact"); card.append(make("strong", "", label), make("p", "", copy)); analysisRoot.append(card); });
    const evidenceRoot = $("[data-evidence-list]"); evidenceRoot.replaceChildren();
    if (!evidence.length) evidenceRoot.append(make("p", "empty-state", "Chưa có evidence từ API."));
    evidence.forEach((item) => {
      const card = make("article", "evidence-card"), title = item.title || item.url || "Evidence";
      if (item.url && isSafeUrl(item.url)) { const link = make("a", "", title); link.href = item.url; link.target = "_blank"; link.rel = "noreferrer"; card.append(link); }
      else card.append(make("strong", "", title));
      if (item.snippet || item.summary) card.append(make("p", "", item.snippet || item.summary));
      const publisher = item.publisher || item.domain || item.sourceName || "không rõ publisher";
      const sourceType = item.sourceType || item.type || "web search result";
      const provider = item.provider || item.searchProvider || "OpenRouter Web Search";
      card.append(make("small", "evidence-provenance", `${publisher} · ${sourceType} · via ${provider}`));
      const dates = [];
      if (item.publishedAt) dates.push(`Published: ${formatDate(item.publishedAt)}`);
      if (item.retrievedAt || item.accessedAt) dates.push(`Retrieved: ${formatDate(item.retrievedAt || item.accessedAt)}`);
      if (dates.length) card.append(make("small", "", dates.join(" · ")));
      evidenceRoot.append(card);
    });
    const trendRoot = $("[data-trend-list]"); trendRoot.replaceChildren();
    if (!trends.length) trendRoot.append(make("p", "empty-state", "Chưa có trend được dẫn nguồn."));
    trends.forEach((item) => { const card = make("article", "trend-card"); card.append(make("strong", "", item.statement || item.title || item.name || "Trend observation")); if (item.rationale || item.summary) card.append(make("p", "", item.rationale || item.summary)); appendEvidenceRefs(card, item.evidenceRefs, evidenceById); trendRoot.append(card); });
    const motivatorRoot = $("[data-motivator-list]"); motivatorRoot.replaceChildren();
    if (!motivators.length) motivatorRoot.append(make("p", "empty-state", "Chưa có strategy output."));
    motivators.forEach((item, index) => { const value = typeof item === "string" ? { statement: item } : item; const card = make("article", "motivator-card-real"); card.append(make("span", "", `M${String(index + 1).padStart(2, "0")}`), make("strong", "", value.statement || value.title || value.name || value.motivator || "Motivator"), make("p", "", value.strengthRationale || value.whyStrong || value.rationale || "API không trả lý do đủ mạnh.")); appendEvidenceRefs(card, value.evidenceRefs, evidenceById); motivatorRoot.append(card); });
    const hookRoot = $("[data-hook-list]"); hookRoot.replaceChildren();
    if (!hooks.length) hookRoot.append(make("p", "empty-state", "Chưa có hooks từ API."));
    hooks.forEach((item, index) => { const value = typeof item === "string" ? { statement: item } : item; const card = make("article", "hook-card-real"); card.append(make("strong", "", `${String(index + 1).padStart(2, "0")} · ${value.hook || value.statement || value.title || "Creative hook"}`), make("p", "", value.strengthRationale || value.mechanism || value.rationale || "API không trả mechanism / rationale.")); appendEvidenceRefs(card, value.evidenceRefs, evidenceById); hookRoot.append(card); });
  }

  function draftLabel(draft) { return draft.title || `${draft.draftType || "draft"} · ${draft.id}`; }
  function isValidatedPromptDraft(draft) {
    return ["prompt_pair", "clone"].includes(draft?.draftType) && draft.validationStatus === "valid" && draft.stale === false && Boolean(draft.payload?.megaPrompt) && Boolean(draft.payload?.negativePrompt);
  }
  function getEligibleCreativeDrafts(drafts, mediaJobs) {
    const validPromptIds = new Set(drafts.filter(isValidatedPromptDraft).map((draft) => draft.id));
    const completeJobIds = new Set(mediaJobs.filter((job) => job.status === "complete").map((job) => job.id));
    return drafts.filter((draft) => {
      const artifact = draft?.payload?.artifact;
      if (draft?.draftType !== "creative" || draft.payload?.testingStatus !== "ready" || !validPromptIds.has(draft.payload?.promptDraftId)) return false;
      if (!artifact || !["image", "video"].includes(artifact.mediaType) || !isHttpsUrl(artifact.locator) || typeof artifact.evidenceRef !== "string" || !artifact.evidenceRef.trim()) return false;
      if (artifact.origin === "external_import") return true;
      return artifact.origin === "provider_output" && typeof draft.payload?.mediaJobId === "string" && completeJobIds.has(draft.payload.mediaJobId);
    });
  }
  function renderDrafts(drafts) {
    const root = $("[data-draft-list]"); root.replaceChildren();
    if (!drafts.length) root.append(make("p", "empty-state", "Chưa có draft do API trả về."));
    drafts.forEach((draft) => { const card = make("article", "draft-card"); card.append(make("strong", "", draftLabel(draft)), make("span", "", `${draft.draftType || "draft"} · revision ${draft.revision ?? "?"} · ${draft.status || "draft"}`)); const trust = [draft.origin && `origin: ${draft.origin}`, draft.validationStatus && `validation: ${draft.validationStatus}`, draft.authoringTrust && `authoring: ${draft.authoringTrust}`, draft.stale === true && "stale"].filter(Boolean); if (trust.length) card.append(make("small", "", trust.join(" · "))); root.append(card); });
    const promptDrafts = drafts.filter(isValidatedPromptDraft);
    const runtimePromptDrafts = promptDrafts.filter((draft) => draft.authoringTrust === "verified_runtime");
    state.runtimePromptReady = runtimePromptDrafts.length > 0;
    const mediaSelect = $("[data-media-draft]"); mediaSelect.replaceChildren(new Option(runtimePromptDrafts.length ? "Chọn prompt runtime đã xác minh" : "Chưa có prompt runtime đủ điều kiện", "")); runtimePromptDrafts.forEach((draft) => mediaSelect.add(new Option(draftLabel(draft), draft.id)));
    const creativePrompt = $("[data-creative-prompt]"); const priorCreativePrompt = creativePrompt.value; creativePrompt.replaceChildren(new Option(promptDrafts.length ? "Chọn prompt hợp lệ" : "Chưa có prompt hợp lệ", "")); promptDrafts.forEach((draft) => creativePrompt.add(new Option(`${draftLabel(draft)} · ${draft.authoringTrust || "trust chưa rõ"}`, draft.id))); if ([...creativePrompt.options].some((option) => option.value === priorCreativePrompt)) creativePrompt.value = priorCreativePrompt;
    updateMediaSubmit();
    $("[data-creative-import-form] button[type='submit']").disabled = !promptDrafts.length;
    const promptStage = stageLatest(asArray(state.snapshot?.stages), "prompts", state.snapshot?.activeRun);
    const latestPromptDraft = promptDrafts[0];
    const latestPair = latestPromptDraft?.payload;
    if (latestPair?.megaPrompt && latestPair?.negativePrompt && !$("[data-mega-json]").value.trim()) {
      $("[data-mega-json]").value = JSON.stringify(latestPair.megaPrompt, null, 2); $("[data-negative-json]").value = JSON.stringify(latestPair.negativePrompt, null, 2);
    }
    if (latestPair?.megaPrompt && latestPair?.negativePrompt) {
      state.validatedPrompt = { megaPrompt: latestPair.megaPrompt, negativePrompt: latestPair.negativePrompt };
      $("[data-prompt-export]").disabled = false;
      $("[data-prompt-validation]").textContent = latestPromptDraft.authoringTrust === "verified_runtime" ? "Backend đã validate · runtime" : "Backend đã validate · imported";
    } else {
      state.validatedPrompt = null;
      $("[data-prompt-export]").disabled = true;
      $("[data-prompt-validation]").textContent = promptStage?.status === "failed" ? "Validate thất bại" : "Chưa validate";
    }
  }

  function renderJobs(jobs) {
    const root = $("[data-media-jobs]"); root.replaceChildren();
    if (!jobs.length) { root.append(make("p", "empty-state", "Chưa có media job.")); return; }
    jobs.forEach((job) => { const card = make("article", `job-card is-${job.status || "unknown"}`); card.append(make("strong", "", `${job.mediaType || "media"} · ${job.provider || "provider chưa rõ"}`), make("b", "", job.status || "unknown")); if (job.blockedReason || job.error) card.append(make("p", "", job.blockedReason || job.error)); if (job.providerJobId) card.append(make("small", "", `provider job: ${job.providerJobId}`)); root.append(card); });
  }

  function renderResults(measurements, winners, clones, drafts, mediaJobs) {
    const eligibleDrafts = getEligibleCreativeDrafts(drafts, mediaJobs), eligibleDraftIds = new Set(eligibleDrafts.map((draft) => draft.id));
    const eligibleWinners = winners.filter((winner) => eligibleDraftIds.has(winner.draftId) && asArray(winner.measurementIds).some((measurementId) => measurements.some((measurement) => measurement.id === measurementId && measurement.draftId === winner.draftId)));
    const winnerSelect = $("[data-winner-select]"); const winnerPrior = winnerSelect.value; winnerSelect.replaceChildren(new Option(eligibleWinners.length ? "Chọn winner" : "Chưa có winner đủ điều kiện", "")); eligibleWinners.forEach((winner) => winnerSelect.add(new Option(winner.title || winner.id, winner.id))); if ([...winnerSelect.options].some((option) => option.value === winnerPrior)) winnerSelect.value = winnerPrior;
    [$("[data-result-draft]"), $("[data-winner-draft]")].forEach((select) => {
      const prior = select.value; select.replaceChildren(new Option(eligibleDrafts.length ? "Chọn creative artifact" : "Chưa có creative artifact hoàn tất", ""));
      eligibleDrafts.forEach((draft) => select.add(new Option(`${draftLabel(draft)} · ${draft.payload.artifact.origin === "external_import" ? "external/unverified" : "provider output"}`, draft.id)));
      if ([...select.options].some((option) => option.value === prior)) select.value = prior;
    });
    const selectedWinnerDraftId = $("[data-winner-draft]").value;
    populateMeasurementSelect(selectedWinnerDraftId, measurements, drafts);
    $("[data-measurement-form] button[type='submit']").disabled = !eligibleDrafts.length;
    $("[data-winner-form] button[type='submit']").disabled = !selectedWinnerDraftId || !measurements.some((item) => item.draftId === selectedWinnerDraftId);
    $("[data-clone-form] button[type='submit']").disabled = !eligibleWinners.length;
    const root = $("[data-lineage-list]"); root.replaceChildren();
    if (!measurements.length && !winners.length && !clones.length) { root.append(make("p", "empty-state", "Chưa có measurement, winner hoặc clone.")); return; }
    measurements.forEach((item) => root.append(lineageItem("Measurement", `${item.metric}: ${item.value} ${item.unit}`, `Reference do người dùng nhập: ${item.evidenceRef}`)));
    winners.forEach((item) => root.append(lineageItem("Winner candidate", item.title || item.id, item.rationale)));
    clones.forEach((item) => root.append(lineageItem("Clone draft", item.title || item.id, `parent: ${item.parentDraftId || item.winnerId || "API không trả"}`)));
  }
  function populateMeasurementSelect(draftId, measurements = asArray(state.snapshot?.measurements), drafts = asArray(state.snapshot?.drafts)) {
    const select = $("[data-measurement-select]"), prior = [...select.selectedOptions].map((option) => option.value); select.replaceChildren();
    measurements.filter((item) => item.draftId === draftId).forEach((item) => { const draft = drafts.find((value) => value.id === item.draftId); const option = new Option(`${item.metric}: ${item.value} ${item.unit} · ${draft ? draftLabel(draft) : item.draftId}`, item.id); option.selected = prior.includes(item.id); select.add(option); });
    const submit = $("[data-winner-form] button[type='submit']"); if (submit) submit.disabled = !draftId || !select.options.length;
  }
  function lineageItem(type, title, copy) { const card = make("article", "lineage-item"); card.append(make("span", "", type), make("strong", "", title), make("p", "", copy || "")); return card; }

  async function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Không đọc được file.")); reader.readAsDataURL(file); }); }
  async function canvasBlob(canvas, quality) { return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality)); }
  async function compressImage(file) {
    if (!ALLOWED_IMAGES.has(file.type)) throw new Error("Chỉ nhận JPEG, PNG hoặc WEBP.");
    let bitmap;
    try { bitmap = await createImageBitmap(file); } catch { throw new Error("Trình duyệt không đọc được ảnh này."); }
    let width = bitmap.width, height = bitmap.height;
    const maxSide = 1600;
    if (file.size <= SOURCE_LIMIT && Math.max(width, height) <= maxSide) {
      bitmap.close?.();
      return { filename: file.name, dataUrl: await fileToDataUrl(file), bytes: file.size };
    }
    const ratio = Math.min(1, maxSide / Math.max(width, height)); width = Math.max(1, Math.round(width * ratio)); height = Math.max(1, Math.round(height * ratio));
    const canvas = document.createElement("canvas"), context = canvas.getContext("2d", { alpha: false });
    let blob = null;
    for (let pass = 0; pass < 8; pass += 1) {
      canvas.width = width; canvas.height = height; context.fillStyle = "#ffffff"; context.fillRect(0, 0, width, height); context.drawImage(bitmap, 0, 0, width, height);
      blob = await canvasBlob(canvas, Math.max(.42, .86 - pass * .07));
      if (blob && blob.size <= SOURCE_LIMIT) break;
      width = Math.max(320, Math.round(width * .82)); height = Math.max(320, Math.round(height * .82));
    }
    bitmap.close?.();
    if (!blob || blob.size > SOURCE_LIMIT) throw new Error("Không thể nén ảnh xuống dưới 256 KiB. Hãy chọn ảnh nhỏ hơn.");
    return { filename: file.name.replace(/\.[^.]+$/, "") + ".jpg", dataUrl: await fileToDataUrl(blob), bytes: blob.size };
  }

  function parseJson(text, label) { try { const value = JSON.parse(text); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); return value; } catch { throw new Error(`${label} không phải JSON object hợp lệ.`); } }
  function downloadJson(value, name) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

  $("[data-workflow-project-select]").addEventListener("change", (event) => chooseProject(event.target.value));
  $("[data-refresh]").addEventListener("click", () => loadProjects(state.projectId));
  window.addEventListener("workflow:provider-credentials-changed", () => { invalidatePilotPreflight("provider_credentials_changed"); state.autopilotPlan = null; closeAutopilotConfirm("Provider key đã đổi; hãy chuẩn bị kế hoạch mới."); updateRunButton(); loadAutopilotReadiness(true); });
  window.addEventListener("workflow:provider-configuration-changed", (event) => { const projectId = event.detail?.projectId || state.projectId; if (projectId) clearRunRequestId(projectId); invalidatePilotPreflight("provider_configuration_changed"); state.autopilotPlan = null; closeAutopilotConfirm("Model đã đổi; hãy chuẩn bị kế hoạch mới."); updateRunButton(); loadAutopilotReadiness(true); });
  $("[data-provider-preflight]").addEventListener("click", async (event) => {
    const button = event.currentTarget, status = $("[data-provider-preflight-status]");
    invalidatePilotPreflight(); updateRunButton();
    setBusy(button, true, "Đang kiểm tra…");
    setStatus(status, "Backend đang kiểm tra Secret và catalog; không chạy inference hoặc generation.");
    try {
      const payload = await request("/api/provider-preflight", { method: "POST", body: JSON.stringify(state.projectId ? { projectId: state.projectId } : {}) });
      renderProviderPreflight(payload);
      const openrouterState = providerUiState(safeObject(payload?.openrouter).status, safeObject(payload?.openrouter).roles);
      const pilotKey = safeObject(payload?.openrouter?.pilotKey), verified = openrouterState === "key_verified", budgetReady = pilotKey.budgetReady === true, creditsMode = pilotKey.billingMode === "openrouter_credits";
      setStatus(status, verified && budgetReady ? (creditsMode ? "OpenRouter credits only đã đạt credit cap; BYOK sẽ được kiểm tra theo từng response. Preflight không chạy inference." : "OpenRouter đã xác minh key, catalog và strict total cap. Preflight không chạy inference.") : verified ? "Key và catalog hợp lệ, nhưng budget guard của mode hiện tại chưa đạt. Nút chạy vẫn khóa." : `Đã nhận chẩn đoán an toàn: ${providerStateLabel(openrouterState)}. Không chạy inference.`, verified && budgetReady ? "success" : openrouterState === "missing" || openrouterState === "configured_unverified" ? "" : "error");
      announce("Đã kiểm tra kết nối API.");
    } catch (error) {
      invalidatePilotPreflight(); updateRunButton();
      setStatus(status, error.message, "error");
      announce("Không kiểm tra được kết nối API.");
      window.dispatchEvent(new CustomEvent("workflow:preflight-failed", { detail: { checkedAt: Date.now() } }));
    } finally { setBusy(button, false); }
  });
  $("[data-project-create-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-project-create-status]"); if (!form.reportValidity()) return; setBusy(form, true, "Đang tạo…");
    try { const payload = await request("/api/production/projects", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); form.elements.market.value = "Việt Nam"; setStatus(status, "Đã tạo dự án.", "success"); await loadProjects(payload.project.id); }
    catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });

  $("[data-source-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-source-status]"); if (!state.projectId) return setStatus(status, "Hãy chọn dự án.", "error"); if (!form.reportValidity()) return;
    const files = [["product", $("[data-source-input='product']").files[0]], ["packaging", $("[data-source-input='packaging']").files[0]]].filter(([, file]) => file);
    if (!files.length) return setStatus(status, "Hãy chọn ít nhất một ảnh.", "error");
    invalidatePilotPreflight("source_upload"); updateRunButton(); setBusy(form, true, "Đang nén…");
    try { for (const [kind, file] of files) { const compressed = await compressImage(file); setStatus(status, `Đang tải ${kind} (${Math.ceil(compressed.bytes / 1024)} KiB)…`); await workflowAction("source.put", { projectId: state.projectId, kind, filename: compressed.filename, dataUrl: compressed.dataUrl }); } clearRunRequestId(state.projectId); clearPromptEditor(); form.reset(); setStatus(status, "Source đã lưu; phân tích chưa tự chạy.", "success"); await refreshSnapshot(); }
    catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });
  $("[data-source-grid]").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-source-delete]"); if (!button || !state.projectId) return; button.disabled = true;
    invalidatePilotPreflight("source_delete"); updateRunButton();
    try { await workflowAction("source.delete", { projectId: state.projectId, sourceId: button.dataset.sourceDelete }); clearRunRequestId(state.projectId); clearPromptEditor(); await refreshSnapshot(); }
    catch (error) { setStatus($("[data-source-status]"), error.message, "error"); button.disabled = false; }
  });

  $("[data-run-workflow]").addEventListener("click", async (event) => {
    const button = event.currentTarget, status = $("[data-run-status]"); if (!state.projectId) return setStatus(status, "Hãy chọn dự án.", "error");
    if (state.runStarting) return;
    if (!pilotPreflightFresh()) return setStatus(status, "Hãy bấm Kiểm tra kết nối và xác nhận budget guard của billing mode cho source hiện tại trước khi chạy.", "error");
    const projectId = state.projectId, requestId = getRunRequestId(projectId);
    state.runStarting = true; clearRunError(); setBusy(button, true, "Pipeline đang chạy…"); setStatus(status, `Đang chạy pilot với trần cố định ${money(PILOT_CAP_USD)}. Không gửi job media.`);
    try { const payload = await workflowAction("run.start", { projectId, requestId }); if (["complete", "failed", "cancelled"].includes(payload.run?.status)) clearRunRequestId(projectId); renderBudget(payload.pilotBudget || payload.budget || payload.run?.budget || null, payload.run); setStatus(status, payload.run?.status === "complete" ? "Pipeline hoàn tất. Kiểm tra source research và prompt bên dưới." : `Run: ${payload.run?.status || "đã cập nhật"}.`, "success"); }
    catch (error) {
      const payload = safeObject(error.payload), details = safeObject(payload.details);
      const explicitStop = payload.retryable === false || details.retryable === false || payload.resumeSameRun === false || details.resumeSameRun === false;
      const costReviewRequired = COST_REVIEW_CODES.has(error.code) || ["budget_held", "budget_reconciling", "pilot_budget_reservation_exists"].includes(error.code);
      const resumable = !explicitStop && !costReviewRequired && (payload.resumeSameRun === true || payload.retryable === true || details.resumeSameRun === true || details.retryable === true || !error.status || error.status >= 500 || ["workflow_busy", "research_pending", "provider_not_configured", "model_unavailable", "openrouter_pilot_key_cap_required"].includes(error.code));
      if (error.code === "idempotency_conflict") clearRunRequestId(projectId);
      else if (!resumable && !costReviewRequired) clearRunRequestId(projectId);
      const message = error.code === "idempotency_conflict" ? "Source hoặc cấu hình pilot đã đổi. Nhấn Chạy pilot thật lần nữa để tạo run mới." : error.code === "workflow_busy" ? "Run này đang xử lý; lần thử lại sẽ giữ cùng request ID." : costReviewRequired ? `${error.message} Không retry bước có phí; chờ server đối soát hoặc mở lại run, sau đó giữ nguyên request ID.` : error.code === "openrouter_pilot_key_cap_required" ? `${error.message} Cần cấu hình budget guard phù hợp với billing mode trước khi thử lại cùng run.` : ["research_pending", "provider_not_configured", "model_unavailable"].includes(error.code) ? `${error.message} Sau khi kết nối sẵn sàng, thử lại sẽ tiếp tục cùng run.` : explicitStop ? `${error.message} Backend đã chặn retry; cần kiểm tra thủ công.` : resumable ? `${error.message} Có thể thử lại với cùng request ID.` : error.message;
      setStatus(status, message, "error"); renderRunError(error);
    }
    finally { try { await refreshSnapshot(); } finally { state.runStarting = false; setBusy(button, false); updateRunButton(); } }
  });

  $("[data-stage-import-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-stage-import-status]"); if (!state.projectId || !form.reportValidity()) return; setStatus(status, "Đang import…"); setBusy(form, true, "Đang import…");
    try { const data = Object.fromEntries(new FormData(form)), output = parseJson(data.output, "Output"); await workflowAction("stage.import", { projectId: state.projectId, stage: data.stage, output, actualModelId: data.actualModelId, providerRunId: data.providerRunId || undefined, note: data.note || undefined }); setStatus(status, "Đã import với origin imported; chưa phải bằng chứng model invocation.", "success"); form.reset(); await refreshSnapshot(); }
    catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });

  $("[data-prompt-import]").addEventListener("change", async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > SOURCE_LIMIT) throw new Error("File prompt vượt 256 KiB."); const value = JSON.parse(await file.text()), pair = value.output || value.payload || value; if (!pair.megaPrompt || !pair.negativePrompt) throw new Error("File phải có megaPrompt và negativePrompt."); $("[data-mega-json]").value = JSON.stringify(pair.megaPrompt, null, 2); $("[data-negative-json]").value = JSON.stringify(pair.negativePrompt, null, 2); state.validatedPrompt = null; $("[data-prompt-export]").disabled = true; $("[data-prompt-validation]").textContent = "Chưa validate"; }
    catch (error) { setStatus($("[data-prompt-status]"), error.message, "error"); }
  });
  $("[data-prompt-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-prompt-status]"); if (!state.projectId || !form.reportValidity()) return; setBusy(form, true, "Backend đang validate…");
    try { const megaPrompt = parseJson($("[data-mega-json]").value, "MEGA PROMPT"), negativePrompt = parseJson($("[data-negative-json]").value, "NEGATIVE PROMPT"), data = Object.fromEntries(new FormData(form)); await workflowAction("stage.import", { projectId: state.projectId, stage: "prompts", output: { megaPrompt, negativePrompt }, actualModelId: data.actualModelId, providerRunId: data.providerRunId || undefined, note: "Imported and backend-validated prompt pair" }); state.validatedPrompt = { megaPrompt, negativePrompt }; $("[data-prompt-export]").disabled = false; $("[data-prompt-validation]").textContent = "Backend đã validate · imported"; setStatus(status, "Cặp prompt đã qua backend validator; provenance vẫn là imported/unverified external.", "success"); await refreshSnapshot(); }
    catch (error) { state.validatedPrompt = null; $("[data-prompt-export]").disabled = true; $("[data-prompt-validation]").textContent = "Validate thất bại"; setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });
  $("[data-prompt-export]").addEventListener("click", () => { if (state.validatedPrompt) downloadJson(state.validatedPrompt, `prompt-pair-${state.projectId}.json`); });

  $("[data-media-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-media-status]"); if (!state.projectId || !form.reportValidity()) return; setBusy(form, true, "Đang lấy quote…"); clearMediaQuote();
    try {
      const data = Object.fromEntries(new FormData(form)), nodeId = data.mediaType, parameters = mediaNodeParameters(data.mediaType);
      await request("/api/media/settings", { method: "POST", body: JSON.stringify({ projectId: state.projectId, nodeId, provider: data.provider, mediaType: data.mediaType, modelId: data.modelId, parameters: mediaNodeParameters(data.mediaType) }) });
      const payload = await request("/api/media/quotes", { method: "POST", body: JSON.stringify({ projectId: state.projectId, nodeId, draftId: data.draftId }) });
      if (payload.cacheHit && payload.job) { setStatus(status, "Đã dùng lại kết quả hoàn tất có cùng source, prompt và model; không gửi request trả phí mới.", "success"); await loadMediaRuntime(true); return; }
      const quote = safeObject(payload.quote); if (!quote.id || quote.confirmationId !== quote.id) throw new Error("Quote không có confirmation ID hợp lệ.");
      state.mediaQuote = { ...quote, mediaType: data.mediaType, parameters }; const panel = $("[data-media-quote]"), confirm = $("[data-media-confirm]"); panel.hidden = false; $("[data-media-quote-amount]").textContent = `${money(quote.reserveUsd)} giữ chỗ${quote.estimatedUsd == null ? "" : ` · ước tính ${money(quote.estimatedUsd)}`}`; $("[data-media-quote-expiry]").textContent = `Hết hạn ${formatDate(Number(quote.expiresAt) * 1000)} · Quote ${quote.id}`; $("[data-media-quote-warning]").textContent = quote.estimateWarning === "provider_estimate_unavailable" ? "Provider không trả estimate; ứng dụng giữ mức tối đa/job. Đây không phải hard cap tại provider." : quote.warning || (data.mediaType === "video" && parameters.totalDuration > 15 ? `Quote này chỉ dành cho một đoạn ${parameters.segmentSeconds}s trong kế hoạch ${parameters.totalDuration}s; chưa báo giá toàn bộ video dài.` : "Mức giữ của ứng dụng không phải hard cap tại provider."); confirm.disabled = !state.mediaExecutionEnabled; confirm.textContent = state.mediaExecutionEnabled ? "Xác nhận & gửi job" : "Server đang khóa submit trả phí"; setStatus(status, state.mediaExecutionEnabled ? (data.mediaType === "video" ? `Quote đoạn ${parameters.segmentSeconds}s đã sẵn sàng. Chỉ nút Xác nhận & gửi job mới gọi provider.` : "Quote ảnh đã sẵn sàng. Chỉ nút Xác nhận & gửi job mới gọi provider.") : "Quote đã sẵn sàng nhưng media execution đang tắt; chưa gửi provider và chưa phát sinh job.", state.mediaExecutionEnabled ? "success" : "");
    } catch (error) { const message = error.code === "media_budget_not_active" ? "Ngân sách media đang là 0 USD. Nhập tổng trần và tối đa/job rồi bấm Lưu ngân sách trước khi lấy quote." : error.code === "media_provider_not_configured" ? "Provider chưa có key. Mở Thiết lập chạy, lưu key rồi thử lại." : error.code === "prompt_not_verified" || error.code === "verified_prompt_not_found" ? "Cần prompt current do pipeline runtime đã xác minh; prompt import thủ công không đủ điều kiện chạy media." : error.message; setStatus(status, message, "error"); }
    finally { setBusy(form, false); updateMediaSubmit(); }
  });

  $("[data-media-budget-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-media-budget-status]"); if (!state.projectId || !form.reportValidity()) return; const data = Object.fromEntries(new FormData(form)), totalUsd = Number(data.totalUsd), maxPerJobUsd = Number(data.maxPerJobUsd); setBusy(form, true, "Đang lưu…"); clearMediaQuote("Ngân sách thay đổi; quote cũ đã được bỏ khỏi màn hình.");
    try { const payload = await request("/api/media/budget", { method: "POST", body: JSON.stringify({ projectId: state.projectId, totalUsd, maxPerJobUsd }) }); renderMediaBudget(payload.budget); }
    catch (error) { setStatus(status, error.message, "error"); }
    finally { setBusy(form, false); }
  });
  $("[data-media-confirm]").addEventListener("click", async (event) => {
    const button = event.currentTarget, quote = state.mediaQuote, status = $("[data-media-status]"); if (!quote || !state.projectId || !state.mediaExecutionEnabled || button.disabled) return;
    if (!button.dataset.idempotencyKey) button.dataset.idempotencyKey = crypto.randomUUID?.() || `media-${Date.now()}`; setBusy(button, true, "Đang gửi đúng 1 lần…");
    try { const payload = await request("/api/media/jobs", { method: "POST", body: JSON.stringify({ projectId: state.projectId, nodeId: quote.nodeId, quoteId: quote.id, confirmationId: quote.confirmationId, idempotencyKey: button.dataset.idempotencyKey }) }); setStatus(status, `Job ${payload.job?.id || ""} đã được backend chấp nhận${quote.mediaType === "video" ? ` cho một đoạn ${quote.parameters?.segmentSeconds || 15}s` : ""}. Paid submit không tự retry.`, "success"); clearMediaQuote(); await loadMediaRuntime(true); }
    catch (error) { setStatus(status, error.code === "media_execution_disabled" ? "Server đang khóa media execution. Quote được giữ, không gửi provider." : error.code === "media_submit_outcome_unknown" ? `${error.message} Không bấm gửi lại; dùng job ID trong chẩn đoán để đối soát.` : error.message, "error"); }
    finally { setBusy(button, false); if (state.mediaQuote) button.disabled = !state.mediaExecutionEnabled; }
  });
  $("[data-media-runtime-jobs]").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-media-poll]"); if (!button) return; setBusy(button, true, "Đang đọc trạng thái…"); try { await request(`/api/media/jobs/${encodeURIComponent(button.dataset.mediaPoll)}/poll`, { method: "POST", body: "{}" }); await loadMediaRuntime(true); } catch (error) { setStatus($("[data-media-status]"), error.code === "media_poll_retryable" ? "Chưa đọc được status provider. Có thể bấm cập nhật lại cùng job; hệ thống không submit lại." : error.message, "error"); } finally { setBusy(button, false); }
  });

  $("[data-media-provider]").addEventListener("change", () => { clearMediaQuote("Provider đổi; cần lấy quote mới."); populateMediaModels(); saveMediaPreferences(); });
  $("[data-media-type]").addEventListener("change", () => { clearMediaQuote("Loại media đổi; cần lấy quote mới."); renderMediaSegmentNote(); populateMediaModels(); saveMediaPreferences(); });
  $("[data-media-model]").addEventListener("change", () => { clearMediaQuote("Model đổi; cần lấy quote mới."); saveMediaPreferences(); updateMediaSubmit(); });
  $("[data-media-draft]").addEventListener("change", () => { clearMediaQuote("Prompt đổi; cần lấy quote mới."); updateMediaSubmit(); });
  window.addEventListener("workflow:media-planning-changed", async (event) => { const detail = safeObject(event.detail); if (!["image", "video"].includes(detail.mediaType) || !["fal", "openrouter", "replicate"].includes(detail.provider)) return; $("[data-media-type]").value = detail.mediaType; $("[data-media-provider]").value = detail.provider; clearMediaQuote("Cấu hình node đổi; cần lấy quote mới."); renderMediaSegmentNote(detail.mediaType); await populateMediaModels(detail.modelId || ""); saveMediaPreferences(); });

  $("[data-auto-open-setup]").addEventListener("click", () => {
    const action = $("[data-auto-open-setup]").dataset.autoSetupAction; if (action === "credentials") return $("[data-wc-provider-open-top]")?.click(); if (action === "refresh") return loadAutopilotReadiness(true);
    const output = selectedAutopilotOutput(); window.dispatchEvent(new CustomEvent("workflow:open-media-setup", { detail: { mediaType: output.mediaType } }));
  });
  $("[data-auto-source-action]").addEventListener("click", () => window.dispatchEvent(new CustomEvent("workflow:open-source-manager", { detail: { projectId: state.projectId } })));
  $("[data-autopilot-form]").addEventListener("change", () => {
    if (state.autopilotPlan) { state.autopilotPlan = null; closeAutopilotConfirm("Thiết lập Autopilot đã đổi; bấm Bắt đầu tự động để tạo kế hoạch mới."); }
    loadAutopilotReadiness(true);
  });
  $("[data-autopilot-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, button = $("[data-auto-start]"), status = $("[data-auto-status]");
    if (!state.projectId || !form.reportValidity()) return;
    if (state.autopilotReadiness?.ready !== true) { await loadAutopilotReadiness(true); if (state.autopilotReadiness?.ready !== true) return; }
    const projectId = state.projectId, epoch = state.projectSelectionEpoch, data = Object.fromEntries(new FormData(form)), budgetUsd = Number(data.budgetUsd), maxPerJobUsd = Number(data.maxPerJobUsd), mediaType = data.mediaType;
    if (!(budgetUsd > 0 && budgetUsd <= 2 && maxPerJobUsd > 0 && maxPerJobUsd <= budgetUsd)) return setStatus(status, "Ngân sách phải lớn hơn 0, tối đa 2 USD; tối đa/job không được vượt tổng trần.", "error");
    button.dataset.autopilotRequestEpoch = String(epoch); setBusy(button, true, "Đang chuẩn bị kế hoạch…"); setStatus(status, "Hệ thống đang khóa ảnh, model và ngân sách. Chưa có request trả phí.");
    try {
      const payload = await request("/api/autopilot/plan", { method: "POST", body: JSON.stringify({ projectId, goal: data.goal, output: { mediaType, nodeId: mediaType, ...(mediaType === "video" ? { segmentSeconds: 15 } : {}) }, budgetUsd, maxPerJobUsd, creativePriority: data.creativePriority }) }); if (!sameAutopilotScope({ projectId, epoch }, { projectId: state.projectId, epoch: state.projectSelectionEpoch })) return; const plan = safeObject(payload.plan);
      if (!validAutopilotPlan(plan)) throw new Error("Kế hoạch không có fingerprint hoặc confirmation ID hợp lệ.");
      state.autopilotPlan = plan;
      if (plan.status !== "ready") { renderAutopilotReadiness(safeObject(plan.readiness)); return setStatus(status, "Kế hoạch đang bị chặn. Xem lý do và sửa cấu hình trước khi chạy.", "error"); }
      openAutopilotConfirm(plan); setStatus(status, "Kế hoạch đã sẵn sàng; đang chờ xác nhận cuối. Chưa gửi request trả phí.", "success");
    } catch (error) {
      const blockers = asArray(error.payload?.details?.blockers || error.payload?.blockers).map(autopilotBlockerText), message = error.code === "autopilot_not_ready" ? `Autopilot chưa sẵn sàng${blockers.length ? `: ${blockers.join(" · ")}` : "."}` : error.code === "autopilot_budget_exceeded" ? "Ngân sách vượt trần Autopilot 2 USD." : error.message;
      if (sameAutopilotScope({ projectId, epoch }, { projectId: state.projectId, epoch: state.projectSelectionEpoch })) { setStatus(status, message, "error"); await loadAutopilotReadiness(true); }
    } finally { if (button.dataset.autopilotRequestEpoch === String(epoch)) { delete button.dataset.autopilotRequestEpoch; setBusy(button, false); button.disabled = state.autopilotReadiness?.ready !== true; } }
  });
  $$('[data-auto-confirm-close]').forEach((button) => button.addEventListener("click", () => closeAutopilotConfirm()));
  $("[data-auto-confirm-start]").addEventListener("click", async (event) => {
    const button = event.currentTarget, plan = state.autopilotPlan, status = $("[data-auto-confirm-status]"); if (!plan?.id || button.disabled) return;
    const projectId = state.projectId, epoch = state.projectSelectionEpoch, planId = plan.id, idempotencyKey = getAutopilotIntent(plan.id); button.dataset.autopilotRequestEpoch = String(epoch); setBusy(button, true, "Đang bắt đầu đúng một lần…");
    try {
      const payload = await request("/api/autopilot/start", { method: "POST", body: JSON.stringify({ planId: plan.id, confirmationId: plan.confirmationId, idempotencyKey }) }), run = safeObject(payload.run);
      if (!sameAutopilotScope({ projectId, epoch, planId }, { projectId: state.projectId, epoch: state.projectSelectionEpoch, planId: state.autopilotPlan?.id })) return;
      if (!run.id) throw new Error("Hệ thống không trả mã tiến trình."); state.autopilotRunConfirmationId = plan.confirmationId; writeAutopilotRunRef(state.projectId, run.id, plan.confirmationId); renderAutopilotRun(run); closeAutopilotConfirm(); setStatus($("[data-auto-status]"), "Phiên tự động đã được xếp hàng. Hệ thống không tự gửi lại request có phí.", "success");
    } catch (error) {
      if (!sameAutopilotScope({ projectId, epoch, planId }, { projectId: state.projectId, epoch: state.projectSelectionEpoch, planId: state.autopilotPlan?.id })) return; const message = error.code === "autopilot_plan_stale" ? "Source hoặc model đã đổi; kế hoạch này hết hiệu lực. Đóng và chuẩn bị lại." : error.code === "autopilot_confirmation_invalid" ? "Confirmation ID không khớp kế hoạch; chưa có run được tạo." : error.code === "autopilot_idempotency_conflict" ? "Request ID đã thuộc kế hoạch khác; backend chặn để tránh gửi trùng." : error.code === "autopilot_budget_exceeded" ? "Run bị chặn vì vượt trần 2 USD." : error.message; setStatus(status, message, "error"); if (error.code === "autopilot_plan_stale") loadAutopilotReadiness(true);
    } finally { if (button.dataset.autopilotRequestEpoch === String(epoch)) { delete button.dataset.autopilotRequestEpoch; setBusy(button, false); button.disabled = state.autopilotPlan?.status !== "ready"; } }
  });
  $("[data-auto-refresh]").addEventListener("click", async (event) => { const button = event.currentTarget; if (!state.autopilotRun?.id) return; setBusy(button, true, "Đang đồng bộ…"); try { await loadAutopilotRun(state.autopilotRun.id); } finally { setBusy(button, false); } });
  $("[data-auto-cancel]").addEventListener("click", async (event) => {
    const button = event.currentTarget, run = state.autopilotRun, status = $("[data-auto-status]"), projectId = state.projectId; if (!run?.id || button.disabled) return; setBusy(button, true, "Đang dừng bước tương lai…");
    try { const payload = await request(`/api/autopilot/runs/${encodeURIComponent(run.id)}/cancel`, { method: "POST", body: JSON.stringify({ confirmationId: state.autopilotRunConfirmationId }) }); if (state.projectId !== projectId || state.autopilotRun?.id !== run.id) return; renderAutopilotRun(payload.run); setStatus(status, "Đã yêu cầu dừng các bước chưa gửi. Request provider đã gửi trước đó không thể thu hồi.", "success"); }
    catch (error) { if (state.projectId === projectId) setStatus(status, error.message, "error"); } finally { setBusy(button, false); }
  });

  $("[data-creative-import-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-creative-import-status]"); if (!state.projectId || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    if (!isHttpsUrl(data.locator)) return setStatus(status, "Asset phải dùng URL HTTPS hợp lệ.", "error");
    setBusy(form, true, "Đang lưu…");
    try {
      await workflowAction("draft.put", { projectId: state.projectId, draftType: "creative", title: data.title, payload: { testingStatus: "ready", promptDraftId: data.promptDraftId, artifact: { origin: "external_import", mediaType: data.mediaType, locator: data.locator, evidenceRef: data.evidenceRef } } });
      setStatus(status, "Creative đã lưu là external_import · unverified external.", "success"); form.reset(); await refreshSnapshot();
    } catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });

  $("[data-winner-draft]").addEventListener("change", (event) => populateMeasurementSelect(event.target.value));

  $("[data-measurement-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-measurement-status]"); if (!state.projectId || !form.reportValidity()) return; setBusy(form, true, "Đang lưu…");
    try { const data = Object.fromEntries(new FormData(form)); await workflowAction("measurement.record", { projectId: state.projectId, draftId: data.draftId, metric: data.metric, value: Number(data.value), unit: data.unit, evidenceRef: data.evidenceRef, observedAt: new Date(data.observedAt).toISOString() }); setStatus(status, "Measurement đã lưu.", "success"); form.reset(); await refreshSnapshot(); }
    catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });
  $("[data-winner-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-winner-status]"); if (!state.projectId || !form.reportValidity()) return; const data = new FormData(form), measurementIds = data.getAll("measurementIds"); if (!measurementIds.length) return setStatus(status, "Hãy chọn measurement.", "error"); setBusy(form, true, "Đang lưu…");
    try { await workflowAction("winner.select", { projectId: state.projectId, draftId: data.get("draftId"), measurementIds, rationale: data.get("rationale") }); setStatus(status, "Winner candidate đã lưu theo measurement và reference do người dùng nhập.", "success"); form.reset(); await refreshSnapshot(); }
    catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });
  $("[data-clone-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-clone-status]"); if (!state.projectId || !form.reportValidity()) return; setBusy(form, true, "Đang clone…");
    try { const data = Object.fromEntries(new FormData(form)); await workflowAction("winner.clone", { projectId: state.projectId, winnerId: data.winnerId, title: data.title || undefined }); setStatus(status, "Clone draft đã tạo với lineage; chưa là winner.", "success"); form.reset(); await refreshSnapshot(); }
    catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });

  const initialProjectId = new URLSearchParams(location.search).get("projectId") || "";
  loadProjects(initialProjectId);
})();
