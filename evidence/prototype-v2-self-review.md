# Prototype v2 — source self-review

Date: 2026-10-20  
Scope: `prototype-v2/` only  
Artifact type: isolated interactive visual prototype; no APIs, generation calls, WebGL, provider SDKs or external assets

## Acceptance review

| Criterion | Result | Evidence |
|---|---|---|
| Light app chrome, charcoal spatial canvas, lime accent, Segoe UI Vietnamese typography | PASS (source) | Tokens `#f4f5f0`, `#151b19`, `#cffc93`; system font stack in `styles.css` |
| Explicit 2.5D/CSS spatial representation | PASS (source) | `perspective`, `transform-style`, card transforms and layered shadows; README states this is not WebGL/product modeling |
| Product source → motivator → 3 hook branches | PASS (source) | Semantic source/motivator articles and three real hook buttons in `index.html` |
| Demo aligned to unbranded oil sprayer and cool empty pan preparation | PASS (source) | Neutral SVG/icon and copy explicitly marked demo/hypothesis; no SKU claim or generated product texture |
| Insight / Creative Lab / Remix update workspace | PASS (source) | Buttons update `data-workspace`, heading, description, canvas title and contextual hint |
| Click and keyboard hook selection | PASS (source) | Real buttons; click plus ArrowLeft/Right/Up/Down handlers update selected state and inspector |
| Canvas/List, live Motion On/Off, Reset | PASS (source) | Real buttons update `data-view`, `data-motion`, `aria-pressed`; reset restores deterministic defaults |
| Reduced-motion behavior | PASS (source) | `effectiveMotion = userMotionEnabled && !motionQuery.matches`, so OS reduce always wins; modern listener plus legacy `addListener` fallback, cleanup, and CSS media query |
| Meaningful motion only | PASS (source) | 120 ms hover, 220 ms selection and 400 ms expansion tokens; no `@keyframes`, autoplay, camera rotation or perpetual animation |
| Batch action is preview-only | PASS (source) | Preview exposes `0 job đã gửi`, API/quote absent, no generation/confirm action; selected asset/count update preview copy |
| Permanent disclosure | PASS (source) | `Bản mẫu tương tác • Dữ liệu minh họa • API chưa kết nối` immediately below top bar |
| Native labeled controls | PASS (source) | Wrapped checkbox/select/number labels; focus-visible treatment; semantic buttons and navigation |
| No-JS fallback | PASS (source) | Strategic graph, three hooks, inspector and batch preview are in HTML; batch is hidden only by JS after load; `noscript` explains interaction limit |
| Responsive source rules | PASS (source) | Breakpoints at 1180, 820 and 520 px; mobile uses a single-column/list spatial layout and removes perspective |
| Intermediate canvas reflow | PASS (source) | Named `spatial` container query at 860 px changes the five-column graph into source→motivator on row one and three fully visible hook branches on row two; mobile explicitly resets every grid placement |
| Stable automation hooks | PASS (source) | `data-testid` plus `data-workspace`, `data-view`, `data-state`; inventory in README |
| Two distinct demo projects | PASS (source) | Native project selector swaps source, motivator, use case, alternative, all hooks, inspector and neutral product silhouette; no real SKU data |
| Project access at tablet/mobile | PASS (source; awaiting post-fix browser check) | Exactly one native project select moved to persistent topbar; it no longer disappears with the sidebar at the 820 px breakpoint |
| Video Studio 45/60-second planning | PASS (source + arithmetic) | Four/five selectable shot blocks, exact frame math at 30 fps, 15-frame transition overlaps, target ratio, inspector, list/node modes and accessible move controls |
| Reordered timeline transition integrity | PASS (source) | `moveShot` derives transition from the new index: first shot is `Start` with no overlap; each later shot is `Crossfade 0.5s • 15f` |
| Planned source vs trimmed segment | PASS (source) | Timeline and inspector explicitly say the 15-second source is planned, media is unavailable, and show the trimmed frame duration |
| Batch focus and reduced scroll | PASS (source) | Both batch openers are captured, close returns focus, and smooth scrolling runs only when `effectiveMotion()` is true |
| Batch context integrity | PASS (source; browser recheck pending) | Creative batch keeps asset/count controls; Video Plan sets `data-context="video"`, hides those incompatible controls, and shows derived duration, ratio and shot count only |
| Interactive target size | PASS (source) | Global buttons/selects and named links are at least 44 px; feedback, studio modes, move controls, duration controls, project selector and close control retain 44 px at mobile |
| Taste feedback scoped locally | PASS (source) | Thumbs up/down plus required note, versioned `localStorage` key scoped to project+hook, explicit local-only disclosure and per-project reset |
| Responsive review harness | PASS (source) | Same-origin `#preview-frame` offers exact 390/768/1440 CSS widths at 900 px height; note disclaims physical-device emulation |

## Checks executed

```text
node --check prototype-v2/app.js
js_syntax=PASS
html_source=PASS tabs=4 hooks=3 no_external_assets=PASS nojs_batch_visible=PASS demo=oil_sprayer
css_source=PASS no_perpetual_keyframes=PASS responsive_rules=PASS
interaction_source=PASS checks=10
integration_review_fixes=PASS os_reduce_wins=PASS motion_tokens=120/220/400 targets=44px focus_restore=PASS
timeline_reorder=PASS first=Start later=Crossfade15f source15=planned_media_unavailable
css_intermediate_reflow=PASS container=860 hooks_visible=3 mobile_explicit_grid_reset=PASS
html_features=PASS tabs=4 projects=2 video_studio=PASS feedback=PASS responsive_harness=PASS
timeline_math=PASS 60s=5x372f-4x15f 45s=360+360+360+315f-3x15f
mobile_project_selector=PASS count=1 location=topbar native_select=PASS
```

The attempted sandbox HTTP probe to the root-owned server at `127.0.0.1:8765/prototype-v2/` was blocked by local socket permissions. This is not reported as served/browser evidence.

## Honest limits and review handoff

- Root's first browser observation at approximately 1265 px found clipped hook cards because the central canvas had only about 650 px available. The source was revised to reflow from the canvas container width rather than the viewport. This source check does not replace root's post-fix browser observation.
- Root's browser observation at 818 px found the project selector inaccessible because it lived inside the hidden sidebar. The single native selector was moved to the persistent topbar; post-fix browser accessibility still belongs to root review.
- Source checks do not establish pixel quality, interaction behavior in a real browser, viewport overflow, contrast compliance or an observed OS reduced-motion toggle. They establish the implemented policy and fallback paths only.
- Root owns CUA review at 1440 px and 390 px, interaction testing, and any version-matched visual acceptance.
- The product, motivator and hook language is demo material. The inspector labels desired communication/results as a hypothesis or `Kỳ vọng cần kiểm chứng`; it is not performance or product proof.
- The CSS illustration communicates decision structure. It is not physical simulation, WebGL geometry, a digital twin or an actual generated product asset.
- Video Studio stores and reorders only planning records. It does not ingest footage, run AI audit, edit/motion models, join video clips or create playable media.
- Taste feedback is browser-local demo state. It records the user's explicit vote and note with a local version; no learning model, cross-project transfer or server persistence exists.
- The responsive iframe harness checks CSS reflow at a fixed child width. It does not prove behavior on a physical phone, device pixel ratio, touch input or mobile browser chrome.
