# PRD v3 Delta — Projects, Video Assembly & Living Taste

**Ngày:** 20/10/2026  
**Trạng thái:** đặc tả mở rộng cho local mock UI và thiết kế runtime tương lai  
**Kế thừa:** `PRD.md`, `DESIGN-v2-SPATIAL-STUDIO.md`, `MOTION-CONTRACT-v2.md`  
**Phạm vi hiện tại:** tài liệu + mock UI cô lập; chưa có API live, movie render server, model training, provider spend hoặc deployment

Tài liệu này chỉ mô tả phần thay đổi v3. Các gate product truth, motivator, evidence, cost confirmation, lineage, accessibility và Spatial Studio v2 tiếp tục có hiệu lực.

## 1. Delta mục tiêu và override phạm vi

V3 mở rộng Creative Hook Lab từ một project creative đơn sang hệ thống nhiều project/product, có pipeline video nhiều định dạng và vòng lặp taste tích lũy sau từng run đã audit.

Một ngoại lệ hẹp được thêm vào out-of-scope v1: ứng dụng có **assembly timeline** để sắp xếp, trim, transition, caption/audio beat và đóng gói các shot AI/footage thành film version. Đây không phải NLE đầy đủ kiểu Premiere/DaVinci: không cần multicam, compositing node tổng quát, color suite chuyên sâu, VFX graph, plugin host hay chỉnh audio chuyên nghiệp. Browser dùng để lập kế hoạch/preview; movie server tương lai tạo bản render chuẩn.

Mục tiêu quan sát được:

- Dữ liệu không rò giữa project/product/brand.
- Người không kỹ thuật có thể hoàn thành video bằng wizard.
- Người dùng nâng cao có node view và timeline/inspector, nhưng graph không bắt buộc.
- 15/30 giây là lựa chọn ưu tiên do người dùng đề xuất; capability registry quyết định provider thực sự hỗ trợ gì.
- 45/60 giây được ráp từ nhiều shot/clip hợp lệ, có duration math chính xác và continuity audit.
- Taste được cải thiện dưới dạng hồ sơ evidence-backed, có thể rollback; không có lời hứa điểm số, viral hay win.

## 2. Data hierarchy và isolation

Hierarchy bắt buộc:

```text
Workspace
  └─ Project
      └─ Product
          └─ Campaign
              └─ Run
                  └─ FilmVersion
```

### Entity contract

| Entity | Vai trò | Quy tắc chính |
|---|---|---|
| `Project` | ranh giới công việc, quyền và budget | có `workspaceId`; archive không xóa lineage |
| `Product` | một SKU/variant family + source truth | thuộc đúng một project; có versioned Product Lock và asset set riêng |
| `Campaign` | objective/audience/placement/taste brief | thuộc một product chính; bundle cần liên kết product IDs rõ |
| `Run` | một lần plan/generate/audit/assemble có cấu hình đóng băng | append-only inputs, model/provider capability snapshot, idempotency key, cost ledger |
| `FilmVersion` | một edit/render version có parent và manifest | không ghi đè; draft/reviewed/approved/rejected/superseded |

Entity con luôn lưu `workspaceId`, `projectId` và ancestor IDs cần thiết để kiểm isolation server-side. Client route/hidden field không phải access control. Mọi lookup, signed URL, job, audit và taste retrieval phải kiểm project scope; không nhận ID trần rồi trả dữ liệu nếu ancestor mismatch.

`Run` có thể sinh nhiều `FilmVersion` cho aspect/duration/language, nhưng mỗi version trỏ về đúng run, segment plan, product-lock version, taste receipt và source hashes. Copy campaign sang project khác tạo bản sao có provenance và yêu cầu remap product/source; không dùng shared mutable reference.

## 3. Product intake và source assets

Mỗi Product có `Product Source Library` riêng:

- Hero/front/back/side/detail images.
- Packaging front/back/label/copy.
- Approved logo/artwork và deterministic text assets.
- Product instructions, allowed claims, prohibited claims, use/care notes.
- Optional approved footage/audio/avatar consent records.

