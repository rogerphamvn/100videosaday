# Review độc lập — Spatial Studio v2 + Video/Taste delta v3

**Ngày khóa review:** 2026-10-20 (Asia/Bangkok)  
**Verdict:** **READY FOR DESIGN/PROTOTYPE REVIEW**  
**Không phải:** production acceptance, runtime acceptance, owner approval, Astra acceptance, provider/model verification hoặc deployment receipt.

## 1. Phạm vi và phương pháp

Review này đối chiếu PRD, technical delta, design/motion contract, bốn concept raster, source prototype và bằng chứng browser CUA đã lưu. Tôi đã trực tiếp xem pixels của cả bốn PNG và screenshot CUA; kiểm source/hashes ở version dưới đây. Browser evidence chỉ chứng minh prototype cục bộ tại viewport và thao tác đã ghi, không chứng minh backend, AI, render video, tenant isolation hay performance trên thiết bị thật.

Không có actual Astra dispatch trong vòng này. `astra-reasoning-protocol` chỉ được dùng làm phương pháp kiểm evidence/gap; role label hoặc skill không phải bằng chứng model.

## 2. Kết quả theo acceptance gate

| Gate | Kết quả | Evidence và giới hạn |
|---|---|---|
| Product/pipeline truth | **PASS cho concept** | UI luôn ghi `DEMO • API CHƯA KẾT NỐI`, source minh họa, hypothesis và zero job. Remix để trống CTR/CPA/spend và nói chưa đủ dữ liệu; không nhận winner. |
| Hierarchy và control clarity | **PASS** | Bốn concept có shell, stage và inspector rõ. Video Studio tách project, shot list, timeline, audit/motion/taste. Concept 02 có cảnh xịt gần chảo nóng nên vẫn phải qua correct-use/safety review khi thay bằng SKU thật. |
| Spatial/3D có mục đích | **PASS** | Depth diễn đạt source→motivator→hook/remix và shot hierarchy. Không có product mesh/physics giả; text/control vẫn là DOM phẳng. |
| Motion | **PASS có giới hạn** | Source dùng token 120/220/400 ms, không có ambient loop; native Motion toggle đã được quan sát. Live OS `prefers-reduced-motion` chưa được emulation/runtime-observe; listener, precedence và CSS chỉ source-reviewed. |
| Keyboard/focus/accessibility | **PASS một phần** | Hook click + Right Arrow, focus theo selection; đóng batch trả focus về opener; target chính 44 px; list mode/non-drag reorder có mặt. Chưa có screen-reader session, đo contrast, touch/DPR hoặc no-JS test. |
| Responsive | **PASS cho harness đã đo** | Settled iframe: 390=`390/375/375/0`, 768=`768/753/753/0`, 1440=`1440/1425/1425/0` (inner/client/scroll/overflow). 390 px thấy project selector và tabs 2×2. Đây không phải chứng nhận mọi width hay thiết bị vật lý. |
| Video duration math | **PASS cho local planner** | Quan sát 60 s: `5×372f − 4×15f = 1800f = 60s`; 45 s: `360+360+360+315 − 3×15 = 1350f = 45s` ở 30 fps. Reorder tái gán Start/Crossfade và giữ total. Chưa có media, `ffprobe`, audio hoặc render. |
| Project/taste scoping | **PASS cho demo local** | Oil/Hook 3 lưu `Local v1`; Travel/Hook 3 không nhận note đó; quay lại Oil khôi phục note. Đây là `localStorage` demo, không chứng minh auth/tenant isolation, server memory hay learning. |
| Runtime architecture truth | **PASS ở mức specification** | PRD và TECH cùng hierarchy `Workspace→Project→Product→Campaign→Run→FilmVersion`, EDL authoritative, Cloudflare control plane/render plane tách, at-least-once/idempotency/reconciliation, repair tối đa 2 vòng và taste evidence/versioning. FFmpeg/HyperFrames/Nodebase/provider vẫn là adapter mục tiêu, chưa được cài/chạy/xác nhận. |
| Visual concept quality | **PASS cho owner review** | 01 đọc tốt motivator/evidence; 02 thể hiện branching + prompt preview; 03 khóa invariant và không giả winner; 04 thể hiện 5 shot, planned source 15 s, trim 62 s, overlap 2 s, final 60 s. Đây là art-direction raster, không phải pixel-final app. |

## 3. Các lỗi quan trọng đã được sửa trước khi khóa

- Project selector bị ẩn và tabs cuộn khó dùng ở 390 px đã được sửa thành topbar hiển thị + grid 2×2.
- Hook cards bị clip ở intermediate width đã có container reflow.
- Motion precedence đổi thành user toggle **và** OS preference; smooth scroll tôn trọng effective motion.
- Video reorder tái tính Start/Crossfade; source planned 15 s và trim thực được ghi tách.
- Batch video bỏ controls ảnh không phù hợp, hiển thị đúng `0 render, 0 provider job, 0 video asset`.
- Batch close trả focus về opener; controls quan trọng đạt min target 44 px.

