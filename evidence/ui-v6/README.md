# Spatial Studio v0.6 rendered verification

Reference: owner-confirmed `mockups/v2` Spatial Studio concepts. These concepts are visual direction, not evidence of live generation.

Rendered tests use an isolated Chromium profile through Playwright against the real local Worker at `http://127.0.0.1:8788`, with a local test credential only. No owner browser profile or production password is involved.

Coverage:

- Desktop 1536×1000: login, Insight, Creative, Remix, Video, Production, Projects, Research, Voice, Quality and Account.
- Mobile 390×844: Creative, Video, Production, Voice and Account.
- `browser-results.json`: measured document width equals viewport width for the tested views; zero page errors; common nine-link navigation and active item assertions.
- `interaction-results.json`: passed keyboard navigation, project/prompt isolation, 45-second timeline ruler, mobile Video workspace isolation and reduced-motion behavior.
- Most screenshots deliberately enable OS reduced motion; `creative-motion.png` checks the default motion-enabled presentation.

Corrections driven by rendered evidence:

1. Two unrelated navigation systems made the app feel like separate products; shared chrome now exposes all nine areas.
2. First creative revision had excess blank space, three cramped mobile columns and a narrow split inspector; corrected to a compact desktop composition and single-column mobile controls.
3. Concept-photo CSS crops initially included neighboring UI labels. Crop windows were tightened instead of treating whole mockups as working UI.
4. Video preview had baked text plus another overlay and fake playback controls; replaced with a labelled static concept preview and duration-bound ruler.
5. Product switching must update prompt context and avoid showing oil imagery for the tumbler demo.

Limits: research/voice/render services remain unconnected. Screenshots verify local rendered UI, not actual AI output, 100/day performance or an authenticated production browser session. Photo wells reuse existing labelled concept art; they are not new product photos or owner-uploaded SKU evidence.
