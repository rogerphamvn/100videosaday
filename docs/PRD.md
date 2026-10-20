# PRD — Creative Hook Lab

**Phiên bản:** 1.0-draft  
**Ngày:** 20/10/2026  
**Trạng thái:** Gói thiết kế để review nội bộ; chưa phải ứng dụng đã triển khai  
**Đối tượng:** đội Marketing/Creative nội bộ tại Việt Nam  
**Nguồn đầu vào:** yêu cầu của chủ sản phẩm, bảy ảnh tham khảo về motivator map/creative white-space, các nguyên tắc motivator-first đã kiểm chứng trong Skill Hub  

## 1. Tóm tắt sản phẩm

Creative Hook Lab là web app nội bộ biến ảnh sản phẩm và packaging thành một hệ thống giả thuyết creative có thể nghiên cứu, tạo, thử nghiệm và nhân bản có kiểm soát. Một dự án bắt đầu từ nguồn thật của sản phẩm, đi qua nhận diện đặc điểm, đối tượng, tình huống sử dụng, pain/desire, alternative hiện tại và motivator đáng mua; sau đó đối chiếu với xu hướng có nguồn, chọn taste, phát triển hook hình/video, đóng gói mega prompt JSON + negative prompt JSON, tạo batch và nhập kết quả test để tìm **winner candidate**. Khi remix một concept có tín hiệu tốt, hệ thống giữ lineage và các khóa sản phẩm/claim đã được duyệt.

Sản phẩm giải quyết ba vấn đề vận hành:

1. Creative thường bắt đầu từ phong cách hoặc trend trước khi biết người dùng cần gì và sản phẩm tham gia ở bước nào.
2. Một concept tốt khó nhân thành nhiều biến thể thực sự khác nhau mà vẫn giữ đúng sản phẩm, packaging, claim và bối cảnh dùng.
3. Kết quả test bị tách khỏi motivator, prompt và lịch sử biến thể, dẫn đến “clone winner” bằng cảm tính hoặc nhìn một metric đơn lẻ.

Giai đoạn hiện tại chỉ giao PRD, hướng UI, kiến trúc/contract và mockup hình. API model, generation provider và Cloudflare sẽ được đấu nối ở giai đoạn implementation sau khi kiểm tra capability, chi phí và credentials thực tế.

## 2. Mục tiêu, thước đo và giới hạn tuyên bố

### 2.1 Mục tiêu sản phẩm

- Rút ngắn đường đi từ source asset đến một creative test plan có thể truy vết.
- Buộc mọi hook nối về một motivator, use case, awareness stage, proof và đối tượng cụ thể.
- Tạo nhiều biến thể có chủ đích theo trục khác biệt, tránh batch lớn nhưng chỉ đổi màu/câu chữ.
- Sinh prompt có cấu trúc cho image/video, có negative constraints và product/brand locks.
- Quản lý generation như một hành động có chi phí: luôn preview model, số job, kích thước, ước tính giá và budget trước khi chạy.
- Nhập dữ liệu performance đúng bối cảnh để chọn ứng viên tiếp tục test, dừng hoặc remix.
- Giữ lineage từ source → insight → motivator → concept → hook → prompt version → asset → test → remix.

### 2.2 Chỉ số vận hành của chính ứng dụng

Các chỉ số sau đánh giá workflow, không thay thế hiệu quả quảng cáo:

- Tỷ lệ concept có đủ source boundary, motivator, alternative và test hypothesis trước khi tạo prompt.
- Tỷ lệ asset truy ngược được về source, prompt version và concept cha.
- Tỷ lệ job bị chặn đúng khi thiếu product lock, claim proof, quote chi phí hoặc quyền chạy.
- Thời gian trung vị từ upload đến một creative test plan được reviewer duyệt.
- Số concept family khác biệt trên mỗi dự án, không chỉ tổng số file tạo ra.
- Tỷ lệ import test map thành công với đúng asset/placement/audience/time window.
- Tỷ lệ remix giữ nguyên các invariant đã khóa.

Không dùng số giả trong demo. Baseline và target chỉ được thiết lập sau pilot nội bộ.

### 2.3 Giới hạn tuyên bố

- “Viral”, “high-performing”, “best taste” và “winner” là giả thuyết cho tới khi có test đúng mục tiêu và bối cảnh.
- Research về trend chứng minh một mẫu nội dung đang được quan sát ở nguồn và thời điểm cụ thể; không chứng minh nó phù hợp sản phẩm hoặc sẽ chuyển đổi.
- Review nội bộ có thể xác nhận concept rõ, đúng sản phẩm và đáng thử; không xác nhận lift hay tác động nhân quả.
- Ảnh/video AI là creative asset để test, không phải bằng chứng về hiệu năng, chứng nhận, testimonial hoặc trải nghiệm người dùng thật.

## 3. Người dùng, vai trò và quyền

