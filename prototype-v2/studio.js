(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { dashboard: null, integrations: null, audioUrl: null };
  const live = $("[data-live-region]");

  function announce(message) { live.textContent = ""; requestAnimationFrame(() => { live.textContent = message; }); }
  function setStatus(node, message, kind = "") { if (!node) return; node.textContent = message; node.classList.toggle("is-error", kind === "error"); node.classList.toggle("is-success", kind === "success"); }
  function escapeText(value) { return String(value ?? ""); }
  function setBusy(form, busy, label) { const button = $("button[type='submit']", form); if (!button) return; if (!button.dataset.label) button.dataset.label = button.textContent; button.disabled = busy; button.setAttribute("aria-busy", String(busy)); button.textContent = busy ? label : button.dataset.label; }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
    if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.hash)}`); throw new Error("Cần đăng nhập lại."); }
    if (!response.ok) {
      let payload = {}; try { payload = await response.json(); } catch { /* response can be plain text */ }
      const error = new Error(payload.message || `Yêu cầu thất bại (${response.status}).`); error.code = payload.error || payload.code; error.status = response.status; throw error;
    }
    return response;
  }

  function providerShape(key) {
    const fromDashboard = state.dashboard?.providerReadiness?.[key] || {};
    const status = state.integrations || {};
    const source = status.integrations?.[key] || status.providers?.[key] || status[key] || fromDashboard;
    const configured = Boolean(source?.configured);
    const verified = source?.status === "ready";
    const label = !configured ? "Chưa cấu hình" : (verified ? "Đã xác minh" : "Đã cấu hình • chưa xác minh");
    return { ...source, configured, verified, label };
  }

  function renderProviders() {
    ["research", "voice", "render"].forEach((key) => {
      const provider = providerShape(key);
      $$(`[data-provider='${key}'], [data-pipe='${key}']`).forEach((node) => { node.textContent = provider.label; node.classList.toggle("is-ready", provider.verified); node.classList.toggle("is-blocked", !provider.verified); });
    });
    const research = providerShape("research"), voice = providerShape("voice");
    const researchBadge = $("[data-research-badge]"); researchBadge.textContent = research.verified ? "Jev đã xác minh" : (research.configured ? "Jev đã cấu hình • chưa xác minh" : "Jev chưa cấu hình"); researchBadge.className = `integration-badge ${research.verified ? "is-ready" : "is-blocked"}`;
    const voiceBadge = $("[data-voice-badge]"); voiceBadge.textContent = voice.verified ? "VieNeu đã xác minh" : (voice.configured ? "VieNeu đã cấu hình • chưa xác minh" : "VieNeu chưa cấu hình"); voiceBadge.className = `integration-badge ${voice.verified ? "is-ready" : "is-blocked"}`;
    const presets = voice.presets || state.integrations?.voicePresets || [];
    const select = $("[data-voice-select]"); const prior = select.value; select.replaceChildren(new Option("Mặc định của server", ""));
    presets.forEach((preset) => { const value = typeof preset === "string" ? preset : preset.id; const label = typeof preset === "string" ? preset : (preset.name || preset.label || preset.id); if (value) select.add(new Option(label, value)); });
    if ([...select.options].some((option) => option.value === prior)) select.value = prior;
  }

  function projectOption(project) { return new Option(project.name, project.id); }
  function renderDashboard() {
    const dashboard = state.dashboard || { projects: [], batches: [], totals: {} };
    const totals = dashboard.totals || {};
    $("[data-metric='target']").textContent = totals.targetPlanned ?? 0;
    $("[data-metric='ready']").textContent = totals.readyCount ?? 0;
    $("[data-metric='batches']").textContent = totals.batchCount ?? dashboard.batches.length;
    $("[data-metric='projects']").textContent = totals.projectCount ?? dashboard.projects.length;
    $("[data-ready-badge]").textContent = totals.readyCount ?? 0;
    $$('[data-project-select]').forEach((select) => { const prior = select.value; const placeholder = select.required ? "Chọn dự án" : "Không gắn dự án"; select.replaceChildren(new Option(placeholder, "")); dashboard.projects.forEach((project) => select.add(projectOption(project))); if ([...select.options].some((option) => option.value === prior)) select.value = prior; });
    const projectList = $("[data-project-list]"); projectList.replaceChildren();
    if (!dashboard.projects.length) projectList.innerHTML = '<p class="empty-state">Chưa có dữ liệu dự án.</p>';
    dashboard.projects.forEach((project) => { const item = document.createElement("article"); item.className = "project-row"; const title = document.createElement("strong"), copy = document.createElement("span"), count = document.createElement("span"); title.textContent = project.name; copy.textContent = `${project.product} • ${project.market}`; count.textContent = `${project.batchCount || 0} batch`; item.append(title, copy, count); projectList.append(item); });
    const batchList = $("[data-batch-list]"); const qualitySelect = $("[data-quality-batch]"); const qualityPrior = qualitySelect.value; batchList.replaceChildren(); qualitySelect.replaceChildren(new Option("Chọn batch", ""));
    if (!dashboard.batches.length) batchList.innerHTML = '<p class="empty-state">Chưa có batch. Tạo một dự án rồi lập capacity plan.</p>';
    dashboard.batches.slice(0, 8).forEach((batch) => {
      const row = document.createElement("article"); row.className = "batch-row"; const button = document.createElement("button"); button.type = "button"; button.dataset.batchId = batch.id; const title = document.createElement("strong"), meta = document.createElement("span"), status = document.createElement("b"); title.textContent = `${batch.targetCount} video • ${batch.durationSeconds}s • ${batch.format}`; meta.textContent = `${batch.readyCount || 0} ready / ${batch.plannedCount || 0} planned`; status.textContent = batch.status === "blocked_provider" ? "Chờ connector" : batch.status; status.classList.toggle("is-blocked", batch.status === "blocked_provider"); button.append(title, meta, status); row.append(button); batchList.append(row); qualitySelect.add(new Option(`${batch.targetCount} video • ${batch.id.slice(0, 8)}`, batch.id));
    });
    if ([...qualitySelect.options].some((option) => option.value === qualityPrior)) qualitySelect.value = qualityPrior;
    renderProviders();
  }

  async function loadDashboard() {
    const apiState = $("[data-api-state]"); const context = apiState.closest(".topbar-context"); apiState.textContent = "Đang đồng bộ dữ liệu…"; context.className = "topbar-context";
    try {
      const response = await request("/api/production/dashboard"); state.dashboard = await response.json();
      try { const integrationResponse = await request("/api/integrations/status"); state.integrations = await integrationResponse.json(); } catch { state.integrations = null; }
      renderDashboard(); apiState.textContent = "Dữ liệu production đã đồng bộ"; context.classList.add("is-online");
    } catch (error) { apiState.textContent = error.message; context.classList.add("is-error"); renderProviders(); }
  }

  function showSection(name, updateHash = true) {
    const valid = ["production", "projects", "research", "voice", "quality"]; if (!valid.includes(name)) name = "production";
    $$('[data-panel]').forEach((panel) => { const active = panel.dataset.panel === name; panel.hidden = !active; panel.classList.toggle("is-active", active); });
    $$('[data-section]').forEach((button) => { const active = button.dataset.section === name; if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current"); });
    if (updateHash) history.replaceState(null, "", `#${name}`);
    $("#studio-main").focus({ preventScroll: true });
  }

  $$('[data-section]').forEach((button) => button.addEventListener("click", () => showSection(button.dataset.section)));
  window.addEventListener("hashchange", () => showSection(location.hash.slice(1), false));
  $$('[data-refresh]').forEach((button) => button.addEventListener("click", loadDashboard));
  $('[data-jump="plan"]').addEventListener("click", () => { $("#plan").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); $('[data-plan-form] select').focus(); });

  $('[data-project-form]').addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-project-status]"); setStatus(status, ""); setBusy(form, true, "Đang tạo…");
    try { const body = Object.fromEntries(new FormData(form)); await request("/api/production/projects", { method: "POST", body: JSON.stringify(body) }); form.reset(); form.elements.market.value = "Việt Nam"; setStatus(status, "Đã tạo dự án.", "success"); announce("Đã tạo dự án"); await loadDashboard(); }
    catch (error) { setStatus(status, error.message, "error"); }
    finally { setBusy(form, false); }
  });

  $('[data-plan-form]').addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-plan-status]"); setStatus(status, ""); if (!form.reportValidity()) return; setBusy(form, true, "Đang lập plan…");
    const data = Object.fromEntries(new FormData(form)); const signature = JSON.stringify(data); if (!form.dataset.requestId || form.dataset.requestSignature !== signature) { form.dataset.requestId = crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`; form.dataset.requestSignature = signature; } const body = { requestId: form.dataset.requestId, projectId: data.projectId, targetCount: Number(data.targetCount), durationSeconds: Number(data.durationSeconds), format: data.format, conceptCount: Number(data.conceptCount), variationsPerConcept: Number(data.variationsPerConcept), renderConcurrency: Number(data.renderConcurrency), estimatedShotSeconds: Number(data.estimatedShotSeconds), expectedPassRate: Number(data.expectedPassRate), retryRate: Number(data.retryRate), windowHours: Number(data.windowHours) }; if (data.budgetUsd) body.budgetUsd = Number(data.budgetUsd);
    try { const response = await request("/api/production/plan", { method: "POST", body: JSON.stringify(body) }); const payload = await response.json(); delete form.dataset.requestId; delete form.dataset.requestSignature; const blocked = payload.batch?.status === "blocked_provider"; setStatus(status, blocked ? "Plan đã lưu; đang chờ connector." : "Capacity plan đã lưu.", "success"); announce(status.textContent); await loadDashboard(); }
    catch (error) { setStatus(status, error.message, "error"); }
    finally { setBusy(form, false); }
  });

  $('[data-research-form]').addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-research-status]"), results = $("[data-research-results]"); if (!form.reportValidity()) return; setBusy(form, true, "Jev đang research…"); setStatus(status, "");
    try { const body = Object.fromEntries(new FormData(form)); const response = await request("/api/research", { method: "POST", body: JSON.stringify(body) }); const payload = await response.json(); renderResearch(payload, results); setStatus(status, payload.status === "queued" ? "Research đã vào hàng đợi." : "Research hoàn tất.", "success"); }
    catch (error) { results.innerHTML = `<p class="empty-state"></p>`; results.firstElementChild.textContent = error.code === "jev_bridge_not_configured" ? "Jev chưa được cấu hình trên server. Không có kết quả giả được tạo." : error.message; setStatus(status, error.message, "error"); }
    finally { setBusy(form, false); }
  });

  function renderResearch(payload, root) {
    root.replaceChildren(); const evidence = Array.isArray(payload.evidence) ? payload.evidence : [], hypotheses = Array.isArray(payload.hypotheses) ? payload.hypotheses : []; $("[data-evidence-count]").textContent = `${evidence.length} nguồn`;
    if (!evidence.length) { const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = payload.status === "queued" ? "Research đang trong hàng đợi; chưa có evidence." : "Jev không trả về evidence."; root.append(empty); return; }
    const list = document.createElement("ol"); list.className = "evidence-list"; evidence.forEach((item) => { const li = document.createElement("li"); li.className = "evidence-item"; const link = document.createElement("a"); link.href = item.url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = item.title || item.url; const snippet = document.createElement("p"); snippet.textContent = item.snippet || "Không có đoạn trích."; const meta = document.createElement("small"); meta.textContent = `${item.sourceType || "source"} • truy xuất ${item.retrievedAt || payload.retrievedAt || "không rõ"}`; li.append(link, snippet, meta); list.append(li); }); root.append(list);
    if (hypotheses.length) { const block = document.createElement("section"); block.className = "hypothesis-list"; const heading = document.createElement("h3"); heading.textContent = "Hypothesis chưa kiểm chứng"; const ul = document.createElement("ul"); hypotheses.forEach((item) => { const li = document.createElement("li"); li.textContent = item.text; ul.append(li); }); block.append(heading, ul); root.append(block); }
  }

  $('[data-voice-form]').addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget, status = $("[data-voice-status]"), result = $("[data-voice-result]"); if (!form.reportValidity()) return; setBusy(form, true, "VieNeu đang tạo…"); setStatus(status, "");
    try { const body = Object.fromEntries(new FormData(form)); if (!body.voiceId) delete body.voiceId; const response = await request("/api/voice", { method: "POST", body: JSON.stringify(body) }); const blob = await response.blob(); if (!blob.type.includes("audio") || !blob.size) throw new Error("Server không trả về audio WAV hợp lệ."); if (state.audioUrl) URL.revokeObjectURL(state.audioUrl); state.audioUrl = URL.createObjectURL(blob); renderAudio(response.headers, state.audioUrl, blob.size, result); setStatus(status, "Đã nhận audio thật từ VieNeu bridge.", "success"); }
    catch (error) { result.innerHTML = '<p class="empty-state"></p>'; result.firstElementChild.textContent = error.code === "vieneu_bridge_not_configured" ? "VieNeu-TTS chưa được cấu hình trên server. Không phát audio demo." : error.message; setStatus(status, error.message, "error"); }
    finally { setBusy(form, false); }
  });

  function decodeHeader(value) { try { return decodeURIComponent(value); } catch { return value; } }
  function renderAudio(headers, url, bytes, root) {
    root.replaceChildren(); const card = document.createElement("div"); card.className = "audio-card"; const title = document.createElement("strong"); title.textContent = "VieNeu WAV"; const dl = document.createElement("dl"); [["Voice", decodeHeader(headers.get("X-Voice-Id") || "server default")], ["Model revision", headers.get("X-Model-Revision") || "không công bố"], ["Script hash", headers.get("X-Script-Hash") || "không công bố"], ["Dung lượng", `${Math.round(bytes / 1024)} KB`]].forEach(([term, value]) => { const row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = term; dd.textContent = value; row.append(dt, dd); dl.append(row); }); const audio = document.createElement("audio"); audio.controls = true; audio.preload = "metadata"; audio.src = url; card.append(title, dl, audio); root.append(card);
  }

  $("[data-quality-batch]").addEventListener("change", async (event) => {
    const root = $("[data-quality-assets]"); if (!event.target.value) { root.innerHTML = '<p class="empty-state">Chọn batch để tải trạng thái asset từ API.</p>'; return; } root.innerHTML = '<p class="empty-state">Đang tải trạng thái asset…</p>';
    try { const response = await request(`/api/production/batches/${encodeURIComponent(event.target.value)}`); const payload = await response.json(); renderAssets(payload.assets || [], root); }
    catch (error) { root.innerHTML = '<p class="empty-state"></p>'; root.firstElementChild.textContent = error.message; }
  });

  function renderAssets(assets, root) {
    root.replaceChildren(); if (!assets.length) { root.innerHTML = '<p class="empty-state">Batch chưa có asset.</p>'; return; } const grid = document.createElement("div"); grid.className = "asset-grid";
    assets.slice(0, 24).forEach((asset) => { const card = document.createElement("article"); card.className = "asset-card"; const title = document.createElement("h3"); title.textContent = `Asset ${String(asset.ordinal).padStart(3, "0")}`; const stateLine = document.createElement("span"); stateLine.textContent = `${asset.status} • QA ${asset.qualityStatus}`; const list = document.createElement("ul"); list.className = "gate-list"; Object.entries(asset.qualityGates || {}).forEach(([name, value]) => { const li = document.createElement("li"), label = document.createElement("span"), result = document.createElement("b"); const gateStatus = typeof value === "string" ? value : value?.status; const pass = value === true || gateStatus === "pass" || gateStatus === "approved"; label.textContent = name; result.textContent = pass ? "Đạt" : (gateStatus || "Chưa kiểm"); result.dataset.pass = String(pass); li.append(label, result); list.append(li); }); card.append(title, stateLine, list); grid.append(card); }); root.append(grid);
  }

  window.addEventListener("pagehide", () => { if (state.audioUrl) URL.revokeObjectURL(state.audioUrl); }, { once: true });
  showSection(location.hash.slice(1) || "production", false); loadDashboard();
})();
