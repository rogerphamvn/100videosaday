(() => {
  "use strict";
  const root = document.documentElement;
  const shell = document.querySelector("[data-testid='workspace-shell']");
  const hookButtons = [...document.querySelectorAll("[data-hook-id]")];
  const batch = document.querySelector("[data-testid='batch-preview']");
  const studio = document.querySelector("[data-testid='video-studio']");
  const standardWorkspace = document.querySelector(".workspace-grid");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const feedbackPrefix = "creative-hook-lab:demo-feedback:";
  let userMotionEnabled = true, batchOpener = null, activeProject = "oil", activeHook = "hook-01", activeRating = "", activeShots = [], activeShotId = "shot-01";

  const projects = {
    oil: {
      icon: "O", visualLabel: "Minh họa hình học của bình xịt dầu demo không thương hiệu", sourceTitle: "Bình xịt dầu trung tính", sourceCopy: "Minh họa hình học, không đại diện SKU hoặc claim sản phẩm thật.", motivator: "“Chuẩn bị mặt chảo với thao tác dễ kiểm soát hơn rót trực tiếp.”", usecase: "Chảo nguội, rỗng trước khi nấu", friction: "Khó chủ động khi rót trực tiếp", alternative: "Rót dầu từ chai",
      hooks: {
        "hook-01": { title: "Dừng trước khi rót", card: "Đối chiếu rót trực tiếp với thao tác xịt dự kiến trên chảo nguội.", need: "Chuẩn bị chảo trước khi nấu với thao tác dễ chủ động.", move: "Đặt động tác rót và xịt cạnh nhau trên cùng bề mặt chảo nguội.", proof: "Kỳ vọng cần kiểm chứng: khán giả hiểu khác biệt thao tác; tia xịt phải xuất phát đúng nozzle và tuân thủ vật lý.", taste: "Sáng tự nhiên, editorial utility, bề mặt prep thật; chỉ một hành động hero.", batch: "Hook 01 • Dừng trước khi rót" },
        "hook-02": { title: "Chuẩn bị mặt chảo", card: "Một thao tác trên chảo nguội, rỗng trước khi thêm nguyên liệu.", need: "Hoàn tất bước thêm dầu trước khi nguyên liệu vào chảo.", move: "Một shot rộng đặt bình, chảo nguội và thao tác bóp trong cùng không gian prep.", proof: "Kỳ vọng cần kiểm chứng: trình tự sử dụng được hiểu đúng; không dựng lợi ích hoặc hiệu suất chưa được xác nhận.", taste: "Lo-fi có chủ đích, ánh sáng bếp dịu, chuyển focus êm trong tám giây.", batch: "Hook 02 • Chuẩn bị mặt chảo" },
        "hook-03": { title: "Một lần bóp, quan sát vùng phủ", card: "Macro đầu phun rồi reveal bề mặt chảo; kết quả cần test.", need: "Nhìn rõ thao tác trước khi đánh giá thông điệp creative.", move: "Macro nozzle và ngón tay, sau đó reveal bề mặt chảo nguội, rỗng.", proof: "Kỳ vọng cần kiểm chứng: chuyển động trigger, tia xịt và camera liên tục; hình dáng sản phẩm không đổi.", taste: "Macro tactile, tương phản dịu, không slow motion phô trương hoặc flare giả.", batch: "Hook 03 • Quan sát vùng phủ" }
      }
    },
    tumbler: {
      icon: "T", visualLabel: "Minh họa hình học của bình giữ nhiệt demo không thương hiệu", sourceTitle: "Bình giữ nhiệt trung tính", sourceCopy: "Demo hình học không thương hiệu; dung tích và hiệu suất chưa được xác nhận.", motivator: "“Mang một đồ uống quen thuộc qua nhiều điểm dừng trong ngày.”", usecase: "Di chuyển giữa bàn làm việc và phòng họp", friction: "Phải cầm thêm cốc mở", alternative: "Dùng cốc tại từng địa điểm",
      hooks: {
        "hook-01": { title: "Một ngày, nhiều điểm dừng", card: "Theo dấu cùng một vật thể qua ba bối cảnh, không tuyên bố thời gian giữ nhiệt.", need: "Giữ nghi thức đồ uống nhất quán khi di chuyển.", move: "Match-cut vị trí bình giữa bàn, hành lang và phòng họp.", proof: "Kỳ vọng cần kiểm chứng: người xem nhận ra use case di chuyển; không ngụ ý chống rò hoặc giữ nhiệt nếu thiếu source.", taste: "Editorial commute, ánh sáng tự nhiên thay đổi nhẹ, product silhouette liên tục.", batch: "Hook 01 • Nhiều điểm dừng" },
        "hook-02": { title: "Khoảnh khắc đặt xuống", card: "Mở bằng âm thanh đặt bình rồi reveal bối cảnh làm việc.", need: "Có một vật dụng cá nhân dễ nhận diện trong nhịp làm việc.", move: "Close-up đáy bình chạm bàn, cut rộng có chủ đích.", proof: "Kỳ vọng cần kiểm chứng: âm thanh phải có nguồn nhìn thấy; không thêm claim vật liệu hoặc độ bền.", taste: "Âm thanh diegetic, khung hình tĩnh, chất liệu bề mặt thật.", batch: "Hook 02 • Khoảnh khắc đặt xuống" },
        "hook-03": { title: "Chọn màu theo nhịp ngày", card: "Dùng phối màu như creative hypothesis, không gọi là cá nhân hóa thật.", need: "Biểu đạt sở thích qua vật dụng dùng hằng ngày.", move: "Ba background thời điểm, cùng geometry lock và một bình demo.", proof: "Kỳ vọng cần kiểm chứng: màu hỗ trợ nhận diện; không biến thành nhiều SKU không có source.", taste: "Color-block tiết chế, bóng đổ mềm, typography tối thiểu.", batch: "Hook 03 • Nhịp màu trong ngày" }
      }
    }
  };

  const workspaces = {
    insight: { eyebrow: "Từ source đến lý do cần", title: "Insight", description: "Đọc product lock, use case và motivator trước khi chọn cách diễn đạt.", canvas: "Nguồn sản phẩm và logic motivator", hint: "Các hook vẫn hiển thị để kiểm tra mỗi nhánh có bám đúng insight hay không." },
    creative: { eyebrow: "Thiết kế nhánh thử nghiệm", title: "Creative Lab", description: "Chọn một hook để xem logic, taste và asset dự kiến trước khi chuẩn bị batch.", canvas: "Từ nguồn thật đến ba hướng creative", hint: "Ba nhánh cùng một motivator để dễ đọc kết quả test." },
    remix: { eyebrow: "Nhánh hóa có kiểm soát", title: "Remix", description: "Giữ product, motivator và claim; chỉ thay cách mở hoặc format của hook đã chọn.", canvas: "Parent logic và ba nhánh remix an toàn", hint: "Prototype chỉ chuẩn bị branch preview; chưa có winner hoặc dữ liệu performance thật." },
    video: { eyebrow: "Shot assembly planner", title: "Video Studio", description: "Ghép kế hoạch 45/60 giây từ các shot ngắn theo frame và transition; không render media.", canvas: "Video Studio demo", hint: "" }
  };

  const feedbackKey = () => `${feedbackPrefix}${activeProject}:${activeHook}`;
  const safeRead = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

  function loadFeedback() {
    const saved = safeRead(feedbackKey());
    activeRating = saved?.rating || "";
    document.querySelectorAll("[data-feedback]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.feedback === activeRating)));
    document.querySelector("[data-testid='taste-note']").value = saved?.note || "";
    document.querySelector("[data-feedback-version]").textContent = saved ? `Local v${saved.version}` : "Chưa lưu";
  }

  function selectHook(id, focus = false) {
    const detail = projects[activeProject].hooks[id];
    if (!detail) return;
    activeHook = id;
    hookButtons.forEach((button) => { const selected = button.dataset.hookId === id; button.classList.toggle("is-selected", selected); button.setAttribute("aria-pressed", String(selected)); if (selected && focus) button.focus(); });
    document.querySelector("[data-testid='hook-inspector']").dataset.state = id;
    document.querySelector("[data-detail-title]").textContent = detail.title;
    document.querySelector("[data-detail-need]").textContent = detail.need;
    document.querySelector("[data-detail-move]").textContent = detail.move;
    document.querySelector("[data-detail-proof]").textContent = detail.proof;
    document.querySelector("[data-detail-taste]").textContent = detail.taste;
    document.querySelector("[data-batch-title]").textContent = detail.batch;
    document.querySelector("[data-canvas-state]").textContent = `Đang xem: ${id.replace("hook-", "Hook ")}`;
    shell.dataset.state = id;
    loadFeedback();
  }

  function renderProject(id) {
    const project = projects[id]; if (!project) return;
    activeProject = id; shell.dataset.project = id;
    document.querySelector("[data-source-title]").textContent = project.sourceTitle;
    document.querySelector("[data-source-copy]").textContent = project.sourceCopy;
    document.querySelector("[data-product-visual]").setAttribute("aria-label", project.visualLabel);
    document.querySelector("[data-product-svg-title]").textContent = project.visualLabel;
    document.querySelector("[data-motivator]").textContent = project.motivator;
    document.querySelector("[data-usecase]").textContent = project.usecase;
    document.querySelector("[data-friction]").textContent = project.friction;
    document.querySelector("[data-alternative]").textContent = project.alternative;
    hookButtons.forEach((button) => { const hook = project.hooks[button.dataset.hookId]; button.querySelector("[data-hook-title]").textContent = hook.title; button.querySelector("[data-hook-copy]").textContent = hook.card; });
    selectHook("hook-01"); buildScenePlan();
  }

  function selectWorkspace(id) {
    const config = workspaces[id]; if (!config) return;
    shell.dataset.workspace = id;
    document.querySelector("[data-workspace-eyebrow]").textContent = config.eyebrow;
    document.querySelector("[data-workspace-title]").textContent = config.title;
    document.querySelector("[data-workspace-description]").textContent = config.description;
    document.querySelector("[data-canvas-title]").textContent = config.canvas;
    document.querySelector("[data-workspace-hint]").textContent = config.hint;
    standardWorkspace.hidden = id === "video"; studio.hidden = id !== "video"; document.querySelector(".view-switch").hidden = id === "video";
    document.querySelectorAll("[data-workspace-tab]").forEach((button) => { const active = button.dataset.workspaceTab === id; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); });
  }

  function setView(mode) { shell.dataset.view = mode; document.querySelectorAll("[data-view-mode]").forEach((button) => { const active = button.dataset.viewMode === mode; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); }); }
  const effectiveMotion = () => userMotionEnabled && !motionQuery.matches;
  function applyMotion() { const enabled = effectiveMotion(); root.dataset.motion = enabled ? "on" : "off"; const toggle = document.querySelector("[data-testid='motion-toggle']"); toggle.setAttribute("aria-pressed", String(enabled)); document.querySelector("[data-motion-label]").textContent = motionQuery.matches && userMotionEnabled ? "Motion: Tắt (OS)" : `Motion: ${enabled ? "Bật" : "Tắt"}`; }
  function setMotion(enabled) { userMotionEnabled = enabled; applyMotion(); }
  function updateBatchDescription() { const selected = [...document.querySelectorAll("input[name='asset']:checked")].map((input) => input.value === "image" ? "ảnh" : "video"); const count = document.querySelector("[data-testid='batch-count']").value; document.querySelector("[data-batch-description]").textContent = `${count} biến thể ${selected.length ? selected.join(" + ") : "chưa chọn asset"} dự kiến từ source demo. Chưa có provider, quote hoặc API job.`; }
  function timecode(seconds) { const minutes = Math.floor(seconds / 60); const remaining = (seconds % 60).toFixed(1).padStart(4, "0"); return `${String(minutes).padStart(2, "0")}:${remaining}`; }

  function buildScenePlan() {
    const target = Number(document.querySelector("[data-video-duration]").value); let count = Number(document.querySelector("[data-shot-count]").value);
    if (target === 60 && count === 4) { count = 5; document.querySelector("[data-shot-count]").value = "5"; }
    const transitionFrames = 15, overlapSeconds = transitionFrames / 30;
    let frameDurations;
    if (target === 60 && count === 5) frameDurations = [372, 372, 372, 372, 372];
    else if (target === 45 && count === 4) frameDurations = [360, 360, 360, 315];
    else { const totalFrames = target * 30 + transitionFrames * (count - 1); const base = Math.floor(totalFrames / count); frameDurations = Array(count).fill(base); frameDurations[count - 1] += totalFrames - base * count; }
    const purposes = ["Hook setup", "Use-case context", "Mechanism detail", "Proof expectation", "End frame & next step"];
    let cursor = 0;
    activeShots = frameDurations.map((frames, index) => { const start = cursor, duration = frames / 30, end = start + duration; cursor = end - (index < frameDurations.length - 1 ? overlapSeconds : 0); return { id: `shot-${String(index + 1).padStart(2, "0")}`, title: purposes[index], frames, duration, start, end, transition: index === 0 ? "Start" : "Crossfade 0.5s • 15f", purpose: index === 0 ? "Mở vấn đề và đặt source product trong bối cảnh." : `Shot demo ${index + 1}: một vai trò rõ trong mạch ${target}s.` }; });
    activeShotId = activeShots[0].id; renderTimeline();
    document.querySelector("[data-duration-total]").textContent = `Tổng: ${cursor.toFixed(1)} giây`;
    document.querySelector("[data-duration-status]").textContent = `Khớp ${target}s • ${count} shot • overlap ${overlapSeconds.toFixed(1)}s`;
  }

  function renderTimeline() {
    const timeline = document.querySelector("[data-testid='video-timeline']"); timeline.innerHTML = "";
    activeShots.forEach((shot, index) => { const button = document.createElement("button"); button.type = "button"; button.className = `shot-block${shot.id === activeShotId ? " is-selected" : ""}`; button.dataset.shotId = shot.id; button.style.setProperty("--grow", String(shot.duration)); button.innerHTML = `<span class="shot-number">Shot ${String(index + 1).padStart(2, "0")}</span><strong>${shot.title}</strong><small>Trim ${shot.duration.toFixed(1)}s • ${shot.frames}f<br>Source planned 15s • media chưa có</small><span class="transition-chip">${shot.transition}</span>`; button.addEventListener("click", () => selectShot(shot.id)); timeline.appendChild(button); });
    selectShot(activeShotId);
  }

  function selectShot(id) {
    const shot = activeShots.find((item) => item.id === id); if (!shot) return; activeShotId = id;
    document.querySelectorAll("[data-shot-id]").forEach((button) => button.classList.toggle("is-selected", button.dataset.shotId === id));
    const index = activeShots.indexOf(shot);
    document.querySelector("[data-shot-title]").textContent = `${String(index + 1).padStart(2, "0")} • ${shot.title}`;
    document.querySelector("[data-shot-time]").textContent = `${timecode(shot.start)}–${timecode(shot.end)}`;
    document.querySelector("[data-shot-transition]").textContent = shot.transition;
    document.querySelector("[data-shot-purpose]").textContent = shot.purpose;
    document.querySelector("[data-shot-formula]").textContent = `Source planned 15.0s (media chưa có) → trim ${shot.frames}f ÷ 30fps = ${shot.duration.toFixed(1)}s; transition ${index ? "15f overlap" : "start, không overlap"}.`;
  }

  function moveShot(delta) {
    const index = activeShots.findIndex((shot) => shot.id === activeShotId), target = index + delta; if (index < 0 || target < 0 || target >= activeShots.length) return;
    [activeShots[index], activeShots[target]] = [activeShots[target], activeShots[index]];
    let cursor = 0; activeShots.forEach((shot, i) => { shot.transition = i === 0 ? "Start" : "Crossfade 0.5s • 15f"; shot.start = cursor; shot.end = cursor + shot.duration; cursor = shot.end - (i < activeShots.length - 1 ? .5 : 0); }); renderTimeline();
  }

  document.querySelectorAll("[data-workspace-tab]").forEach((button) => button.addEventListener("click", () => { const id = button.dataset.workspaceTab; selectWorkspace(id); const url = new URL(window.location.href); url.searchParams.set("tab", id); history.replaceState(null, "", url); }));
  document.querySelectorAll("[data-view-mode]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewMode)));
  hookButtons.forEach((button, index) => { button.addEventListener("click", () => selectHook(button.dataset.hookId)); button.addEventListener("keydown", (event) => { if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1; selectHook(hookButtons[(index + delta + hookButtons.length) % hookButtons.length].dataset.hookId, true); }); });
  document.querySelector("[data-testid='project-switcher']").addEventListener("change", (event) => renderProject(event.target.value));
  document.querySelector("[data-testid='motion-toggle']").addEventListener("click", () => setMotion(!userMotionEnabled));
  const onMotionPreferenceChange = () => applyMotion();
  if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionPreferenceChange); else if (motionQuery.addListener) motionQuery.addListener(onMotionPreferenceChange);
  window.addEventListener("pagehide", () => { if (motionQuery.removeEventListener) motionQuery.removeEventListener("change", onMotionPreferenceChange); else if (motionQuery.removeListener) motionQuery.removeListener(onMotionPreferenceChange); }, { once: true });
  document.querySelectorAll("[data-feedback]").forEach((button) => button.addEventListener("click", () => { activeRating = button.dataset.feedback; document.querySelectorAll("[data-feedback]").forEach((item) => item.setAttribute("aria-pressed", String(item.dataset.feedback === activeRating))); }));
  document.querySelector("[data-testid='save-feedback']").addEventListener("click", () => { const note = document.querySelector("[data-testid='taste-note']").value.trim(), previous = safeRead(feedbackKey()); if (!activeRating || !note) { document.querySelector("[data-feedback-version]").textContent = "Cần vote + lý do"; return; } const saved = { version: (previous?.version || 0) + 1, rating: activeRating, note, project: activeProject, hook: activeHook, evidenceType: "user_demo_feedback", savedAt: new Date().toISOString() }; document.querySelector("[data-feedback-version]").textContent = safeWrite(feedbackKey(), saved) ? `Local v${saved.version}` : "Không thể lưu"; });
  document.querySelector("[data-testid='reset-feedback']").addEventListener("click", () => { try { Object.keys(localStorage).filter((key) => key.startsWith(`${feedbackPrefix}${activeProject}:`)).forEach((key) => localStorage.removeItem(key)); } catch {} activeRating = ""; loadFeedback(); });
  document.querySelector("[data-testid='prepare-batch']").addEventListener("click", (event) => { batchOpener = event.currentTarget; batch.dataset.context = "creative"; updateBatchDescription(); batch.hidden = false; batch.scrollIntoView({ behavior: effectiveMotion() ? "smooth" : "auto", block: "nearest" }); document.querySelector("[data-testid='close-batch']").focus(); });
  document.querySelector("[data-testid='prepare-video-batch']").addEventListener("click", (event) => { batchOpener = event.currentTarget; batch.dataset.context = "video"; document.querySelector("[data-batch-title]").textContent = `Video plan • ${document.querySelector("[data-video-duration]").value}s • ${document.querySelector("[data-video-ratio]").value}`; document.querySelector("[data-batch-description]").textContent = `${activeShots.length} shot plan cục bộ. 0 render, 0 provider job, 0 video asset.`; batch.hidden = false; batch.scrollIntoView({ behavior: effectiveMotion() ? "smooth" : "auto", block: "nearest" }); document.querySelector("[data-testid='close-batch']").focus(); });
  document.querySelector("[data-testid='close-batch']").addEventListener("click", () => { batch.hidden = true; batchOpener?.focus(); batchOpener = null; }); document.querySelector("[data-testid='build-scene-plan']").addEventListener("click", buildScenePlan);
  document.querySelector("[data-video-duration]").addEventListener("change", (event) => { document.querySelector("[data-shot-count]").value = event.target.value === "60" ? "5" : "4"; buildScenePlan(); }); document.querySelector("[data-shot-count]").addEventListener("change", buildScenePlan);
  document.querySelectorAll("[data-studio-mode]").forEach((button) => button.addEventListener("click", () => { document.querySelector("[data-testid='video-timeline']").dataset.mode = button.dataset.studioMode; document.querySelectorAll("[data-studio-mode]").forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-pressed", String(active)); }); }));
  document.querySelectorAll("[data-move-shot]").forEach((button) => button.addEventListener("click", () => moveShot(button.dataset.moveShot === "up" ? -1 : 1)));
  document.querySelectorAll("input[name='asset'], [data-testid='batch-count']").forEach((control) => control.addEventListener("change", updateBatchDescription));
  document.querySelector("[data-testid='reset-button']").addEventListener("click", () => { userMotionEnabled = true; renderProject("oil"); document.querySelector("[data-testid='project-switcher']").value = "oil"; selectWorkspace("creative"); setView(window.matchMedia("(max-width: 640px)").matches ? "list" : "canvas"); applyMotion(); batch.hidden = true; batchOpener = null; });

  const initialWorkspace = new URLSearchParams(window.location.search).get("tab");
  batch.hidden = true; renderProject("oil"); selectWorkspace(workspaces[initialWorkspace] ? initialWorkspace : "creative"); setView(window.matchMedia("(max-width: 640px)").matches ? "list" : "canvas"); applyMotion(); updateBatchDescription();
})();