Mỗi asset lưu file hash, product/version, variant, view/role, rights, source owner, created/captured date, inspection state và crop/derivative lineage. Upload vào Product A không xuất hiện trong selector Product B trừ khi user thực hiện explicit copy/link có quyền.

Vision/OCR chỉ tạo **observation**. Feedback về taste không thể sửa Product Lock, claim status, packaging text hoặc approved source. Thay product truth đi qua Product Evidence workflow, tạo version mới và đánh dấu film/prompt phụ thuộc là stale.

Input validation:

- Reject/hold file không decode được, type/size vượt policy, duplicate hash không rõ role hoặc source không có quyền.
- Cảnh báo khi product chỉ có một góc nhưng prompt đòi orbit/mặt khuất.
- Multi-product frame phải khai từng product/ref; không tự gộp identity.

## 4. Hybrid UX: Wizard + Node + Timeline

### Wizard là mặc định

Wizard cho người dùng phổ thông:

1. Chọn Project/Product và kiểm source coverage.
2. Chọn objective, audience, formats, target duration và media type.
3. Chọn motivator/taste family + source/evidence receipt.
4. Viết/chỉnh narrative, scene beats và segment plan.
5. Generate/import shot candidates; review continuity.
6. Assemble timeline, audit, tối đa hai vòng auto-fix trong budget.
7. Preview, approve/export film version và ghi episodic taste record.

Mỗi bước có `Back`, `Save draft`, validation gần field và summary; người dùng có thể quay lại mà không mất version. Wizard không che cost hoặc tự chạy generation.

### Node workflow là tùy chọn

Node view biểu diễn typed workflow như `Source → Analyze → Plan → Generate/Import → Audit → Assemble → Render → Learn`. Nó phục vụ debug/branching/reuse, không phải điều kiện để tạo video.

- Port có input/output type; invalid edge bị từ chối trước save/run.
- Graph phải acyclic cho execution path. Feedback/taste link là metadata edge, không tạo execution cycle.
- Node thiếu required input hiển thị blocker; không chạy phần downstream như thể hợp lệ.
- Drag có Add/Connect/Move menu và keyboard alternative.
- Small screen dùng step/list view; không bắt kéo dây.

### Timeline + inspector

Timeline là editable assembly view gồm video, overlay/text và audio lanes tối thiểu. Inspector chỉnh source in/out, timeline start, crop policy, transition, speed (nếu được phép), volume/fade, caption và continuity notes. Timeline luôn có list/table tương đương để nhập số chính xác và dùng keyboard.

Spatial Studio v2 có thể hiện campaign/run/film branches ở overview. Editor/timeline vẫn crisp planar DOM; không đặt timeline trong 3D canvas.

## 5. Format, duration và capability registry

User preference mặc định cho generation: **15 giây** và **30 giây** khi phù hợp. Đây là giả thuyết workflow, không phải capability claim. Campaign khai media type `AD`, `TVC`, `UGC` hoặc custom; type này điều chỉnh narrative/taste/audit template nhưng không tự chứng minh format hay duration của provider. Trước khi plan hoặc quote, app đọc `CapabilitySnapshot` của model/provider:

- Allowed source types/reference count.
- Native durations hoặc min/max/step.
- Aspect/resolution/fps.
- Audio/lipsync/avatar/text support.
- Extend/first-last-frame/seed/carry-reference support.
- Max job size, price snapshot, latency class và current availability.

UI chỉ cho chọn native duration được registry xác nhận. Nếu 15/30 giây không hỗ trợ, app đề xuất các shot duration hợp lệ và ráp target film; không silently substitute model/duration.

Output presets P0: 9:16, 4:5, 1:1, 16:9 cùng safe-zone policy; actual provider options vẫn do registry quyết định. Các film ad/TVC/UGC 45/60 giây được assemble từ các shot có native duration hợp lệ, không được gửi một prompt dài rồi giả định provider tạo trọn phim. Format adaptation cần recompose/caption layout riêng, không chỉ crop/resize.

