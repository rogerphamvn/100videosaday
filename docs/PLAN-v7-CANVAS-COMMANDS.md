# v0.7 Canvas and direct commands

Objective: preserve Spatial Studio while making canvas objects genuinely movable, with one shared state for direct commands and manual editing. Minimize controls and make the command panel collapsible.

Scope: Insight/Creative/Remix drag, pan/zoom, node add/edit, keyboard/manual alternatives, undo and project/workspace-scoped browser persistence. Video commands may adjust existing planning controls. No inference provider or paid processing is enabled; supported local commands are distinguished from AI requests.

Ownership: ui_fidelity owns canvas-agent.js/css and index inclusion. Root owns asset routing/build, integration, tests/docs, publication. cloudflare_review independently reviews state boundaries and actual rendered interactions.

Acceptance: pointer dragging changes visible position; reload restores it; project/workspace isolation; cancel/undo; chat and manual controls update the same state; unsupported input makes no mutation; input rendered as text; mobile and reduced-motion remain usable; existing auth and production tests pass. Final build assets are explicitly allowlisted and authenticated.

Verification order: pure state/parser checks where available; real local Worker browser interaction and screenshots; independent review; existing regressions; deploy existing Worker, public smoke; GitHub CI and merge. No owner password reset, new paid compute, or unproven AI throughput claims.