## 4. Implementation gates còn mở

1. Xây auth/permission và kiểm isolation thật cho workspace/project/product, gồm object storage, cache và vector/taste retrieval.
2. Đóng schema executable cho EDL, motion package, audit finding và taste episode; thêm contract/property tests cho timebase, overlap, retry và invalid graph.
3. Xác minh endpoint/model/provider thực qua capability registry, quote/budget reservation và preflight. Tên model trong UI hiện chỉ là requested labels.
4. Chọn render executor sau benchmark container; pin image/package/license/codec/filter/font và network policy. Không nạp `SKILL.md` như runtime code.
5. Render thật 45/60 s, kiểm `ffprobe`, decode, audio/caption/sync, safe areas và full playback; browser preview không thay master receipt.
6. Triển khai audit với coverage khai báo (`full structural`, `sampled frames`, `cut windows`, `full playback`) và bounded repair tối đa hai vòng.
7. Triển khai TasteEpisode, authority-based promotion, conflict/stale/rollback và chống leakage; self-score không phải ground truth.
8. Chạy accessibility/visual QA trên screen reader, contrast, keyboard đầy đủ, touch/mobile/DPR, live OS reduced-motion, no-JS/list fallback và motion frame sampling.
9. Thay dữ liệu minh họa bằng ảnh/SKU/claim/correct-use có provenance; review cảnh sử dụng gần bề mặt/chảo nóng.
10. Kiểm webhook/idempotency/budget reconciliation, security, retention/redaction, observability và deployment Cloudflare ở phase implementation.

## 5. Version receipt

| Artifact | SHA-256 |
|---|---|
| `docs/DESIGN-v2-SPATIAL-STUDIO.md` | `576d48469525a5d17134dd02ac75f31e55dfdd6b3be56c686cd2aa1a693b9e19` |
| `docs/MOTION-CONTRACT-v2.md` | `cbb519267843144c3b668c2940c4d6a6211182d23e1e39a032ad464d90362b98` |
| `docs/PRD-v3-PROJECTS-VIDEO-LEARNING.md` | `8c02ecdf229772888d08050cfc73e000d89ac6165f214d04f4f0e26a1b0810f2` |
| `docs/TECH-v3-VIDEO-TASTE-RUNTIME.md` | `803d241fda3a3b62f7225be2090ebdd334c1a94182cff3a865175f62a04a05a6` |
| `mockups/v2/01-insight.png` | `5b9f371aed544a2ac55dfee9fabb85b2d5ed0d9c5847bde36f824b2df64b9dd9` |
| `mockups/v2/02-creative-lab.png` | `7307d0831dac3bb2b832f53d4ba829e0f72f239f162113004b595a6422acfa94` |
| `mockups/v2/03-remix.png` | `dbd32637a35d8d997e9a92b99b79bc79ed0a979dc6e7316c96a616df6bb07b68` |
| `mockups/v2/04-video-studio.png` | `1a98dffd00dbea1f84e269f5b66c8baced6ed641e65d5262aa4d299b9a98f15f` |
| `prototype-v2/index.html` | `45fde8775d3c8b7a273727a0a6893d47e426a7e7ec653c691ab9691feaa14d5f` |
| `prototype-v2/styles.css` | `327d63c10afebc39e8304baf76dec1bad4911ce96c5d294cbfcb51e58d416db4` |
| `prototype-v2/app.js` | `5017580df34ed54c842897de998886a60933bf57d65c23363a3fe035dd9a9e9e` |
| `prototype-v2/responsive-review.html` | `e9324b20935aede14f04b41f5154bee0a867db86282fb915ca27c4de49e98cb7` |
| `evidence/BROWSER-v3-OBSERVATIONS.md` | `31ed3aa8e50410fed5d887bad29651b62418f239e2810a7e7f75e2b76622374c` |
| `evidence/browser-v3/video-studio.png` | `58d407640e6b5c5a5a313771adbf69d743a53eb99d59bb680b239b746e34f3bc` |
| `evidence/prototype-v2-self-review.md` | `0a1ddaf1f911f881ea5fc848dcd89c12ff7c366c8ae3851e64fd52ac90424b2c` |
| `README-v3.md` | `83b607a5df6029a680cdfd2070da3aad18c100d8659f30c0d0720c3e1f989b9c` |
| `REVIEW-v3.html` | `dbebd473c1f472a0c9c3975ce33c35221282bd42ee5cede8a559730f8a9f8bdb` |

`REVIEW-v3.html` là review index; nó không phải ứng dụng hay runtime evidence. Bất kỳ thay đổi nào vào artifact trên đều làm receipt này stale và cần review/hash lại.