Tên gọi được khóa:

- **Frame:** một ảnh tại một thời điểm trong video.
- **Shot/clip:** một đoạn chuyển động có duration.
- **Segment:** instance của clip trong timeline sau trim/speed/transition.
- **FilmVersion:** toàn bộ quảng cáo/video đã assemble.

Không gọi clip 15 giây là “một frame”.

## 6. Segment planner và duration math

Mỗi segment cần:

```text
sourceAssetId
sourceDuration
sourceIn
sourceOut
playbackRate (default 1.0)
timelineStart
transitionIn {type, duration}
transitionOut {type, duration}
carryReferenceIds
continuityNotes
```

Validation:

- `0 ≤ sourceIn < sourceOut ≤ sourceDuration`.
- `segmentDuration = (sourceOut - sourceIn) / playbackRate`.
- `timelineEnd = timelineStart + segmentDuration`.
- Transition overlap giữa hai segment không vượt duration usable của một trong hai.
- `FilmDuration = max(timelineEnd)` sau mọi overlap; renderer phải match target trong tolerance cấu hình, mặc định ±1 frame.
- Cut có overlap 0. Crossfade/L-cut/J-cut phải khai video/audio overlap riêng.

Auto-layout liên tiếp:

`timelineStart[n] = timelineEnd[n-1] - overlap[n-1,n]`

Hai acceptance examples:

- **45 s:** 4 segment × 12 s, ba overlap × 1 s → start `0, 11, 22, 33`; final end `45.000 s`.
- **60 s:** 6 segment × 11 s, năm overlap × 1.2 s → start `0, 9.8, 19.6, 29.4, 39.2, 49.0`; final end `60.000 s`.

UI hiển thị raw sum, total overlap và final duration để người dùng hiểu math. Rounding theo timebase/fps thực; không tích lũy float drift. Invalid timing chặn render, không tự cắt shot cuối âm thầm.

## 7. Narrative, scene beats và shot continuity

Kịch bản 45/60 giây được thiết kế theo narrative beats, không hard-code `4 × 15 s`. Beat có mục đích: hook, setup, tension/desire, product role/proof, objection, payoff, CTA; một beat có thể trải qua nhiều shot hoặc hai beats dùng chung shot khi rõ ràng.

Mỗi shot plan gồm:

- Beat/story purpose và audience awareness.
- Start-frame inventory: product, hands/avatar, props, environment, light, text.
- Action đã bắt đầu hoặc trigger rõ.
- End-state inventory.
- Carry reference cho shot kế: approved last frame/keyframe, identity embedding/reference image khi provider hỗ trợ, product/wardrobe/environment locks.
- Camera/action direction, screen geography, eyeline, lighting/time, product orientation, label state và audio cue.

Continuity không được suy từ lời prompt chung. Hệ thống so end-state shot trước với start-state shot sau và ghi known mismatch. Carry reference là input có provenance; nếu provider không hỗ trợ, registry phải nói rõ và planner dùng cut/bridge shot/graphic transition thay vì hứa seamless.

Audio plan tách khỏi video segment grid:

- Script có beat/time range, lời thoại, speaker, pronunciation, claim source và pause.
- Music/SFX có cue, rights/source, gain/fade/ducking.
- Voice line có thể đi qua nhiều cuts; scene có thể không thoại.
- CTA timing theo narrative, không bị ép ở giây 45/60 cố định ngoài brief.

## 8. Runtime pipeline: analyze, cut, edit và motion package

Runtime tương lai gồm adapter rõ capability, không gắn một catalog record với một renderer giả định:

