"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../prototype-v2/workflow.js"), "utf8");

function loadFunction(name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[^{}]*\\}`, "u"));
  assert.ok(match, `${name} must remain a small testable guard`);
  return Function(`return (${match[0]})`)();
}

const sameAutopilotScope = loadFunction("sameAutopilotScope");
const validAutopilotPlan = loadFunction("validAutopilotPlan");

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

console.log("autopilot UI response scoping and confirmation behavior: ok");
