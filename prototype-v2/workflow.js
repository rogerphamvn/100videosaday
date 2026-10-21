(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { projects: [], projectId: "", snapshot: null, validatedPrompt: null, busy: false };
  const live = $("[data-live-region]");
  const SOURCE_LIMIT = 256 * 1024;
  const ALLOWED_IMAGES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const formatDate = (value) => {
    if (!value) return "không có ngày";
    const date = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
  const isSafeUrl = (value) => { try { return ["http:", "https:"].includes(new URL(value, location.origin).protocol); } catch { return false; } };
  const isHttpsUrl = (value) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
  function make(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = String(text); return node; }
  function runIntentKey(projectId) { return `creative-hook-lab:run-intent:${projectId}`; }
  function getRunRequestId(projectId) {
    try { const saved = sessionStorage.getItem(runIntentKey(projectId)); if (saved) return saved; } catch { /* session storage can be disabled */ }
    const requestId = crypto.randomUUID?.() || `run-${Date.now()}-${Array.from(crypto.getRandomValues(new Uint32Array(2)), (value) => value.toString(36)).join("")}`;
    try { sessionStorage.setItem(runIntentKey(projectId), requestId); } catch { /* keep in this click only */ }
    return requestId;
  }
  function clearRunRequestId(projectId) { try { sessionStorage.removeItem(runIntentKey(projectId)); } catch { /* no-op */ } }
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
      if (select.value) await chooseProject(select.value);
      else renderEmptyProject();
    } catch (error) {
      setStatus(apiState, error.message, "error"); renderEmptyProject();
    }
  }

  async function chooseProject(projectId) {
    const projectChanged = state.projectId !== projectId;
    state.projectId = projectId; state.snapshot = null;
    if (projectChanged) { clearPromptEditor(); setStatus($("[data-run-status]"), "Chưa có run. API không kết nối sẽ dừng pipeline với lỗi rõ ràng."); }
    const url = new URL(location.href); if (projectId) url.searchParams.set("projectId", projectId); else url.searchParams.delete("projectId"); history.replaceState(null, "", url);
    if (!projectId) { renderEmptyProject(); return; }
    $("[data-project-state]").textContent = "Đang tải…";
    $$('[data-requires-project]').forEach((panel) => panel.removeAttribute("aria-disabled"));
    try {
      state.snapshot = await request(`/api/workflow?projectId=${encodeURIComponent(projectId)}`);
      renderSnapshot();
      announce("Đã tải workflow dự án.");
    } catch (error) {
      $("[data-project-state]").textContent = "Không tải được";
      setStatus($("[data-run-status]"), error.message, "error");
    }
  }

  async function refreshSnapshot() { if (state.projectId) await chooseProject(state.projectId); }
  function renderEmptyProject() {
    state.projectId = ""; state.snapshot = null; clearPromptEditor();
    $("[data-project-state]").textContent = "Chưa chọn";
    $$('[data-requires-project]').forEach((panel) => panel.setAttribute("aria-disabled", "true"));
    renderSources([]); renderProviders({}); renderStages([], null); renderResearch([]); renderDrafts([]); renderJobs([]); renderResults([], [], [], [], []);
    updateProgress();
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
    const project = snapshot.project || state.projects.find((item) => item.id === state.projectId);
    $("[data-project-state]").textContent = project ? `${project.name} · ${project.product}` : "Dự án đã chọn";
    renderSources(asArray(snapshot.sources));
    renderProviders(safeObject(snapshot.providerReadiness));
    renderStages(asArray(snapshot.stages), snapshot.activeRun);
    renderResearch(asArray(snapshot.stages), snapshot.activeRun);
    renderDrafts(asArray(snapshot.drafts));
    renderJobs(asArray(snapshot.mediaJobs));
    renderResults(asArray(snapshot.measurements), asArray(snapshot.winners), asArray(snapshot.clones), asArray(snapshot.drafts), asArray(snapshot.mediaJobs));
    updateProgress();
  }

  function renderSources(sources) {
    $("[data-source-count]").textContent = `${sources.length} / 4 source`;
    const hasProduct = sources.some((item) => item.kind === "product");
    $("[data-run-workflow]").disabled = !state.projectId || !hasProduct;
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

  function renderProviders(readiness) {
    const root = $("[data-provider-strip]"); root.replaceChildren();
    const jev = safeObject(readiness.jev), openrouter = safeObject(readiness.openrouter), media = safeObject(readiness.media);
    const models = safeObject(openrouter.models), configuredModels = Object.entries(models).filter(([, id]) => typeof id === "string" && id.trim());
    const mappings = safeObject(media.mappings), configuredMappings = Object.entries(mappings).filter(([, id]) => typeof id === "string" && id.trim());
    const openrouterReady = openrouter.configured === true && configuredModels.length === 4 && openrouter.policySatisfied === true;
    const items = [
      { ok: jev.configured === true, label: `Research / Jev: ${jev.configured === true ? "config hiện diện · health chưa xác minh · yêu cầu citation có ngày" : "chưa đủ bridge/token"}` },
      { ok: openrouterReady, label: `Model / OpenRouter: ${openrouter.configured !== true ? "chưa cấu hình key" : openrouter.policySatisfied !== true ? `${configuredModels.length}/4 model ID · sai policy vai trò` : `${configuredModels.length}/4 model ID · catalog preflight khi chạy`}`, title: configuredModels.map(([stage, id]) => `${stage}: ${id}`).join("\n") },
      { ok: media.executionEnabled === true && configuredMappings.length > 0, label: `Media: ${media.executionEnabled === true ? `execution bật · ${configuredMappings.length}/4 mapping · health chưa xác minh` : `execution tắt · ${configuredMappings.length}/4 mapping`}`, title: configuredMappings.map(([kind, id]) => `${kind}: ${id}`).join("\n") }
    ];
    items.forEach((value) => { const item = make("span", value.ok ? "is-configured" : "is-blocked", value.label); if (value.title) item.title = value.title; root.append(item); });
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
    refs.forEach((ref) => { const evidence = evidenceById.get(ref), label = evidence ? `${evidence.title || ref} · ${formatDate(evidence.publishedAt)}` : ref; if (evidence?.url && isSafeUrl(evidence.url)) { const link = make("a", "", label); link.href = evidence.url; link.target = "_blank"; link.rel = "noreferrer"; row.append(link); } else row.append(make("span", "", label)); });
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
      card.append(make("small", "", `Published: ${formatDate(item.publishedAt)} · Retrieved: ${formatDate(item.retrievedAt)}`)); evidenceRoot.append(card);
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
    const mediaSelect = $("[data-media-draft]"); mediaSelect.replaceChildren(new Option(runtimePromptDrafts.length ? "Chọn prompt runtime đã xác minh" : "Chưa có prompt runtime đủ điều kiện", "")); runtimePromptDrafts.forEach((draft) => mediaSelect.add(new Option(draftLabel(draft), draft.id)));
    const creativePrompt = $("[data-creative-prompt]"); const priorCreativePrompt = creativePrompt.value; creativePrompt.replaceChildren(new Option(promptDrafts.length ? "Chọn prompt hợp lệ" : "Chưa có prompt hợp lệ", "")); promptDrafts.forEach((draft) => creativePrompt.add(new Option(`${draftLabel(draft)} · ${draft.authoringTrust || "trust chưa rõ"}`, draft.id))); if ([...creativePrompt.options].some((option) => option.value === priorCreativePrompt)) creativePrompt.value = priorCreativePrompt;
    $("[data-media-form] button[type='submit']").disabled = !runtimePromptDrafts.length;
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
    if (file.size <= SOURCE_LIMIT) return { filename: file.name, dataUrl: await fileToDataUrl(file), bytes: file.size };
    let bitmap;
    try { bitmap = await createImageBitmap(file); } catch { throw new Error("Trình duyệt không đọc được ảnh này."); }
    let width = bitmap.width, height = bitmap.height;
    const maxSide = 1600, ratio = Math.min(1, maxSide / Math.max(width, height)); width = Math.max(1, Math.round(width * ratio)); height = Math.max(1, Math.round(height * ratio));
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
  $("[data-project-create-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-project-create-status]"); if (!form.reportValidity()) return; setBusy(form, true, "Đang tạo…");
    try { const payload = await request("/api/production/projects", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); form.elements.market.value = "Việt Nam"; setStatus(status, "Đã tạo dự án.", "success"); await loadProjects(payload.project.id); }
    catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });

  $("[data-source-form]").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-source-status]"); if (!state.projectId) return setStatus(status, "Hãy chọn dự án.", "error"); if (!form.reportValidity()) return;
    const files = [["product", $("[data-source-input='product']").files[0]], ["packaging", $("[data-source-input='packaging']").files[0]]].filter(([, file]) => file);
    if (!files.length) return setStatus(status, "Hãy chọn ít nhất một ảnh.", "error");
    setBusy(form, true, "Đang nén…");
    try { for (const [kind, file] of files) { const compressed = await compressImage(file); setStatus(status, `Đang tải ${kind} (${Math.ceil(compressed.bytes / 1024)} KiB)…`); await workflowAction("source.put", { projectId: state.projectId, kind, filename: compressed.filename, dataUrl: compressed.dataUrl }); } clearRunRequestId(state.projectId); clearPromptEditor(); form.reset(); setStatus(status, "Source đã lưu; phân tích chưa tự chạy.", "success"); await refreshSnapshot(); }
    catch (error) { setStatus(status, error.message, "error"); } finally { setBusy(form, false); }
  });
  $("[data-source-grid]").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-source-delete]"); if (!button || !state.projectId) return; button.disabled = true;
    try { await workflowAction("source.delete", { projectId: state.projectId, sourceId: button.dataset.sourceDelete }); clearRunRequestId(state.projectId); clearPromptEditor(); await refreshSnapshot(); }
    catch (error) { setStatus($("[data-source-status]"), error.message, "error"); button.disabled = false; }
  });

  $("[data-run-workflow]").addEventListener("click", async (event) => {
    const button = event.currentTarget, status = $("[data-run-status]"); if (!state.projectId) return setStatus(status, "Hãy chọn dự án.", "error"); const projectId = state.projectId, requestId = getRunRequestId(projectId); setBusy(button, true, "Pipeline đang chạy…");
    try { const payload = await workflowAction("run.start", { projectId, requestId }); clearRunRequestId(projectId); setStatus(status, payload.run?.status === "complete" ? "Pipeline hoàn tất." : `Run: ${payload.run?.status || "đã cập nhật"}.`, "success"); }
    catch (error) { const resumable = !error.status || error.status >= 500 || ["workflow_busy", "research_pending", "provider_not_configured", "model_unavailable"].includes(error.code); if (!resumable) clearRunRequestId(projectId); const message = error.code === "idempotency_conflict" ? "Source đã đổi từ lần chạy trước. Nhấn Chạy pipeline lần nữa để tạo run mới." : error.code === "workflow_busy" ? "Run này đang xử lý; lần thử lại sẽ giữ cùng request ID." : ["research_pending", "provider_not_configured", "model_unavailable"].includes(error.code) ? `${error.message} Sau khi connector sẵn sàng, thử lại sẽ tiếp tục cùng run.` : resumable ? `${error.message} Có thể thử lại với cùng request ID.` : error.message; setStatus(status, message, "error"); }
    finally { await refreshSnapshot(); setBusy(button, false); }
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
    event.preventDefault(); const form = event.currentTarget, status = $("[data-media-status]"); if (!state.projectId || !form.reportValidity()) return; setBusy(form, true, "Đang xếp hàng…");
    try { const data = Object.fromEntries(new FormData(form)); await workflowAction("media.queue", { projectId: state.projectId, draftId: data.draftId, provider: data.provider, mediaType: data.mediaType, executionBudgetUsd: Number(data.executionBudgetUsd) }); setStatus(status, "Media job đã được backend chấp nhận.", "success"); }
    catch (error) { const message = error.code === "media_quote_confirmation_required" ? "Job đã lưu blocked_config: cần xác nhận quote/budget trước khi gửi provider; v0.8 chưa có bước xác nhận này." : error.status === 503 ? `${error.message} Job không tạo media giả.` : error.message; setStatus(status, message, "error"); }
    finally { await refreshSnapshot(); setBusy(form, false); }
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
