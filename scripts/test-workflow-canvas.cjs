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
assert.match(html, /data-wc-legacy[^>]+role="dialog"[^>]+aria-modal="true"/, "legacy detail drawer must expose modal dialog semantics");
assert.match(html, /workflow-canvas\.css/);
assert.match(html, /workflow-canvas\.js/);
for (const fabricatedHook of ["Bếp gọn hơn", "Dễ kiểm soát dầu", "Nấu nhanh mỗi ngày"]) assert.equal(source.includes(fabricatedHook), false, `canvas must not fabricate ${fabricatedHook}`);
assert.match(source, /key\.includesByok === false/, "canvas must show the BYOK cap blocker");
assert.match(source, /function openDetailsForSelection\(\) \{\s*if \(selectedMediaType\(\)\) syncMediaForm\(selectedMediaType\(\)\);/, "media selection must sync to the detailed form before opening it");

console.log("workflow canvas parser and duration graph: ok");
