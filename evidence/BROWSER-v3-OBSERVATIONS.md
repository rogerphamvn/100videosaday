# Browser observations — Spatial Studio + project/video planning prototype

Date: 20/10/2026. Browser: CUA in-app browser. Local target `http://127.0.0.1:43174/`; server serves only `prototype-v2`. This is a local visual/planning prototype, no provider/backend/video render.

## Observed interactions

1. Click Hook 02 changed the inspector to “Chuẩn bị mặt chảo”. Right-arrow on the focused hook selected Hook 03 and changed need/move/expected-proof/taste together. Keyboard focus followed selection.
2. A clearly labelled QA feedback note was saved for Oil sprayer / Hook 03. UI showed `Local v1` and the entered note. Switching to Travel tumbler changed source silhouette, motivator, alternative and all three hooks. Travel / Hook 03 showed no feedback. Returning to Oil / Hook 03 restored its own `Local v1` note. This verifies local project+hook scoping in this demo, not server tenant isolation or real agent learning.
3. Native selectors changed Video Studio to 60 seconds and 16:9. Building the plan showed five trims of 372 frames / 12.4s, planned sources of 15s and four overlaps of 15 frames / 0.5s; displayed final duration 60.0s.
4. Selecting the second shot and pressing “Đưa lên” made it the first shot with `Start`; the displaced former first shot became `Crossfade 0.5s`. Total remained 60.0s.
5. Setting 45 seconds and four shots showed trims 360/360/360/315 frames (12/12/12/10.5s), with three 15-frame overlaps; displayed final duration 45.0s.
6. Clicking Motion changed its state from Bật to Tắt. This proves the native user toggle. Live OS `prefers-reduced-motion` changes were **not emulated** through the browser tools; listener priority/fallback/cleanup were source-reviewed only.
7. Batch video preview showed duration/ratio/shot count and explicit `0 render, 0 provider job, 0 video asset`. A first version incorrectly left generic Image 4:5/variant controls visible. Builder fixed context; after source reload, final 60s/9:16 preview contained only derived video summary and zero jobs, without those incompatible controls.
8. Closing batch returned focus to its opener, observed in the accessibility tree. No paid action or provider submission was exposed.

## Reflow measurements

Used same-origin `responsive-review.html` with an iframe at defined CSS widths and a visible layout diagnostic. This tests browser reflow, not a physical device, DPR, touch, device performance or mobile browser chrome.

| Frame setting | Observed innerWidth | clientWidth | scrollWidth | Horizontal document overflow |
|---|---:|---:|---:|---:|
| 390 | 390 | 375 | 375 | 0 |
| 768 | 768 | 753 | 753 | 0 |
| 1440 after settle | 1440 | 1425 | 1425 | 0 |

The 15px difference is the child document scrollbar. At 390px the final project selector is visible in the topbar and all four workspace tabs are a two-by-two grid. Initial hidden-selector and scrollable-tab defects were found and repaired. The older intermediate-width Creative canvas clipped hook cards; builder added a canvas container-query reflow. Its source was reviewed; no claim of exhaustive all-width visual acceptance.

The harness animates width for 180ms. An early read during 768→1440 transition reported a transient innerWidth of 824px/overflow179px. A later explicit “Đọc layout” after settling reported 1440/1425/1425/0. Do not mistake a transient harness measure for final breakpoint evidence; collect settled state.

## Screenshot and limits

`browser-v3/video-studio.png` is an actual CUA screenshot of the prototype at the available narrow app viewport after a 60s plan. It is not the photorealistic ImageGen concept. A timeline may scroll within its bounded region; this does not certify every node is convenient to operate on a narrow screen. List mode remains available.

Four ImageGen concepts establish the intended art direction. The native prototype demonstrates state, controls and modest CSS3D transitions; it does not reproduce all concept materials/lighting and is not pixel-final. No live OS motion emulation, no-JS browser run, measured contrast, screen-reader session, motion frame sampling, actual clips, audio playback, AI audit, export or server-side project security was verified.

## Local server scope correction

Automatic approval rejected an elevated preview command that served the whole workspace. The safe replacement served only `prototype-v2` on loopback and succeeded. Earlier broad sandbox preview sessions were stopped. No firewall/security setting was weakened, no public tunnel or deployment was opened.