1. **Ingest/Analyze:** probe metadata, shot/scene detection, transcript/OCR, source ledger.
2. **Plan:** narrative beats, shot specs, capability-aware generation plan.
3. **Generate/Import:** provider jobs hoặc footage người dùng; idempotent cost ledger.
4. **Audit candidates:** product/identity/claim/technical check trước timeline.
5. **Assemble:** trim, transitions, overlays, caption, audio mix và motion package.
6. **Render:** movie server tạo proxy/master và manifest.
7. **Full-film audit:** xem/scan film đã render, rồi approve/fix/escalate.
8. **Learn:** ghi episodic record sau completed audited run.

Video Motion 715 được dùng như catalog recipe/motion contract có provenance. Chọn đúng record và compile thành native brief cho runtime đã xác nhận. “715” là 715 records, không chứng minh 715 unique designs hay renderer. Baseline animatic chỉ kiểm content/timing; full-fidelity motion cần implementation trong runtime thực và visual QA.

Motion package được version theo run, ghi package/recipe ID, source facts, authoring changes và runtime. Demo claim/brand/assets không được mang sang project mới. Không tự cài dependency hay gọi paid runtime.

## 9. Browser preview và movie server

Browser preview ưu tiên phản hồi nhanh:

- Proxy media, approximate transitions/overlays/audio.
- Timeline scrubbing và frame seek theo khả năng browser.
- Có badge `Preview — chưa phải master render`.
- Không dùng browser preview hash/duration làm proof của output master.

Movie server tương lai là authority cho final encode:

- Resolve exact timeline/timebase, transitions, caption/font, audio mix và color/output settings.
- Deterministic job manifest, idempotency key, source hashes và renderer/package version.
- Tạo proxy/master/poster/contact sheet/waveform theo preset.
- Verify decode, duration ±1 frame, resolution/fps, audio tracks, black/freeze frames và output hash.

Render là async job; tab đóng không mất state. Retry cùng idempotency key không tạo duplicate bill/job. Retry có thay input tạo attempt/version mới và quote mới.

## 10. AI audit toàn clip

Audit không chỉ xem thumbnail hoặc từng shot riêng. Nó nhận master/proxy đúng hash và kiểm:

### Visual/optical continuity

- Product silhouette, label/logo, material/color, quantity và correct-use.
- Hands/props/wardrobe/avatar identity, screen direction, eyeline, camera, environment, light/shadow, reflections.
- Cut/transition boundaries, jump/morph, sudden object appearance/disappearance.
- Text spelling/diacritics, safe zone, persistence và mismatch giữa speech/caption.

### Claims, avatar và audio

- Claim/copy/price/review/scarcity đối chiếu source status.
- Avatar consent/scope, face/voice identity consistency.
- Lipsync alignment được báo theo locator/confidence; không tuyên bố hoàn hảo từ self-score.
- Dialogue completeness, clipping/click/pop, abrupt boundary, loudness range, music ducking và silence ngoài ý muốn.

### Technical detection

- Decode, duration, resolution, fps/timebase, aspect/SAR, audio stream/sample rate.
- Black/frozen/corrupt frames, duplicate/gap, A/V sync drift, text rasterization/encoding issue.

Finding gồm `filmVersionId`, category, severity, start/end timecode, evidence frame/audio range, expected/observed, confidence, suggested action và reviewer status. Model self-grading là một signal; approval cần rule/technical probe và human/independent review theo authority cấu hình.

## 11. Auto-fix là reversible và bounded

Auto-fix không sửa đè film đã audit. Mỗi round:

1. Chọn findings được phép sửa tự động.
2. Hiển thị patch plan, impacted segments, capability và cost/time estimate.
3. User/authority xác nhận trong budget.
4. Tạo child `FilmVersion` + patch manifest.
5. Render lại phạm vi cần thiết khi runtime hỗ trợ; audit lại full clip và boundary lân cận.

Mặc định tối đa **2 auto-fix rounds mỗi run/film branch**. Sau round 2 còn critical/high, cùng lỗi tái diễn, capability thiếu, product truth mâu thuẫn hoặc budget hết → `ESCALATE_FOR_HUMAN`, không loop tiếp và không tuyên bố flawless.