| Vai trò | Nhu cầu chính | Quyền P0 |
|---|---|---|
| Strategist/Researcher | Đọc source, nghiên cứu audience/trend, so sánh motivator | Tạo/sửa insight, nguồn và hypothesis; không chạy generation nếu chưa được cấp quyền |
| Creative Lead | Chọn taste, concept, hook matrix và khóa creative | Duyệt concept/taste/prompt; quản lý invariant và gửi batch sang hàng đợi |
| Operator/Designer | Chuẩn hóa prompt, tạo batch, kiểm tra asset | Chuẩn bị/rerun job trong budget được cấp; không thay claim đã khóa |
| Performance Marketer | Nhập kết quả, phân tích theo context, đề xuất remix | Map campaign/ad/asset, đặt tiêu chí winner theo test plan |
| Reviewer/Approver | Kiểm product truth, claim, taste, cost và release | Approve/reject có lý do, freeze version, mở khóa có audit trail |
| Admin | Provider, model registry, quota, quyền, retention | Quản lý cấu hình server-side; xem log và ngắt provider |

Một người có thể giữ nhiều vai trò trong đội nhỏ, nhưng hệ thống vẫn ghi riêng người tạo, người duyệt và người chạy job. P1 bổ sung SSO/RBAC chi tiết; P0 có workspace membership và role đơn giản.

## 4. Giả định có thể chỉnh

- Ngôn ngữ mặc định: tiếng Việt; có thể cấu hình thị trường/ngôn ngữ từng project.
- Thị trường pilot: Việt Nam; không mặc định hóa pain, văn hóa hay trend Việt Nam cho project thị trường khác.
- Dùng nội bộ, desktop-first; tablet/mobile hỗ trợ review nhanh, không ưu tiên authoring phức tạp.
- Mỗi project đại diện một SKU/variant family được xác định rõ. Không trộn ảnh nhiều SKU mà thiếu nhãn variant.
- Người dùng có quyền sử dụng asset đã upload. Quyền này cần checkbox xác nhận; hệ thống không tự xác minh bản quyền.
- Model/provider là cấu hình thay đổi được. Các nhãn người dùng đề xuất — OpenRouter/Opus 5.5/Gemini 3.8 Flash/GPT 6.1 Sol, fal.ai/Replicate/GPT Image 2.5/OmniFlash 1.1/Seedance 2.5 — là target architecture cần capability preflight, không phải integration đã tồn tại.

## 5. Nguyên tắc sản phẩm

### 5.1 Source truth trước suy luận

Mọi mẩu thông tin phải có một trạng thái hiển thị bằng chữ và icon:

- **Đã xác nhận:** chủ sản phẩm hoặc tài liệu có thẩm quyền xác nhận.
- **Quan sát từ asset:** nhìn thấy trên ảnh/packaging nhưng chưa được xác nhận thành spec/claim.
- **Bằng chứng khách hàng:** review, phỏng vấn, social evidence hoặc dữ liệu hành vi có source và phạm vi.
- **Giả thuyết:** suy luận về audience, pain, motivator, hook hoặc performance cần test.
- **Thiếu nguồn/Không được dùng:** claim chưa đủ căn cứ để đưa vào creative.
- **Mâu thuẫn:** hai nguồn không đồng thuận; cần reviewer xử lý.

Agent không được tự nâng cấp trạng thái. OCR/vision extraction luôn bắt đầu ở “Quan sát từ asset”. Người duyệt có thể xác nhận, bác bỏ hoặc liên kết nguồn.

### 5.2 Motivator trước scene

Trước khi chọn món ăn, nhân vật, bối cảnh, camera hoặc trend, hệ thống so sánh khoảng ba motivator khả dĩ. Mỗi motivator phải trả lời:

1. Ai đang làm việc gì, trong bối cảnh nào?
2. Họ muốn đạt điều gì hoặc đang gặp ma sát cụ thể nào?
3. Cách đang dùng là gì, và khi nào cách đó vẫn đủ tốt?
4. Sản phẩm tham gia ở bước nào bằng đặc tính/cơ chế nào có bằng chứng?
5. Lý do đổi cách làm có đáng với tiền/công sức thêm không?
6. Điều gì đã biết, điều gì đang giả định, và phản ví dụ nào làm sản phẩm không cần thiết?

Ứng dụng chỉ ghi “motivator mạnh nhất trong tập đã so sánh theo bằng chứng hiện có”. Với quà tặng, lifestyle hoặc pleasure product, motivator có thể là mong muốn tích cực; hệ thống không ép tạo nỗi đau.

### 5.3 Trend là nguyên liệu, không phải chiến lược

Trend candidate cần URL/source ID, platform, thị trường, ngày quan sát, cửa sổ thời gian, mô tả pattern và bằng chứng nhìn thấy. Agent tách **cấu trúc có thể học** khỏi câu chữ, nhận diện, testimonial hoặc IP của nguồn. Creative Lead chỉ chọn trend khi nó tăng khả năng diễn đạt motivator/use case mà không làm sai sản phẩm.

### 5.4 Mutation có kiểm soát

Clone winner là tạo nhánh từ một version đã freeze. Người dùng chọn rõ biến nào được thay và biến nào phải giữ. Product geometry, packaging text/logo, approved claims, correct-use, motivator cốt lõi và audience/test context mặc định là invariant; mở khóa cần lý do và tạo concept family mới hoặc revision có audit trail.

## 6. Phạm vi phát hành

### 6.1 P0 — Pilot nội bộ

