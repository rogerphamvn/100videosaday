# Creative Hook Lab — prototype v2

Isolated dependency-free visual prototype. Serve this folder with any static HTTP server and open `index.html`.

Suggested local command using the existing bundled Python runtime:

```powershell
& 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 4173 --directory prototype-v2
```

Entry: `http://127.0.0.1:4173/`

Responsive review harness: `responsive-review.html` provides same-origin iframe widths 390/768/1440 × 900 CSS px. This checks browser reflow inside a real child viewport; it does not emulate physical device DPR, touch hardware or browser chrome.

Stable interaction hooks:

- `[data-testid="workspace-tabs"]`, `[data-workspace-tab]`
- `[data-testid="hook-01"]`, `hook-02`, `hook-03`
- `[data-testid="hook-inspector"][data-state]`
- `[data-testid="canvas-view"]`, `[data-testid="list-view"]`
- `[data-testid="motion-toggle"]`
- `[data-testid="reset-button"]`
- `[data-testid="prepare-batch"]`, `[data-testid="batch-preview"]`, `[data-testid="close-batch"]`
- `[data-testid="project-switcher"]`
- `[data-testid="video-studio"]`, `[data-testid="video-timeline"]`, `[data-testid="shot-inspector"]`
- `[data-testid="build-scene-plan"]`, `[data-testid="prepare-video-batch"]`
- `[data-testid="save-feedback"]`, `[data-testid="reset-feedback"]`
- Responsive harness iframe: `#preview-frame`
- Workspace state: `[data-testid="workspace-shell"][data-workspace][data-view][data-state]`

Representation boundary: cards use CSS perspective, transform and layered shadows to communicate a decision graph. This is a 2.5D/CSS spatial illustration, not a WebGL product model, physical simulation, live research surface or media-generation client. All shown product, evidence, hooks and batch values are clearly demo data.

Video Studio computes a local shot plan only. At 30 fps, its demonstrated 60-second plan uses five 372-frame trims with four 15-frame overlaps; its demonstrated 45-second plan uses 360/360/360/315 frames with three 15-frame overlaps. It does not load, edit, assemble, audit or render video files. Taste feedback is saved only in browser `localStorage`, scoped by demo project and hook; it never becomes a universal rule automatically.
