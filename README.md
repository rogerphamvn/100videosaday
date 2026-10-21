# 100 Videos a Day — Creative Hook Lab

Current release source: **0.6.0 — unified Spatial Studio interface and visual fidelity corrections**. See [CHANGELOG.md](CHANGELOG.md) for changes and [AGENTS.md](AGENTS.md) for this repository's publishing agreement.

Internal preview: https://100videosaday.happy-candlevn.workers.dev — [deployment and access guide](docs/CLOUDFLARE-DEPLOY.md). AI providers and rendering are not connected yet.

Hướng UI mới cùng bổ sung dự án, phim dài và taste learning. Gói này giữ nguyên hồ sơ v1 và đưa ra thiết kế tiếp nối v2/v3.

## Xem và thử

- `/studio`: Production Studio, dự án lưu D1, kế hoạch batch, research và voice bridge. Chưa có processor chạy thật nếu chưa cấu hình và kiểm chứng.
- [docs/RESEARCH-VOICE.md](docs/RESEARCH-VOICE.md): hợp đồng Jev/VieNeu, cách host sidecar và giới hạn.
- [docs/CLOUDFLARE-RUNTIME-PLAN.md](docs/CLOUDFLARE-RUNTIME-PLAN.md): phương án xử lý 24/7 và dự toán.
- [docs/100-VIDEOS-BENCHMARK.md](docs/100-VIDEOS-BENCHMARK.md): tiêu chí kiểm chứng 100 video được duyệt/ngày.

- [REVIEW-v3.html](REVIEW-v3.html): bốn concept UI — Insight, Creative Lab, Remix và Video Studio.
- [prototype-v2/index.html](prototype-v2/index.html): bản mẫu giao diện tương tác cục bộ. Tên folder giữ nguyên để tránh đứt đường dẫn; tính năng đã được bổ sung ở lượt v3.
- [docs/PRD-v3-PROJECTS-VIDEO-LEARNING.md](docs/PRD-v3-PROJECTS-VIDEO-LEARNING.md): yêu cầu chi tiết bổ sung.
- [docs/TECH-v3-VIDEO-TASTE-RUNTIME.md](docs/TECH-v3-VIDEO-TASTE-RUNTIME.md): kiến trúc server/render/recipe/taste.
- [docs/DESIGN-v2-SPATIAL-STUDIO.md](docs/DESIGN-v2-SPATIAL-STUDIO.md) và [motion contract](docs/MOTION-CONTRACT-v2.md).
- [Review và giới hạn kiểm chứng](evidence/REVIEW-v2-SPATIAL.md).

## Đã có trong prototype / cần build tiếp

| Khả năng | Prototype cục bộ | Hệ thống thật cần triển khai |
|---|---|---|
| Dự án | Workspace cũ có hai project demo; Studio mới tạo/lưu/list dự án và batch trong D1 | Cập nhật/xóa, membership, private media storage và quyền theo user |
| Creative studio | CSS3D/2.5D cards, selection, inspector, Canvas/List và motion toggle | Workflow agents + research + prompt authoring thật |
| Video dài | Tính plan 45/60 giây theo integer frames; chọn/reorder shot; đổi tỷ lệ; xem plan batch | Generate/import clips, probe nguồn, continuity, render và export |
| Node view | Trình bày quan hệ shot, lựa chọn và move up/down | Typed ports, connect/disconnect, DAG validator, agent execution; chưa có node editor kéo thả đầy đủ |
| Timeline | Kế hoạch segment và overlap, không phát media | Trim/scrub, video/audio/overlay tracks và renderer output |
| AI audit/edit | Nhãn demo và điểm tích hợp | Content/technical audits, evidence coverage, bounded reversible auto-fix |
| Motion skill | Hướng recipe/integration được đặc tả | Package manifest/version/license, compiler, executable renderer và contract tests |
| Taste | Feedback có ghi chú, version cục bộ theo project/hook | Agent retrieval, completed-run episodes, lesson proposal, verification/promotion/rollback |

## Quyết định UX

**Wizard là mặc định, node workflow là tùy chọn, timeline là nơi chỉnh phim.** Cùng một film plan có nhiều view; không bắt người dùng kéo dây để hoàn thành tác vụ thông thường. Mobile dùng list/steps và control có nhãn; nội dung edit/prompt/timeline vẫn phẳng, dễ đọc.

Motion hướng dẫn mắt theo state/lineage, không quay/float liên tục. Depth của card không đại diện confidence hoặc hiệu suất. Prototype là CSS perspective, không phải mesh 3D sản phẩm từ ảnh.

## Ví dụ timing

Tại 30fps:

- 60s: 5 segment × 372 frames = 1860; trừ 4 × 15 frames overlap = 1800 frames.
- 45s với 4 shot: 360 + 360 + 360 + 315 frames − 3 × 15 = 1350 frames.

Đoạn 12,4 giây là **trim**, không phải khả năng generation đã kiểm chứng của model. Nguồn 15/30 giây chỉ được dùng khi capability registry xác nhận; thời lượng render phải được probe lại. Không gọi đoạn clip 15 giây là một frame.

## Taste và học lại

Feedback của user, lỗi sửa, source đã xem, output được duyệt/bị từ chối và kết quả test có ngữ cảnh được lưu thành episode sau mỗi run. Candidate lesson không tự trở thành brand truth; áp dụng authority policy, evaluation và rollback. Học bằng memory/retrieval/preferences, không thay model weights và không hứa gu hoặc performance sẽ tự tăng sau mỗi lần.

Các ảnh concept dùng built-in ImageGen, không có lựa chọn/xác nhận phiên bản 2.5. Giao diện đã host trên Cloudflare; bridge research/voice có code nhưng processor chưa host. Prototype không có nội dung video thật để AI audit hay render.

## Run and verify

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory prototype-v2
```

Open `http://127.0.0.1:4173/`. The prototype has no external runtime dependencies.

```sh
python -m pip install -r requirements-dev.txt
python scripts/check-release.py
node --check prototype-v2/app.js
```

These checks do not certify provider/media fidelity, accessibility or backend/deployment. Historical v1 records remain in [README-v1.md](README-v1.md) and [REVIEW.html](REVIEW.html).