- Workspace/project và intake có nhiều source asset.
- Product evidence board; crop/OCR/vision output có citation tới vùng ảnh hoặc tài liệu.
- Audience, jobs/pains/desires, use case và alternatives.
- Motivator map, so sánh candidate, objection và evidence gap.
- Research brief và nhập kết quả trend có nguồn; connector web thật có thể đấu sau qua adapter.
- Taste board, creative principles và do/don't được duyệt.
- Creative white-space map và hook matrix.
- Concept/hook editor cho image và video.
- Prompt Lab: mega prompt JSON + negative prompt JSON, validation, versioning và provider preview.
- Storyboard video trước prompt render; first-frame hook và continuity locks.
- Generation Job Center với quote/budget/confirm, retry có kiểm soát và webhook idempotency.
- Asset Library, review status, annotations, rejection reason và lineage.
- Test Plan, CSV import performance, mapping, contextual comparison và winner candidate.
- Winners & Remix với mutation controls, frozen invariants và branch history.
- Settings cho model/provider registry, project defaults, budget và retention.
- Audit log cho thay đổi claim, approval, unlock và generation.

### 6.2 P1 — Sau pilot

- Social/ad/library connectors có quyền và rate-limit rõ ràng.
- Scheduled trend refresh, alert stale evidence và compare snapshot.
- Collaborative comments, mentions, approval SLA và saved review filters.
- Brand kit/versioned design tokens; reusable product lock profiles.
- Automatic dedup/near-duplicate detection cho asset và hook semantics.
- Experiment readout theo cohort, placement, spend và confidence method được cấu hình.
- Template marketplace nội bộ theo category, motivator và creative format.
- Multi-market localization với review native-language.
- Export package/ZIP/API handoff sang media buying hoặc DAM.

### 6.3 Ngoài phạm vi hiện tại

- Tự động publish hoặc bật quảng cáo.
- Tự động chi tiền, tự mua API credits hoặc vượt budget.
- Đăng nhập provider bằng credential đưa qua chat/client.
- Tự scrape nền tảng trái điều khoản hoặc tuyên bố có trend real-time khi không có connector.
- Attribution đa chạm, media optimization/bidding hoặc MMP đầy đủ.
- Legal/compliance approval tự động.
- Tự nhận “winner” từ aesthetic score hoặc một metric thiếu context.
- Tạo digital twin 3D, chỉnh sửa video timeline đầy đủ hoặc DAM enterprise.

## 7. Luồng end-to-end và trạng thái

```text
Project draft
  → Source intake
  → Product facts review
  → Audience / use-case hypotheses
  → Motivator comparison
  → Trend evidence
  → Taste selection
  → Concept families / hook matrix
  → Prompt validation
  → Costed generation queue
  → Asset review
  → Test plan / export
  → Results import
  → Winner candidate
  → Controlled remix
```

Mỗi stage có trạng thái `draft`, `needs_evidence`, `ready_for_review`, `approved`, `rejected`, `stale`; generation thêm `quoted`, `awaiting_confirmation`, `queued`, `running`, `partial`, `completed`, `failed`, `cancelled`. Stale xảy ra khi source, product lock, claim, prompt schema, provider capability hoặc upstream motivator thay đổi. Upstream change không âm thầm sửa artifact đã tạo; nó đánh dấu downstream cần review và giữ version cũ để đối chiếu.

## 8. Hành trình chính

### Journey A — Từ ảnh sản phẩm đến test plan

1. Strategist tạo project, chọn market/channel/objective và tải ảnh sản phẩm, packaging, hướng dẫn, claim sheet.
2. Vision/OCR agent đề xuất product identity, visible features và packaging text; mỗi dòng gắn source crop và confidence. Người dùng sửa/xác nhận.
3. Research agent tạo danh sách audience/use case/alternatives/evidence gaps; không biến suy luận thành sự thật.
4. Motivator agent so sánh ba hướng, nêu phản biện cách cũ và đề xuất một primary + hai alternatives.
5. Trend agent thu thập candidates có source/date; Creative Lead chấp nhận hoặc bỏ qua từng pattern.
6. Taste agent tạo 2–4 directions và rubric; Lead chọn một direction hoặc mix có ghi rationale.
7. Concept agent mở rộng thành concept families và hook matrix; mỗi hook có hypothesis/metric.
8. Prompt agent tạo JSON image/video. Video phải có storyboard, first frame và continuity sheet trước render prompt.
9. Operator xem quote/budget, chọn batch, xác nhận rõ ràng rồi mới tạo job.
10. Reviewer duyệt asset; Performance Marketer tạo test plan và export.

### Journey B — Nhập kết quả và clone winner

1. Marketer tải CSV từ nền tảng hoặc nhập tay; chọn mapping preset.
2. App preview lỗi/unknown assets/duplicate rows/timezone/currency trước commit.
3. Người dùng map objective, audience, placement, spend, impressions, clicks, views, conversions và time window.
4. App nhóm kết quả theo test cell hợp lệ, hiển thị sample size và dữ liệu thiếu; không gộp các context không tương đương.
5. Rule do người dùng cấu hình gắn nhãn `winner_candidate`, `needs_more_data`, `hold`, `stop`; reviewer duyệt.
6. Chọn winner candidate → Create remix branch → chọn mutation dimensions → xem invariant → sinh six-pack/variant plan → quote → chạy.