Fix phù hợp: trim/cut point, transition, gain/fade, caption timing/text theo copy approved, replace shot bằng approved candidate, re-render shot trong provider capability. Fix không tự động: đổi product truth/claim, giả consent, tạo testimonial, mở rộng ngân sách, đổi motivator hoặc dùng provider mới không được phép.

Rollback chọn parent version và giữ cả failed child làm negative evidence. “Undo” không xóa cost đã phát sinh.

## 12. Living Taste: scope và media systems

Taste memory có ba scope độc lập:

- **Workspace:** phương pháp/craft dùng chung đã được phép.
- **Project/Brand:** identity, owner references, approved/rejected patterns và project-specific corrections.
- **Campaign/Run:** hypothesis và episodic context; không tự nâng thành brand rule.

Mọi taste item khai đúng media system:

- `SCENE`: composition, physical staging, product/action relationship, light/material.
- `VIDEO`: start/end inventory, action, continuity, camera/motion, edit/audio rhythm.
- `BANNER-TEXT`: negative space, hierarchy, deterministic typography/copy role.

Không lấy style-lock hệ này áp hệ kia. Owner-provided references có precedence theo scope; brand A không thành rule brand B. Product truth và brand identity locks là nguồn riêng, không phải taste candidate.

Sau **mỗi completed audited run**, hệ thống ghi một immutable `TasteEpisode` dù kết quả tốt hay xấu:

- Workspace/project/brand/campaign/run/film IDs.
- Media system và task context.
- Source/reference/output hashes đã thực sự inspected.
- Taste Receipt/profile version dùng khi plan.
- Accepted/rejected outputs và finding regions/timecodes.
- Owner/CD/audit/performance feedback với actor/authority/source.
- Observable decision, result, negative lesson, unresolved conflict.
- Suggested candidate rule và nơi được phép retrieve.

Đây là retrieval memory/evidence ledger, **không phải model-weight training**, không chứng minh model “thông minh hơn sau mỗi lần”, và không hứa tăng điểm hoặc win rate.

## 13. Promotion, conflict, decay và rollback của taste

Lifecycle:

`candidate → verified → active → superseded|rolled_back|rejected`

- **Candidate:** một episode/reference/feedback có provenance; chưa được dùng như luật bắt buộc.
- **Verified:** qua evidence rule được cấu hình, ví dụ owner/CD acceptance đúng scope, repeated forward case hoặc audit finding được độc lập xác nhận.
- **Active:** actor có authority kích hoạt vào profile version; receipt/hash được lưu.
- **Rejected/Rolled back:** giữ lịch sử và negative evidence; ngừng retrieval mặc định.

Không cho agent tự chấm output rồi tự promote. Authority policy xác định ai được verify/activate theo workspace/project/brand. Performance evidence phải có context; CTR tốt một lần không biến thành taste rule.

Conflict handling:

- Product truth/approved claim/latest scoped owner correction thắng taste suggestion.
- Project/brand active rule thắng workspace generic rule khi cùng task.
- Mâu thuẫn giữa active rules tạo `conflict` và chặn auto-application; không majority-vote hoặc merge trung bình.
- Negative feedback gắn đúng output/region/context; không biến một thất bại thành universal ban.

Decay chỉ giảm retrieval priority của candidate/verified guidance khi đã stale theo policy, nguồn đổi hoặc không còn representative; không xóa history và không hạ product truth. Active rule chỉ supersede/rollback qua versioned decision. User có thể pin rule và xem nguồn/tại sao được retrieve.

Privacy:

- TasteEpisode thừa hưởng project visibility; cross-project retrieval chỉ từ workspace methods được promote rõ.
- Không đưa private owner asset, prompt, metrics hoặc feedback vào global/shared profile.
- Delete/retention tạo tombstone cần thiết cho lineage, theo policy; export có redaction.

## 14. State, cost, idempotency và failure handling

Run states:

`draft → validated → quoted → confirmed → running → assembled → audited → completed|escalated|failed|cancelled`

