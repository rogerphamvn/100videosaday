"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../prototype-v2/workflow.js"), "utf8");
const html = fs.readFileSync(path.resolve(__dirname, "../prototype-v2/workflow.html"), "utf8");

function loadFunction(name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[^{}]*\\}`, "u"));
  assert.ok(match, `${name} must remain a small testable guard`);
  return Function(`return (${match[0]})`)();
}

const sameAutopilotScope = loadFunction("sameAutopilotScope");
const validAutopilotPlan = loadFunction("validAutopilotPlan");
const sameAutopilotMediaRequest = loadFunction("sameAutopilotMediaRequest");
const autopilotMediaDraftIsDirty = loadFunction("autopilotMediaDraftIsDirty");
const autopilotMediaSettingMatchesMvp = loadFunction("autopilotMediaSettingMatchesMvp");
const autopilotMediaSelectionCanRun = loadFunction("autopilotMediaSelectionCanRun");

assert.equal(sameAutopilotScope({ projectId: "project-a" }, { projectId: "project-a" }), true);
assert.equal(sameAutopilotScope({ projectId: "project-a" }, { projectId: "project-b" }), false, "a late response from project A must be ignored after switching to B");
assert.equal(sameAutopilotScope({ projectId: "project-a", epoch: 1 }, { projectId: "project-a", epoch: 3 }), false, "an A to B to A switch must still reject the original A response");
assert.equal(sameAutopilotScope({ projectId: "project-a", runId: "run-a" }, { projectId: "project-a", runId: "run-b" }), false, "a late response from another run must be ignored");
assert.equal(sameAutopilotScope({ projectId: "project-a", runId: "run-a" }, { projectId: "project-a" }), false, "a cleared run must not accept its late response");
assert.equal(sameAutopilotScope({ projectId: "project-a", planId: "plan-a" }, { projectId: "project-a", planId: "plan-b" }), false, "a start response from a replaced plan must be ignored");
assert.equal(sameAutopilotScope({ projectId: "project-a", planId: "plan-a" }, { projectId: "project-a" }), false, "a closed plan must not accept its late start response");

assert.equal(validAutopilotPlan({ id: "aplan_1", fingerprint: "sha256", confirmationId: "confirm_2" }), true, "confirmation ID may validly differ from plan ID");
assert.equal(validAutopilotPlan({ id: "aplan_1", fingerprint: "sha256", confirmationId: "" }), false, "empty confirmation ID must be rejected");
assert.equal(validAutopilotPlan({ id: "aplan_1", confirmationId: "confirm_2" }), false, "missing fingerprint must be rejected");

const saved = { provider: "openrouter", modelId: "openai/gpt-image-2.5-flare" };
const savedDraft = { ...saved };
const changedDraft = { provider: "fal", modelId: "fal-ai/flux-pro" };
const readiness = { ready: true, selectedOutput: { ...saved } };
assert.equal(autopilotMediaDraftIsDirty(savedDraft, saved), false);
assert.equal(autopilotMediaDraftIsDirty({ provider: "fal", modelId: "" }, null), false, "an empty default is incomplete, not a saved-model divergence");
assert.equal(autopilotMediaDraftIsDirty(changedDraft, saved), true, "a new provider/model remains draft until it is saved");
assert.equal(autopilotMediaSelectionCanRun(readiness, changedDraft, saved, { adapterImplemented: true }), false, "a dirty draft must not run the old saved model");
assert.equal(autopilotMediaSelectionCanRun(readiness, savedDraft, saved, { adapterImplemented: true }), true, "the exact saved, ready, implemented selection may prepare a plan");
assert.equal(autopilotMediaSelectionCanRun(readiness, savedDraft, saved, { adapterImplemented: false }), false, "a catalog model without an adapter must stay blocked");
const videoSaved = { provider: "openrouter", mediaType: "video", modelId: "bytedance/seedance-2.5", parameters: { duration: 8, totalDuration: 15, generateAudio: true } };
const videoReadiness = { ready: true, selectedOutput: { provider: videoSaved.provider, modelId: videoSaved.modelId } };
assert.equal(autopilotMediaSettingMatchesMvp(videoSaved), false, "legacy video duration/audio settings must be normalized before Autopilot v1 can run");
assert.equal(autopilotMediaSelectionCanRun(videoReadiness, { provider: videoSaved.provider, modelId: videoSaved.modelId }, videoSaved, { adapterImplemented: true }), false, "Autopilot must not confirm a 15s silent segment while saved settings request another output");
assert.equal(autopilotMediaSettingMatchesMvp({ ...videoSaved, parameters: { duration: 15, totalDuration: 15, generateAudio: false } }), true);

const request = { projectId: "project-a", epoch: 4, mediaType: "image", provider: "openrouter", requestNumber: 7 };
assert.equal(sameAutopilotMediaRequest(request, { ...request }), true);
assert.equal(sameAutopilotMediaRequest(request, { ...request, projectId: "project-b" }), false, "a stale project response must be ignored");
assert.equal(sameAutopilotMediaRequest(request, { ...request, mediaType: "video" }), false, "a stale image response must not overwrite video controls");
assert.equal(sameAutopilotMediaRequest(request, { ...request, provider: "fal" }), false, "a stale provider response must not overwrite the new provider catalog");
assert.equal(sameAutopilotMediaRequest(request, { ...request, requestNumber: 8 }), false, "an older request sequence must be ignored");

assert.match(html, /data-auto-media-provider/);
assert.match(html, /data-auto-media-search/);
assert.match(html, /data-auto-media-model/);
assert.match(source, /\/api\/media\/catalog\?provider=/, "Autopilot must load the live or explicitly labelled fallback catalog");
assert.match(source, /request\("\/api\/media\/settings", \{ method: "POST"/, "Autopilot must save the exact provider and model server-side");
assert.match(source, /payload\.source === "curated_fallback"/, "fallback catalogs must be identified truthfully");
assert.match(source, /choice\?\.adapterImplemented !== true/, "saving an unimplemented adapter must be blocked");
assert.match(source, /segmentSeconds: 15, totalDuration: 15,[^}]+generateAudio: false/, "Autopilot video saves must force the confirmed one-segment 15s silent MVP contract");
assert.match(source, /filter\(\(item\) => item\.modelId === currentId \|\| !search \|\|/, "a nonmatching search must keep the selected saved model visible");
assert.match(source, /if \(!autopilotMediaSelectionCanRun\(state\.autopilotReadiness, autopilotMediaDraft\(\), autopilotMediaSaved\(\), currentAutopilotMediaChoice\(\)\)\) return/, "form submit must fail closed when draft and saved settings diverge");
assert.match(source, /input\[name='mediaType'\][\s\S]{0,700}loadAutopilotMediaSettings\(true\)/, "switching output type must reload canonical saved settings, not only its catalog");
assert.doesNotMatch(source, /media\.models\[0\]/, "Autopilot must never silently choose the first model");

console.log("autopilot UI scoping, saved-model lock, and catalog behavior: ok");