### Journey C — Sửa source hoặc claim sau khi đã tạo asset

1. Reviewer chỉnh product fact/claim và ghi lý do.
2. Hệ thống tạo version mới, tìm mọi concept/prompt/asset phụ thuộc và đánh dấu stale.
3. Asset cũ vẫn xem được nhưng bị chặn export như approved.
4. Operator regenerate hoặc reviewer xác nhận “không ảnh hưởng”, có audit trail.

## 9. Đặc tả màn hình

### 9.1 Dashboard & Projects

Hiển thị project card theo stage, owner, last activity, blockers, generation spend và số asset cần review. Không dùng vanity KPI. CTA: **Tạo project**. Filter theo market, SKU, status, owner và experiment state. Empty state hướng dẫn upload source, không auto-generate.

### 9.2 Project Setup & Upload

- Trường bắt buộc: project name, product/SKU label, market, language, channel/placement dự kiến, campaign objective.
- Upload: product front/back/side/detail, packaging, label, instructions, brand assets, claim/evidence docs.
- Mỗi file có asset type, variant, source owner, date, rights checkbox và notes.
- Duplicate detection theo hash; cảnh báo ảnh thấp, thiếu góc hoặc nhiều SKU không nhãn.
- Sau upload chỉ chạy extraction preview; generation không tự kích hoạt.

### 9.3 Product & Evidence

Ba vùng:

- **Source rail:** thumbnail/crop, file metadata và version.
- **Fact table:** identity, visible form, materials, size, included parts, packaging copy, supported uses, warnings. Mỗi field có status/source/confidence/owner.
- **Evidence gaps:** câu hỏi cần chủ sản phẩm xác nhận; conflict queue; claim bị cấm dùng.

Action chính: **Gửi fact sheet để duyệt**. Người dùng có thể compare source crop với fact, sửa OCR và khóa exact variant. Product lock cần silhouette/geometry, màu/vật liệu, logo/label, quantity/count, correct-use và exclusions.

### 9.4 Audience, Use Cases & Alternatives

Cho phép tạo segment theo context thay vì chỉ demographic: job, trigger moment, desired outcome, friction, current workaround, barrier, awareness, evidence. Mỗi use case nối tới product fact và staging rule. Alternative phải có trường “khi nào vẫn đủ tốt” để tránh lập luận bán hàng giả tạo.

### 9.5 Motivator Map

Hiển thị 3–5 column families có thể đổi tên theo category, không hard-code một bộ motivator chung. Mỗi candidate gồm:

- Audience + situation.
- Need/desire hoặc pain.
- Current alternative + objection.
- Product role + proof.
- Cost/effort trade-off.
- Evidence vs hypothesis.
- Visual clarity score và testability rationale.
- Counterexample/when not needed.

Compare view không tạo “conversion score” giả. Ranking dùng qualitative rubric và evidence strength; nếu có điểm, app phải hiển thị basis/weight và cho phép tắt. Primary selection cần rationale; alternatives được giữ làm control.

### 9.6 Trend Research

- Research brief từ product/use case/motivator, gồm market/platform/window và query plan.
- Candidate card: source URL, publisher, platform, observed date, captured date, geography/language, pattern, signals nhìn thấy, source reliability, IP/brand elements không được sao chép.
- Status: found, relevant, usable, stale, rejected.
- Cross-check grid: trend pattern × motivator/use case × awareness/placement.
- Output: `adopt`, `adapt`, `control` hoặc `reject`, kèm rationale.

Nếu connector chưa hoạt động, màn hình cho phép nhập source thủ công và hiển thị **Chưa kết nối research live**. Không sinh “trend hiện tại” không có citation.

### 9.7 Taste Board

Creative Lead chọn giữa 2–4 direction được mô tả bằng relationship, composition, energy, realism, creator/brand voice, production feasibility và reference. Rubric 1–5 dùng cho review nội bộ:

1. Product/use-case truth.
2. Motivator clarity trong 1–2 giây đầu.
3. Audience fit và awareness fit.
4. Coherence giữa scene, copy và CTA.
5. Distinctiveness so với concept hiện có.
6. Physical staging plausibility.
7. Format/production feasibility.
8. Evidence/claim integrity.

Điểm taste không dự báo viral/conversion. Reviewer phải ghi điều giữ, điều bỏ và unknown. Approved taste tạo versioned `Taste Profile` dùng bởi concept/prompt agent.

### 9.8 Creative White-space Map

Matrix linh hoạt với hai trục tùy chọn, ví dụ emotional↔functional, lo-fi↔hi-fi, image↔video, product-led↔people-led, creator↔brand, single benefit↔stacked benefits. App plot concept/asset hiện có và vùng chưa test. “White space” chỉ nghĩa chưa có/ít asset trong project dataset, không tự đồng nghĩa cơ hội thị trường.

### 9.9 Creative Lab / Hook Matrix

Mỗi concept family có motivator, awareness, proof, CTA, taste profile và test objective. Hook card gồm:

- Visual hook/first frame.
- Verbal hook.
- Tension/desire.
- Product reveal timing và correct-use moment.
- Proof/why.
- CTA + verified next step.
- Format, duration/aspect, production method.
- Hypothesis và success metric.
- Risk/negative constraints.

Matrix hỗ trợ các trục: motivator × hook pattern, concept × format, awareness × proof, use case × creator treatment. Bulk action chỉ tạo variant plan; không chạy API.

### 9.10 Prompt Lab

Hai tab Image và Video, có structured form, JSON editor, validation errors, rendered summary và version diff. Schema chi tiết nằm ở contract kỹ thuật; PRD yêu cầu tối thiểu:

- Source/reference roles và priority.
- Exact product/packaging/brand locks.
- Audience, motivator, awareness, use case và scene objective.
- Physical staging: actor, action, object relation, timing, environment.
- Composition/camera/lens/light/color/texture chỉ sau staging.
- Deterministic text layer: copy, locale, safe zone; logo/type xử lý hậu kỳ khi model không đáng tin.
- Aspect ratio, resolution, format variants và crop policy.
- Negative prompt JSON theo product drift, claim, anatomy, physics, brand, text, artifact và prohibited staging.
- Test metadata, lineage IDs và prompt author/model/version.

Image variants theo aspect ratio phải được recompose có chủ đích; crop/resize không được giả thành format adaptation nếu làm mất hierarchy, safe zone hoặc hành động.

Video bắt buộc có:

- Storyboard theo shot/timecode trước render prompt.
- First-frame contract đọc được trong 1–2 giây.
- Continuity sheet: product geometry/label/hand/object/environment/light/wardrobe.
- Motion intent, camera path, action timing, transition và end frame.
- Audio/caption plan nếu có; không tự tạo testimonial/voice claim.
- Duration, fps/output ratio và reference role theo capability provider.
- Fail conditions: morphing, label drift, impossible grip, temporal discontinuity, fake UI/proof.

### 9.11 Generation Jobs

Trước nút **Xác nhận tạo**, hiển thị provider/model, capability preflight, số output, duration/resolution, seed/reference support, estimated unit cost, total estimate, remaining budget, storage impact và retry policy. User phải tick xác nhận một lần cho quote còn hiệu lực. Job dùng idempotency key để callback/retry không tính đôi.

Job Center hiển thị per-output state, provider job ID, submitted prompt hash, start/end, actual cost nếu provider trả về, lỗi có thể retry và partial success. Cancel không hứa refund. Nút retry giữ prompt/version, tạo attempt mới và cảnh báo chi phí.

### 9.12 Asset Library & Review

Grid/list theo project, concept, hook, format, provider, model, prompt hash, review/test status. Asset detail có source refs, prompt/negative JSON, seed/settings, parent/children, cost, annotations và compare slider/contact sheet. Review checklist:

- Đúng exact product/packaging và số lượng.
- Cách dùng, thời điểm và vật lý hợp lý.
- Motivator/hook hiểu được.
- Claim/copy có proof.
- Taste/coherence.
- Format safe zone/caption.
- Không có prohibited content/artifact.

Decision: approved for test, needs edit, rejected, archive. Rejection reason có taxonomy + note; approval gắn reviewer và hash.

### 9.13 Test Plan & Results

Test Plan xác định objective, primary metric, guardrails, channel, placement, audience, geo, window, budget cell, naming convention và minimum decision rule do người dùng đặt. App không tự bịa sample size/power.

CSV import gồm ba bước:

1. Upload + encoding/delimiter/timezone/currency detect.
2. Map columns và asset identity; preview unmatched/duplicate/aggregate rows.
3. Validate rồi commit immutable import batch; correction tạo version mới.

Hỗ trợ tối thiểu impressions, reach, spend, clicks, landing-page views, video views theo mốc, watch time, conversions, revenue và platform IDs khi có. So sánh chỉ giữa cells có objective/audience/placement/window hợp lý. Metric dẫn xuất hiển thị công thức và denominator. Missing data không được suy thành zero.

Winner criteria là contextual rule, ví dụ “CTR cao hơn control trong cùng audience/placement, đủ impressions do chủ test quy định, CPA không vượt guardrail”. Nếu chưa đủ điều kiện, nhãn `promising` hoặc `needs_more_data`; không hiển thị “statistically significant” nếu không có phương pháp, assumptions và computation phù hợp.

### 9.14 Winners & Remix

Trang này chỉ hiển thị approved winner candidates cùng context, evidence và confidence limits. Flow remix:

1. Chọn parent asset/concept version.
2. Chọn mục tiêu: validate hook, expand use case, format adaptation, audience adaptation hoặc production refresh.
3. Freeze invariants: product/packaging, claim, correct-use, core motivator, target/test context.
4. Chọn 1–2 mutation dimensions mỗi branch: visual hook, verbal hook, creator archetype, scene, proof treatment, pacing, opening frame, format.
5. App kiểm semantic distance/near-duplicate và hiển thị variant matrix.
6. Reviewer duyệt plan → prompt versions → quote → run.