FilmVersion states:

`draft → rendered → audit_failed|needs_review → approved|rejected|superseded`

Guards:

- Generation/render/audit/auto-fix mỗi loại có idempotency key và immutable attempt ledger.
- Same request + same key trả existing result/status; không tạo cost record thứ hai.
- New params/source hash tạo new attempt và quote.
- Partial success giữ output/cost thật; retry từng job/segment.
- Node cycle, type mismatch, invalid timing, missing product lock, unauthorized cross-project asset, stale capability hoặc expired quote đều chặn execution trước spend.
- Cancel không hứa refund; provider status được reconcile.
- Taste write chỉ sau terminal audited run; retry webhook không tạo duplicate TasteEpisode.
- Agent output luôn tách observed evidence, inference, creative choice và unverified claim.

## 15. Acceptance cases và giới hạn giao hiện tại

### Functional acceptance

1. Tạo hai projects, mỗi project có product images riêng; asset picker/API không trả asset project kia dù biết ID.
2. Hierarchy Project→Product→Campaign→Run→FilmVersion truy vết hai chiều và version không bị ghi đè.
3. Wizard hoàn thành một plan mà không cần mở Node view; Node/List giữ cùng state.
4. Nối output video vào input text hoặc tạo execution cycle phải fail với vị trí/lý do; không submit downstream jobs.
5. Drag node/timeline có menu/form/keyboard alternative; small screen dùng list/step mode không overflow.
6. Registry không hỗ trợ native 15/30 s thì UI chỉ đề xuất duration hợp lệ/assembly plan; không silent substitute.
7. Clip 15 s luôn được gọi shot/clip/segment, không gọi “frame”.
8. 45 s case `4×12 − 3×1 = 45` và 60 s case `6×11 − 5×1.2 = 60` render plan pass đúng ±1 frame; overlap invalid fail trước render.
9. Audio script dùng beats/time ranges linh hoạt, không bị chia cứng 4×15; voice line qua cut vẫn giữ đầy đủ.
10. Continuity handoff lưu start/end inventory và carry refs; provider thiếu carry capability hiện warning/alternative.
11. Browser preview gắn nhãn approximate; final movie manifest chỉ do server render job tương lai tạo.
12. Full-film audit trả timecoded findings cho optical continuity, text/claims, avatar/lipsync/audio boundaries và technical probe.
13. Auto-fix tạo child FilmVersion, giữ parent/patch/cost, tối đa hai rounds; lỗi còn lại escalates, không gọi flawless.
14. Rerun cùng idempotency key không tạo job hoặc cost thứ hai; thay input tạo version/quote mới.
15. Feedback “thích màu này” có thể tạo taste candidate đúng scope nhưng không sửa product geometry/material/claim.
16. Agent tự chấm SHIP/high score không thể promote candidate thành verified/active nếu thiếu configured authority/proof.
17. Accepted và rejected output đều tạo episodic evidence sau completed audited run; retry không duplicate episode.
18. Rule brand/project không leak sang brand/project khác; cross-profile transfer phải tách method/craft khỏi identity và có receipt.
19. Conflict taste không auto-merge; rollback khôi phục profile trước và giữ negative/history.
20. Không có UI/copy hứa `8/10 improvement`, viral, winning hoặc perfect continuity từ số run/taste episodes.

### Deliverable boundary hiện tại

Trong phase này chỉ cần mở rộng docs và local mock UI thể hiện:

- Project/Product switcher và hierarchy.
- Wizard + optional node/list.
- Segment planner/timeline/inspector với 45/60 s math.
- Film audit/findings + two-round fix state.
- Living Taste panel với candidate/verified/active và provenance.

Không gọi live AI/provider, không render movie thật, không nối server, không học model weights, không publish/deploy và không phát sinh phí. Mock/static checks chỉ chứng minh thiết kế/source; runtime, pixels, audio, timing và isolation cần implementation + browser/server tests ở phase sau.
