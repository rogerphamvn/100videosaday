"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../prototype-v2/workflow-canvas.js");
const { parseCommand, normalize, durationSegmentCount, videoEdgeList } = globalThis.WorkflowCanvasCore;

assert.equal(normalize("Đổi Provider SANG FAL.AI"), "doi provider sang fal.ai", "Vietnamese đ must normalize for bounded command matching");

assert.deepEqual(parseCommand("đổi provider sang fal.ai").action, { type: "SET_PROVIDER", value: "fal" });
assert.deepEqual(parseCommand("provider openrouter").action, { type: "SET_PROVIDER", value: "openrouter" });
assert.deepEqual(parseCommand("chọn provider replicate").action, { type: "SET_PROVIDER", value: "replicate" });
assert.deepEqual(parseCommand("video60giây").action, { type: "OPEN_VIDEO_DURATION", value: 60 });
assert.deepEqual(parseCommand("thời lượng 15 giây").action, { type: "SET_DURATION", value: 15 });
assert.deepEqual(parseCommand("tỷ lệ 9:16").action, { type: "SET_RATIO", value: "9:16" });
assert.deepEqual(parseCommand("model fal-ai/bytedance/seedance/v1.5/pro/text-to-video").action, { type: "SET_MODEL", value: "fal-ai/bytedance/seedance/v1.5/pro/text-to-video" });
assert.deepEqual(parseCommand("di chuyển Tạo video 640 320").action, { type: "MOVE_BY_NAME", value: "Tạo video", x: 640, y: 320 });
assert.equal(parseCommand("tự nghĩ một quảng cáo hay nhất").ok, false, "unsupported natural language must fail closed");
assert.equal(parseCommand("provider random-provider").ok, false, "unapproved provider must fail closed");
assert.equal(parseCommand("thời lượng 90 giây").ok, false, "unapproved duration must fail closed");

for (const [duration, count] of [[15, 1], [30, 2], [45, 3], [60, 4]]) {
  assert.equal(durationSegmentCount(duration), count);
  const edges = videoEdgeList(duration);
  assert.equal(edges.some(([from, to]) => from === `segment-${count}` && to === "motion"), true, `${duration}s must connect its last segment to motion`);
  assert.equal(edges.some(([from, to]) => from === `segment-${count + 1}` || to === `segment-${count + 1}`), false, `${duration}s must not include an extra segment`);
}
assert.deepEqual(videoEdgeList(90), [], "unsupported duration must not create a graph");

const repoRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(repoRoot, "prototype-v2", "workflow.html"), "utf8");
const source = fs.readFileSync(path.join(repoRoot, "prototype-v2", "workflow-canvas.js"), "utf8");
const canvasCss = fs.readFileSync(path.join(repoRoot, "prototype-v2", "workflow-canvas.css"), "utf8");
const workflowSource = fs.readFileSync(path.join(repoRoot, "prototype-v2", "workflow.js"), "utf8");
assert.match(html, /data-wc-legacy[^>]+role="dialog"[^>]+aria-modal="true"/, "legacy detail drawer must expose modal dialog semantics");
assert.match(html, /workflow-canvas\.css/);
assert.match(html, /workflow-canvas\.js/);
for (const fabricatedHook of ["Bếp gọn hơn", "Dễ kiểm soát dầu", "Nấu nhanh mỗi ngày"]) assert.equal(source.includes(fabricatedHook), false, `canvas must not fabricate ${fabricatedHook}`);
assert.match(source, /creditsMode \? "Credit cap đạt · BYOK kiểm tra khi chạy"/, "canvas must label credits-only readiness as conditional at execution time");
assert.match(workflowSource, /state\.pilotKeyReady = openrouterVerified && budgetReady/, "Run readiness must use the backend-selected billing mode guard");
assert.match(workflowSource, /is_byok=false/, "credits-only copy must state the per-response BYOK enforcement");
assert.match(workflowSource, /BYOK phải được xác minh trên từng response/, "credits-only copy must describe a future per-response condition, not a completed verification");
assert.match(source, /function openDetailsForSelection\(\) \{\s*if \(selectedMediaType\(\)\) syncMediaForm\(selectedMediaType\(\)\);/, "media selection must sync to the detailed form before opening it");

const passwordFields = [...html.matchAll(/<input type="password" name="apiKey"[^>]*>/g)].map((match) => match[0]);
assert.equal(passwordFields.length, 3, "OpenRouter, fal and Replicate must each use a password field");
assert.equal(passwordFields.every((field) => !/\svalue=/.test(field)), true, "credential fields must never render a stored value");
for (const provider of ["openrouter", "fal", "replicate"]) assert.match(html, new RegExp(`data-wc-provider-form="${provider}"`));
assert.match(html, /data-wc-provider-open-top[^>]*>[\s\S]*?Thiết lập chạy<\/button>/, "top bar must expose setup as text, not an icon-only control");
assert.match(html, /id="provider-connections-title">Thiết lập chạy<\/h2>/, "setup dialog must use the same discoverable title as its top-bar entry point");
assert.match(html, /data-wc-provider-preflight-action[^>]*>Kiểm tra kết nối<\/button>/, "setup dialog must expose the shared preflight action at its bottom edge");
assert.match(html, /data-wc-provider-run-action disabled>Chạy pilot<\/button>/, "setup dialog must expose an explicitly gated Run action");
for (const role of ["analyze", "research", "strategy", "prompt"]) assert.match(html, new RegExp(`<select name="${role}" required>`));
assert.match(source, /fetch\("\/api\/provider-credentials", \{ method: "GET"/);
assert.match(source, /fetch\("\/api\/provider-credentials", \{ method: "POST"/);
assert.match(source, /fetch\(`\/api\/provider-models\?projectId=\$\{encodeURIComponent\(projectId\)\}`/);
assert.match(source, /fetch\("\/api\/provider-models", \{ method: "POST"/);
assert.doesNotMatch(source, /\/api\/provider-credentials\?/u, "credentials must never appear in a URL query");
const credentialUiSource = source.slice(source.indexOf("function credentialDate"), source.indexOf("let detailsReturnFocus"));
assert.doesNotMatch(credentialUiSource, /localStorage|sessionStorage/, "credential UI must not persist keys in browser storage");
assert.match(credentialUiSource, /apiKey = input\.value\.trim\(\); input\.value = "";/, "password input must be cleared before the request awaits");
assert.match(workflowSource, /workflow:provider-credentials-changed[^\n]+invalidatePilotPreflight\("provider_credentials_changed"\)/, "saving a credential must invalidate prior run readiness");
assert.match(workflowSource, /workflow:provider-configuration-changed[^\n]+clearRunRequestId\(projectId\)[^\n]+invalidatePilotPreflight\("provider_configuration_changed"\)/, "saving project models must clear the stale run intent and invalidate prior readiness");
assert.match(workflowSource, /if \(error\.code === "idempotency_conflict"\) clearRunRequestId\(projectId\)/, "an idempotency conflict must explicitly clear the stale request intent");
assert.doesNotMatch(workflowSource, /idempotency_conflict[^\n]+workflowAction\("run\.start"/, "an idempotency conflict must never auto-replay a paid run");
assert.match(workflowSource, /workflow:preflight-failed/, "failed preflight must notify the setup dialog instead of leaving it pending");
assert.match(source, /data-wc-provider-preflight-action[^\n]+perform\(\{ type: "PREFLIGHT" \}\)/, "modal preflight must reuse the existing guarded action");
assert.match(source, /data-wc-provider-run-action[^\n]+perform\(\{ type: "RUN" \}\)/, "modal Run must reuse the existing guarded action and require a user click");
assert.match(source, /data-wc-project-manage/, "projectless setup must provide a direct path to project creation");
assert.match(source, /function resetInspectorScroll\(\)[^\n]+panel\.scrollTop = 0/, "node selection must return the parameter panel to its first controls");
assert.match(canvasCss, /\.wc-provider-dialog \{[^}]*overflow-y:auto[^}]*\}/, "setup dialog must own vertical scrolling on short viewports");
assert.match(canvasCss, /\.wc-provider-forms \{[^}]*flex:0 0 auto[^}]*min-height:210px[^}]*\}/, "provider key cards must not collapse beneath the model panel");
assert.match(canvasCss, /\.wc-role-models \{[^}]*flex:0 0 auto[^}]*\}/, "project model controls must remain a non-shrinking section");

console.log("workflow canvas, provider vault and project model setup UI: ok");