Mỗi child lưu parent ID, mutation diff, frozen invariant snapshot, author, timestamp và test hypothesis. Thay core motivator hoặc audience mặc định tạo concept branch mới để không gọi nhầm là clone cùng winner.

### 9.15 Settings

- Workspace/project defaults, market/language/timezone/currency.
- Model registry và provider adapter capability: context/media limits, reference support, aspect/duration, webhook, price snapshot, status.
- Routing policy theo task; fallback phải hiện và có log, không silent model substitution.
- Budget theo workspace/project/user/day; kill switch.
- Secret references chỉ server-side; UI chỉ thấy masked connection status.
- Data retention, delete/export request, audit log và connector scopes.

## 10. Hệ thống agent: trách nhiệm, I/O và gate

Tên/model cụ thể là cấu hình. Workflow đề xuất theo yêu cầu: planner/taste dùng model reasoning chất lượng cao; deep research dùng model nhanh có browsing/citation; prompt compiler dùng model reasoning cao. Hệ thống phải preflight endpoint và capability trước mỗi loại job.

| Agent | Input tối thiểu | Output chính | Gate bắt buộc |
|---|---|---|---|
| Intake/Vision | Source assets + declared SKU | Extracted observations, OCR, crop citations, questions | Không tự xác nhận spec/claim; variant ambiguity phải chặn |
| Product Analyst | Approved facts + observations | Product summary, features, supported uses, evidence gaps | Facts/hypotheses tách riêng; không suy performance từ hình |
| Audience/Use-case Researcher | Product role, market, source scope | Segments, situations, jobs/pains/desires, alternatives | Evidence URL/date hoặc gắn hypothesis; nêu when alternative is good enough |
| Motivator Strategist | Above + objections | Primary + alternatives + rationale/counterexample | So sánh tối thiểu ba hướng nếu brief mở; không hứa “mạnh nhất thị trường” |
| Trend Researcher | Motivators/use cases/platform/window | Cited trend candidates, pattern extraction, relevance | Thiếu live source thì `needs_evidence`; không gọi current trend từ memory |
| Taste Director | Approved research + references | 2–4 directions, rubric, selected taste profile | Phân biệt fact/creative judgment; staging trước camera/light |
| Concept/Hook Agent | Motivator + taste + format/test plan | Concept families, hook cards, whitespace coordinates | Need→alternative→motivator→awareness→hook→proof→CTA cùng logic |
| Prompt Compiler | Approved hook + locks + provider capability | Valid mega prompt/negative JSON + summary | Schema valid; unsupported field/model capability bị chặn/cảnh báo |
| Video Storyboard Agent | Hook + continuity + duration | Shot/timecode plan, first/end frame, transitions | Storyboard approved trước render; product continuity check |
| QA Reviewer Agent | Asset pixels + source locks + prompt | Findings by severity + recommendation | Không tự approve; reviewer con người quyết định P0 |
| Performance Analyst | Immutable import + test plan | Contextual comparison, candidates, data gaps | No fake significance; missing/aggregated context visible |
| Remix Planner | Approved candidate + lineage + locks | Mutation plan/child hypotheses | Frozen invariants intact; changed core creates new branch |

Agent response cần machine-readable payload và human summary; schema chi tiết do technical contracts quản lý. Mọi run ghi model/provider version, prompt hash, source IDs, timestamp, token/cost nếu có, tool/citation status, warnings và retry lineage. Nếu model fallback, UI yêu cầu chấp nhận khi output quality/capability có thể thay đổi.

## 11. Gate trước khi tạo creative

Một hook/prompt chỉ chuyển `ready_for_generation` khi:

1. SKU/variant và product lock được duyệt.
2. Use case/correct-use có source hoặc ghi rõ creative hypothesis không tạo claim.
3. Motivator có current alternative, objection và rationale.
4. Audience + awareness + placement xác định.
5. Proof/why chỉ dùng claim được duyệt.
6. CTA có verified next step; urgency/price/review/scarcity trống nếu thiếu nguồn.
7. Taste và physical staging đã review.
8. Mega JSON + negative JSON hợp schema và capability provider.
9. Test hypothesis/metric có trong asset brief.
10. Quote/budget được xem và user có quyền xác nhận run.

Gate có thể cho phép tạo **draft không xuất bản** với evidence gap nếu Creative Lead ghi exception; draft mang watermark/status và bị chặn export/test cho đến review.

## 12. Creative diversity và chống duplicate giả

Batch planner phải phân bổ diversity theo concept family, motivator, use case, awareness, visual relationship, hook form, production style và format. Thay seed, màu nền, crop hoặc một từ headline không được tính là concept mới. UI hiển thị:

- Số concept families.
- Số hook hypotheses.
- Số format adaptations.
- Số cosmetic variants.
- Near-duplicate warning bằng perceptual/semantic similarity khi đã triển khai.

Mỗi batch nên giữ một control và thay ít biến đủ để đọc kết quả. Hệ thống không ép một quy tắc experimental design duy nhất, nhưng cảnh báo khi mỗi asset thay quá nhiều dimension để quy kết nguyên nhân.

## 13. Trạng thái lỗi và phục hồi

