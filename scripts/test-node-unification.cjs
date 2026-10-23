"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const html = read("prototype-v2/workflow.html");
const canvas = read("prototype-v2/workflow-canvas.js");
const canvasCss = read("prototype-v2/workflow-canvas.css");
const workflow = read("prototype-v2/workflow.js");
const shell = read("prototype-v2/shared-shell.js");
const redirect = read("prototype-v2/legacy-redirect.js");
const vm = require("node:vm");

for (const nodeId of ["project", "source", "analyze", "research", "hooks", "prompt", "image", "video", "voice", "production", "quality", "test"]) {
  assert.match(canvas, new RegExp(`id: "${nodeId}"`), `unified canvas must expose ${nodeId} node`);
}
for (const focus of ["project", "insight", "hooks", "remix", "video", "production", "research", "voice", "quality"]) {
  assert.match(shell, new RegExp(`/workflow\\?focus=${focus}`), `shared navigation must route ${focus} into workflow`);
}
assert.doesNotMatch(shell, /href\s*=\s*["']\/(?:studio|\?tab=)/u, "shared navigation must not retain legacy page links");
assert.match(html, /data-wc-node-dialog[^>]+role="dialog"[^>]+aria-modal="true"/, "node operations must use a focused dialog");
assert.match(canvas, /const DETAIL_MAP = \{/, "selected nodes must map to bounded operation panels");
assert.match(canvas, /panels\.forEach\(\(panel\) => \{ panel\.hidden = !selectors/, "opening a node must hide unrelated legacy panels");
assert.match(canvasCss, /\.workflow-panel\[hidden\][^{]*\{ display:none!important; \}/, "hidden node panels must stay hidden");
assert.match(html, /<details class="wc-advanced">[\s\S]*Cache research\/strategy/, "cache and retry controls must be collapsed under Advanced");
assert.match(html, /Provider cache ≠ D1 result cache/, "prompt cache and result cache must be distinguished");
assert.match(canvas, /cacheUsage\.status === "hit" \|\| \(Number\.isFinite\(cachedTokens\) && cachedTokens > 0\)/, "provider cache hit must require evidence");
assert.match(html, /data-wc-model-search/, "media model catalog must be searchable");
assert.match(canvas, /\/api\/media\/catalog\?provider=/, "model selector must use media catalog API");
assert.match(canvas, /fetch\("\/api\/media\/settings", \{ method: "POST"/, "node media selection must persist server-side");
assert.match(canvas, /saveNodeMediaSettings[\s\S]*await readJson[\s\S]*state\.projectId !== projectId[\s\S]*workflow:provider-configuration-changed[\s\S]*catch \(error\)/, "only a successful same-project node media save may dispatch the readiness refresh event");
assert.match(workflow, /workflow:provider-configuration-changed[\s\S]*!projectId \|\| projectId !== state\.projectId\) return;[\s\S]*state\.autopilotPlan = null[\s\S]*loadAutopilotReadiness\(true\)/, "media configuration listener must ignore missing or foreign project events before invalidating Autopilot");
assert.match(canvas, /source === "live" \? "live từ provider" : state\.mediaCatalog\.source === "curated_fallback"/, "catalog source must label live and fallback distinctly");
assert.match(canvas, /adapterImplemented/, "catalog models must distinguish visible provider entries from implemented product-reference adapters");
assert.match(canvas, /media_provider_not_configured/, "missing provider keys must be labelled separately from an empty catalog");
assert.match(canvas, /totalDuration: config\.duration/, "long video planning must persist total duration separately from a 15-second provider segment");
assert.match(html, /data-media-budget-form[\s\S]*value="0"[\s\S]*data-media-quote/, "media spend must start at zero and require a visible quote step");
assert.match(workflow, /fetch|request/, "workflow must use authenticated server requests");
assert.match(workflow, /"\/api\/media\/quotes"[\s\S]*data-media-confirm/, "media generation must quote before the separate confirmation click");
assert.match(workflow, /confirmationId: quote\.confirmationId/, "job submit must echo the displayed quote confirmation ID");
assert.match(workflow, /mediaExecutionEnabled[\s\S]*Server đang khóa submit trả phí/, "flag-off state must remain visible and block paid submit");
assert.match(workflow, /media_poll_retryable[\s\S]*không submit lại/, "poll retry must never replay a paid submit");
assert.match(html, /name="totalUsd"[^>]+max="2"[\s\S]*name="maxPerJobUsd"[^>]+max="2"/, "media budget fields must stay within the owner cap");
assert.match(html, /Video 30\/45\/60 giây là kế hoạch nhiều đoạn[\s\S]*một đoạn 15 giây/, "long-form media UI must disclose single-segment execution");
assert.match(workflow, /Quote này chỉ dành cho một đoạn[\s\S]*chưa báo giá toàn bộ video dài/, "long-form quote must not imply a completed 45/60-second render");
for (const gate of ["productFidelity", "claims", "voicePronunciation", "audio", "continuity", "format", "novelty", "humanApproval"]) {
  assert.match(canvas, new RegExp(gate), `quality UI must include backend gate ${gate}`);
}
assert.match(canvas, /thiếu evidence ref/, "raw pass/approval must be visibly unqualified without an evidence reference");
assert.match(canvas, /reviewerType === "human"/, "human approval must require a human reviewer");
assert.doesNotMatch(canvas, /\["pass",\s*"approved"\][\s\S]{0,160}\?\s*"Đạt"/, "UI must not certify a raw self-scored status as passed");
assert.match(redirect, /location\.replace/, "legacy shell must redirect without adding browser history");
assert.match(redirect, /const map = \{[\s\S]*voice: "voice"[\s\S]*quality: "quality"/, "legacy hashes must map to nodes");
assert.doesNotMatch(redirect, /eval\(|innerHTML|document\.write/u, "legacy redirect must stay data-only");
const canvasContext = { globalThis: {} };
vm.runInNewContext(canvas, canvasContext);
const migrated = canvasContext.globalThis.WorkflowCanvasCore.upgradeStoredState({ version: 1, mode: "overview", selectedId: "video", positions: { overview: { video: { x: 501, y: 209 } }, video: {} }, views: { overview: { x: 9, y: 8, zoom: .71 }, video: { x: 1, y: 2, zoom: .82 } }, image: { provider: "openrouter", modelId: "google/gemini-nano-banana-2.1" }, video: { provider: "fal", modelId: "bytedance/seedance-2.5/image-to-video", ratio: "9:16", duration: 45 }, notes: [{ id: "note-1", title: "Giữ hook", mode: "overview", x: 1, y: 2 }] });
assert.equal(migrated.version, 2, "v1 canvas storage must upgrade instead of resetting");
assert.equal(migrated.positions.overview.video.x, 501, "migration must preserve node positions");
assert.equal(migrated.image.modelId, "google/gemini-nano-banana-2.1", "migration must preserve provider/model choices");
assert.equal(migrated.notes[0].title, "Giữ hook", "migration must preserve notes");
assert.match(canvas, /đoạn planning · chưa tự render/, "45/60-second layouts must be labelled planning, not an automatic render claim");
assert.match(html, /data-wc-mode="autopilot"/, "simple autopilot must be the default workflow mode");
assert.match(html, /data-wc-mode-button="autopilot"[\s\S]*data-wc-mode-button="canvas"/, "canvas must remain an explicit advanced-mode choice");
assert.match(html, /data-autopilot-form[\s\S]*value="image"[\s\S]*1 ảnh[\s\S]*value="video"[\s\S]*1 video 15 giây/, "autopilot v1 must offer exactly one image or one 15-second video segment");
assert.match(html, /data-auto-confirm[\s\S]*Model tạo creative[\s\S]*Trần tổng[\s\S]*Bộ ảnh đã khóa/, "paid autopilot start must show a concrete confirmation screen");
assert.match(workflow, /changesGlobalProjectBudget[\s\S]*lượt tạo thủ công sau đó/, "confirmation must disclose a persistent project media budget increase");
assert.match(html, /Giới hạn của ứng dụng không đảm bảo provider sẽ dừng tính phí đúng tại con số này/, "autopilot must disclose the provider hard-cap boundary in plain language");
assert.match(html, /data-auto-source-action/, "default autopilot view must expose project and source setup without entering canvas");
assert.match(canvas, /workflow:open-source-manager[\s\S]*openDetailsForSelection/, "autopilot source action must open the real project/source form");
assert.match(workflow, /workflow:open-media-setup[\s\S]*mediaType: output\.mediaType/, "missing model CTA must target the selected output type");
assert.match(canvas, /workflow:open-media-setup[\s\S]*setWorkspaceMode\("canvas"\)[\s\S]*data-wc-tab="params"/, "missing model CTA must open the exact image/video node model selector");
for (const label of ["openrouter_key_missing: \"OpenRouter\"", "fal_key_missing: \"fal.ai\"", "replicate_key_missing: \"Replicate\""]) assert.match(workflow, new RegExp(label), `autopilot key label must map ${label}`);
assert.match(workflow, /scheduler_not_ready: "Bộ chạy nền đang khởi động; thử lại sau ít phút"/, "scheduler blocker must use actionable Vietnamese copy");
assert.match(workflow, /autoSetupAction = missingKeys\.length \? "credentials" : needsMediaSetup \? "media" : "refresh"/, "blocker action must route key, model and retry conditions separately");
assert.match(workflow, /\/api\/autopilot\/readiness\?\$\{query\}/, "autopilot must load server readiness with the selected output instead of simulating it");
assert.match(workflow, /"\/api\/autopilot\/plan"[\s\S]*segmentSeconds: 15/, "autopilot plan must be server-bound and cap video at one segment");
assert.match(workflow, /creativePriority: data\.creativePriority/, "autopilot creative priority must use the canonical backend field");
assert.doesNotMatch(workflow, /plan\.confirmationId !== plan\.id/, "autopilot confirmation ID is a separate server token, not the plan ID");
assert.match(workflow, /"\/api\/autopilot\/start"[\s\S]*confirmationId: plan\.confirmationId[\s\S]*idempotencyKey/, "autopilot paid start must require explicit confirmation and idempotency");
assert.match(workflow, /\/api\/autopilot\/runs\/\$\{encodeURIComponent\(runId\)\}/, "autopilot progress must reload the durable server run");
assert.match(workflow, /readiness\.activeRun[\s\S]*active\.confirmationId[\s\S]*loadAutopilotRun\(runId\)/, "autopilot must restore an active server run across browsers");
assert.match(workflow, /sameAutopilotScope\(\{ projectId, epoch, runId \}[\s\S]*renderAutopilotRun\(payload\.run\)/, "late run responses must be scope-guarded before rendering");
assert.match(workflow, /\/api\/autopilot\/runs\/\$\{encodeURIComponent\(run\.id\)\}\/cancel/, "autopilot must cancel future steps through the server contract");
assert.doesNotMatch(canvas, /state\.mode === "video" \|\| node\?\.kind === "video"/, "non-media video-flow nodes must not leak video model controls");
assert.doesNotMatch(workflow, /100 (?:video|videos) (?:đã |hoàn )/i, "autopilot must not claim unverified 100-video completion");

console.log("node-first navigation, focused controls and cache clarity: ok");
