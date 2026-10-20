# Production 100 browser evidence

Captured from the dependency-free source served at `http://127.0.0.1:43174/studio.html` on 2026-10-20.

## Source binding

- `prototype-v2/studio.html`: `d2f465ed600a5ea1f81ce8de1f884eeaa2e49db497408685ae8e87e9240f5556`
- `prototype-v2/studio.css`: `72693a1c80b8553ebf590b109674a20d001fcfd94cc306618099ca6731e08ca7`
- `prototype-v2/studio.js`: `7726c5aba793abee88cdfc48740f8d49971eba2e3eef1abb58ab3b7b70badbc9`

## Observed

- `production-desktop.png`: Production command center rendered with target/planned/ready counters at zero, five-gate pipeline and provider states shown as not configured.
- `research-desktop.png`: Research form and evidence surface rendered; Jev shown as not configured and evidence count remained zero.
- Native browser controls changed `#production` → `#research`; the Research heading and active navigation synchronized.
- `/?tab=video` deep-linked to the existing Video Studio and exposed two Production 100 navigation links.
- Voice workspace rendered with VieNeu not configured. DOM inspection found `maxlength=4000`, zero `<audio>` elements and the explicit no-demo placeholder.
- Quality workspace exposed the source-aligned title “Cổng kiểm cho từng asset” and did not offer self-approval controls.

## Limits

- The local static server did not expose backend APIs, so `/api/production/dashboard` returned 404. These screenshots verify mock-free empty/error UI and navigation, not API execution.
- The available browser did not expose a viewport override, so the 390px mobile layout was not browser-verified in this capture.
- Jev, VieNeu, render throughput, full-pipeline feasibility and a 100-video day were not executed or verified.
- After capture, `studio.js` gained defensive decoding of the percent-encoded Vietnamese voice-name response header. These screenshots bind to the captured hash above, not that later file. Worker/API regression verifies the Unicode header roundtrip with a synthetic PCM fixture; no real voice inference is implied.