- OCR/vision low confidence: giữ crop, yêu cầu review; không bỏ trống âm thầm.
- Research không có source: trả `needs_evidence`, cho nhập thủ công; không bịa URL.
- Source conflict: hiển thị side-by-side, chặn claim phụ thuộc.
- Provider/model unavailable: không silent fallback; giữ job draft và quote hết hạn.
- Capability mismatch: đề xuất model/setting tương thích, yêu cầu chọn lại.
- Partial generation: giữ output thành công, ghi failed attempts/cost, retry từng output.
- Webhook trùng/timeout: idempotency và reconcile bằng provider job ID.
- CSV mapping lỗi: preview, row-level error export, không commit một phần mặc định.
- Upstream source đổi: downstream stale với impact list.
- Asset xóa: soft-delete/retention; lineage vẫn giữ tombstone metadata.

## 14. Dữ liệu, bảo mật và vận hành nội bộ

- Asset ở private storage, signed URL ngắn hạn; tách original khỏi derivative/thumbnail.
- Credential provider lưu secret server-side; không đưa vào client, prompt log hoặc export.
- Prompt/source có thể chứa thông tin nhạy cảm; access theo workspace/project và log download/export.
- Model request cần data-sharing policy theo provider; admin có allowlist và cờ “không gửi asset ra provider X”.
- Audit event cho source update, claim state, approval, lock/unlock, generation confirm, retry, import và winner decision.
- Xóa project cần impact preview, retention rule và quyền admin; billing/provider job đang chạy phải xử lý riêng.
- Cloudflare hosting/worker/queue/storage là target kiến trúc; technical spec quyết định dịch vụ cụ thể và giới hạn runtime sau khi verify.

## 15. Yêu cầu phi chức năng

- Desktop 1440px là authoring target; các breakpoint 390/768/1440 cần visual/behavior test khi build.
- UI đáp ứng WCAG AA cho contrast, keyboard/focus và error text; trạng thái không chỉ dựa màu.
- Autosave draft và version history; không ghi đè approved version.
- Danh sách/library phân trang và thumbnail; original tải khi mở detail.
- Job dài bất đồng bộ; refresh tab không mất trạng thái.
- Observability theo correlation ID từ user action → agent run → provider job → asset.
- Idempotency cho generation submit, webhook và CSV import commit.
- Export phải chứa manifest lineage/prompt hash/review status; không trộn asset draft với approved.
- Mọi thời gian lưu ISO + timezone; mọi giá có currency và price snapshot timestamp.

## 16. Tiêu chí nghiệm thu P0

1. Người dùng tạo project và upload nhiều loại source; hệ thống không tự chạy generation.
2. Extraction output trỏ được tới source/crop và chỉ mang trạng thái quan sát cho tới khi người có quyền xác nhận.
3. Mỗi product fact/claim hiển thị source, status, owner/version; conflict không bị hợp nhất âm thầm.
4. Mỗi audience/use case có context, desired outcome/friction, current alternative và evidence state.
5. Motivator Map so sánh ít nhất ba candidate khi brief mở, có phản biện và rationale; không gắn điểm conversion không có basis.
6. Trend candidate bắt buộc có nguồn/ngày/platform/window; app không có connector phải báo rõ và không sinh trend live giả.
7. Taste Board tách judgment khỏi fact và dùng rubric; điểm không được diễn đạt như dự báo viral.
8. White-space Map đổi được trục và nói rõ phạm vi dataset project.
9. Mỗi hook truy ngược được motivator, awareness, proof, CTA, use case và test hypothesis.
10. Image/video mega prompt và negative prompt pass schema; invalid/missing required fields hiển thị lỗi cụ thể.
11. Video job bị chặn khi chưa có storyboard/first-frame/continuity approval.
12. Aspect adaptation tạo composition instruction riêng; UI phân biệt recompose với crop/resize.
13. Generation luôn có capability check, quote, budget và explicit confirm; retry không ghi đè attempt/cost cũ.
14. Asset detail hiển thị exact source, prompt hash, provider/model/settings, lineage, review và cost.
15. Reviewer có thể reject theo product drift, wrong-use, claim, staging, hook, taste hoặc artifact; decision có audit trail.
16. CSV import preview được mapping, duplicates, unmatched assets, timezone/currency và row errors trước commit.
17. Missing metric không thành zero; formula/denominator của metric dẫn xuất hiển thị được.
18. Winner candidate luôn kèm objective/audience/placement/window/sample/spend và rule; không có nhãn significance nếu chưa tính đúng phương pháp.
19. Remix branch hiển thị parent, mutation diff và frozen invariant; unlock tạo event và yêu cầu lý do.
20. Thay upstream product fact/claim đánh dấu đúng downstream artifact stale, giữ version cũ.
21. Provider secret không xuất hiện ở client bundle, prompt payload log, export hoặc screenshot UI.
22. App có audit trail end-to-end cho một ca mẫu source → asset → test → remix.
23. Ba màn hình trọng tâm Product & Insight, Creative Lab, Winners & Remix dùng cùng visual system và không hiển thị số liệu giả như dữ liệu live.
24. Pilot verification phân biệt rõ staged, tested, browser-verified, deployed và owner-approved.

## 17. Bộ ca kiểm thử đại diện

- **SKU ambiguity:** hai chai cùng brand khác dung tích; agent phải tách variant và không ghép geometry/label.
- **Unsupported health claim:** packaging không có claim; prompt agent phải loại hoặc đánh dấu blocked.
- **Positive motivator:** bộ quà; hệ thống chấp nhận desire “chọn đúng món cho người nhận”, không ép fear/pain.
- **Trend không nguồn:** agent trả cấu trúc gợi ý nhưng không gọi là current trend.
- **Wrong-use visual:** sản phẩm xuất hiện ở sai bước; QA reject dù hình đẹp.
- **Video drift:** label/shape đổi giữa shot; continuity check fail.
- **Format adaptation:** bản 9:16 cần recompose; crop từ 1:1 làm mất first-frame hook phải fail.
- **Duplicate callback:** provider gửi hai webhook; chỉ tạo một asset/cost record hợp lệ.
- **CSV aggregate mismatch:** một row gộp nhiều audience; app không so trực tiếp với cell riêng.
- **Small/noisy result:** CTR tốt nhưng rất ít impressions; nhãn promising/needs more data, không winner tuyệt đối.
- **Winner mutation:** đổi hook và first frame nhưng giữ product/motivator/claim; pass. Đổi motivator phải tạo branch mới.
- **Source correction:** chủ sửa vật liệu; mọi prompt/asset phụ thuộc bị stale.

## 18. Roadmap đề xuất

Đây là thứ tự phụ thuộc, không phải cam kết ngày:

1. **Design freeze:** owner review PRD, mockup, terminology, role/approval và P0 cut.
2. **Foundation:** auth/workspace/project, source storage, evidence/lineage data model, audit/versioning.
3. **Insight flow:** extraction review, audience/use case, motivator, manual/cited trend và taste.
4. **Creative flow:** hook matrix, prompt contracts/validator, storyboard và asset library.
5. **Provider sandbox:** một image adapter + một video adapter, quote/budget/job/webhook; test với non-sensitive demo asset.
6. **Test & remix:** CSV mapping, contextual readout, candidate approval, frozen-invariant branching.
7. **Pilot hardening:** accessibility, security review, cost/retry chaos cases, browser QA, retention/export.
8. **Cloudflare deployment:** staging trước production, observability/kill switch/backup; chỉ sau credentials và domain được chủ cấp.

Effort phụ thuộc model/provider contract, mức collaboration/RBAC và chất lượng connector research. Team không nên hứa thời lượng trước technical spike và capability test.

## 19. Rủi ro còn mở

- Tên/model/version do người dùng đề xuất có thể chưa tồn tại hoặc capability khác kỳ vọng ở provider đã chọn.
- Trend research chất lượng cao phụ thuộc connector, quyền truy cập, điều khoản nền tảng và freshness.
- Product fidelity từ ảnh đơn lẻ không đủ cho mọi góc; cần source coverage và reviewer.
- Provider có thể không bảo toàn chữ/logo/geometry; deterministic compositing và hậu kỳ có thể cần trong implementation.
- Video generation dễ temporal drift và có chi phí cao; storyboard approval không đảm bảo render đạt.
- Performance import có thể thiếu identity/context; “winner” có thể là nhiễu hoặc do media delivery.
- Batch volume lớn tạo selection/review debt; quota phải tính cả khả năng review, không chỉ budget generation.
- Mockup hình chỉ biểu đạt hướng giao diện; chữ nhỏ và interaction phải dựng/kiểm bằng code ở giai đoạn sau.

## 20. Quyết định cần owner chốt trước implementation

- Tên sản phẩm chính thức và brand UI.
- SKU pilot, source asset thật và market/channel đầu tiên.
- Ai có quyền approve claim, confirm spend và declare winner candidate.
- Provider/model allowlist thực tế, ngân sách theo project và data-sharing policy.
- Primary performance objective/metric cho pilot.
- Retention/export requirement và domain/Cloudflare account.
- P0 có cần collaboration nhiều người/SSO ngay hay dùng workspace role đơn giản.

---

### Phụ lục A — Chuỗi quyết định của một hook

`Need/desire → Current alternative → Purchase motivator → Awareness → Optional psychology lens → Visual/verbal hook → Proof/why → CTA → Correct-use lock → Product/brand lock → Test hypothesis`

Lens tâm lý là tùy chọn; thiếu bằng chứng cho social proof, scarcity, deal hoặc safety claim thì để trống. Chuỗi này là checklist consistency, không phải công thức bảo đảm hiệu quả.

### Phụ lục B — Từ điển trạng thái performance

- **Untested:** chưa có dữ liệu chạy thật.
- **In test:** đang trong cửa sổ test đã định.
- **Promising:** có tín hiệu theo một số metric nhưng chưa đủ decision rule.
- **Winner candidate:** đạt rule trong context được nêu và đã reviewer duyệt.
- **Validated in context:** lặp lại/đủ tiêu chí theo protocol của đội; chỉ đúng trong scope đó.
- **Hold:** giữ để có thêm dữ liệu hoặc chờ sửa measurement.
- **Stop:** dừng theo rule/budget/guardrail.

Không có trạng thái “viral guaranteed” hoặc “universal winner”.
