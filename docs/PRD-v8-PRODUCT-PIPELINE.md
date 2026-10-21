# PRD v0.8 — Sản phẩm thật đến creative

## Mục tiêu và phạm vi

Ứng dụng nội bộ Cloudflare, hai cách thao tác: nút/biểu mẫu và agent. Mục tiêu cuối là sản xuất nhiều creative có thể đo hiệu quả và nhân bản concept thắng. Mỗi giai đoạn phải lưu dữ liệu dự án và bằng chứng; trạng thái demo, imported, provider-generated, reviewed và measured không được gộp chung.

v0.8 bổ sung màn `/workflow` cho dữ liệu thật, upload và pipeline server. Không coi canvas demo hiện có là pipeline sản xuất. API nối sau: thao tác nội bộ phải chạy được; phần phụ thuộc provider phải báo chính xác lý do chờ, không trả kết quả giả.

## Người dùng và luồng chính

1. Tạo/chọn dự án Production đã lưu D1; nhập tên sản phẩm, thị trường và mục tiêu.
2. Đưa ảnh sản phẩm và packaging vào. Mỗi ảnh có vai trò, MIME, kích thước, SHA256, snapshot và trạng thái nguồn. Bản đầu hỗ trợ tối đa4 ảnh, mỗi ảnh sau tối ưu không quá256KiB; trình duyệt resize/nén trước khi gửi. Lưu D1 có giới hạn, chưa phải kho ảnh gốc độ phân giải cao.
3. Phân tích thị giác qua model đã cấu hình: loại sản phẩm, đặc điểm nhìn thấy, chữ trên packaging, điều chưa biết và câu hỏi cần xác nhận. Không suy đoán hiệu suất/chứng nhận từ ảnh. Target khách hàng và pain points là giả thuyết cho đến khi có nguồn.
4. Research nhu cầu, use case, rào cản, motivator và trend liên quan. Jev trả bằng chứng URL, tiêu đề, trích yếu, thời gian truy xuất; model tổng hợp bằng nguồn này. Không có nguồn mới không được gắn nhãn viral hiện tại.
5. Chiến lược: với mỗi motivator phải có vì sao đủ mạnh, tình huống kích hoạt, phản đối/lựa chọn thay thế, cơ chế tạo click và phép thử. Ghép trend với motivator/use case, đánh giá phù hợp và lý do loại bỏ. Taste gồm mood, palette, ánh sáng, camera, nhịp, điều tránh và lý do lựa chọn.
6. Sinh các hook khác nhau về pain/use case/mechanism. Mỗi hook có lineage, giả thuyết thử nghiệm, format, promise và claim được phép. Không nhân số lượng bằng thay từ ngẫu nhiên.
7. Model tác giả được phép viết cả mega prompt JSON và negative prompt JSON. Server kiểm tra schema, liên kết nguồn/claim, cặp ID/revision, format, shot continuity và chính sách negative trước khi lưu/xuất.
8. Chuẩn bị job ảnh/video theo model profile đã xác minh. Chỉ compiler trường được hỗ trợ; JSON chuẩn vẫn được giữ nguyên. Không có native negative channel thì thực thi policy compile/fail, không âm thầm bỏ `must_not`.
9. Chạy provider chỉ sau khi có khóa, model/capability mapping, quote/budget và xác nhận thực thi. Nhận jobID, theo dõi kết quả, lưu media và QA. **v0.8 chưa triển khai trọn bước submit/poll/download/QA; chuẩn bị job không phải render xong.**
10. Yêu cầu đầy đủ: nhập kết quả test có asset/concept, thị trường, cửa sổ đo, cỡ mẫu, metric và evidence. **v0.8 chỉ lưu metric/value/unit/reference/observedAt do người vận hành nhập, chưa có ngữ cảnh so sánh thị trường/cửa sổ/cỡ mẫu và chưa xác minh nguồn đo.** Winner candidate là lựa chọn có lý do của người dùng trên creative thực/imported, không phải kết luận thống kê hoặc kết quả tự động. Clone giữ snapshot và parent lineage; biến thể phải quay lại kiểm tra prompt trước khi chạy.

## Model và cấu hình

| Vai trò | Mục tiêu của owner | Quy tắc |
|---|---|---|
| Phân tích/lập kế hoạch/taste | Opus5.5 | ModelID server + catalog preflight; không fallback âm thầm |
| Research tổng hợp | Gemini3.8Flash | Nguồn search ngoài model; model không tự chứng minh trend |
| Tác giả JSON | Opus5.5 hoặc Sol6.1 | Lưu actual modelID, invocationID, thời gian và trust wrapper |
| Ảnh | GPT Image2.5 qua fal/Replicate | Dùng đúng endpoint và schema hiện có |
| Video | OmniFlash1.1 hoặc Seedance2.5 | Xác minh thời lượng/ratio/reference trước enable |

Secret chỉ ở Worker. UI chỉ hiện trạng thái cấu hình và lý do thiếu. Imported JSON không được tự nâng thành actual invocation verified dù trường JSON tự khai như vậy. Kiểm tra schema không chứng minh model thực sự đã viết nội dung.

## Dữ liệu và tính nhất quán

- Project → source snapshot → stage run → output/draft → prompt pair → prepared media job → creative/test/winner → clone.
- Tất cả lookup/write phải gắn projectId; không liên kết record của dự án khác.
- Upload hoặc thay nguồn làm stale kết quả phụ thuộc. Prompt source hash/project/snapshot phải khớp trước khi dùng.
- Run request có requestId/fingerprint và khóa lease để tránh gọi model trùng khi bấm nhiều lần. Không tự retry một paid request chưa biết kết quả.
- JSON import phải được kiểm tra trước khi thay stage output. Mọi output provider giới hạn kích thước trước khi lưu.
- Nguồn web/ảnh và nội dung model là dữ liệu không tin cậy: hiển thị bằng textContent; không chạy code/hướng dẫn từ dữ liệu đó.

## Yêu cầu prompt bắt buộc

Giữ canonical schemas hiện có tại `contracts/mega-prompt.schema.json` và `contracts/negative-prompt.schema.json`. Biên dịch Ajv Draft2020-12 ở build time; Worker không dùng eval để compile schema.

- productLock: geometry, materials, packaging, logo, exactText, reference role/fidelity.
- strategy: audience, pain, use case, motivator, trend có evidence hoặc testMethod, hook mechanism/promise/claims.
- taste: direction/mood/palette/lighting/photography/antiGenericRules.
- image: scene/composition/camera/action/props/overlays.
- video: duration/fps/shot ranges/continuity/audio/text; không có timeline gap hoặc overlap.
- negative: geometry/packaging/logo/text/physics/unsupported claims; video thêm continuity/audio; shot refs phải tồn tại.

## Các phần chưa được coi là hoàn thành

- Thực nghiệm bằng khóa API thật và đánh giá chất lượng của từng model.
- Tạo/poll/lưu media hoàn chỉnh, batch budget reservation và cost reconciliation.
- Video45–60s từ shot15/30s, AI audit/cắt/ghép/motion/voice và render cuối.
- 100 video đạt chuẩn/ngày: cần benchmark throughput, cost, concurrency, retry, QA acceptance; chưa có bằng chứng.
- Taste learning tự động: cần episode có kết quả, rule version, review, holdout và rollback; không phải training model weights.
- Chat LLM tự do điều khiển workflow: bảng lệnh cục bộ v0.7 chưa đáp ứng phần này.

## Acceptance và kiểm thử

Tạo dự án → upload ảnh hợp lệ → tải lại vẫn thấy ảnh/hash → thiếuAPI trả blocked rõ → import dữ liệu hợp lệ lưu thật → JSON sai bị từ chối không đổi state → source mutation làm stale → project isolation → measurement/winner/clone có lineage. Provider mock tests phải chứng minh request/response contract, không gọi đó là inference thật.

Kiểm thử riêng auth/CSRF/body limit (upload route1.5MiB, auth vẫn16KiB), content sniff, concurrency/request replay, output bound, claim/source/prompt semantic validation. Browser desktop/mobile trên Worker thật với served/source hashes. Review độc lập trước merge/deploy; changelog ghi giới hạn.

## Phân công và ngân sách

Backend/provider: production_shell. UI và common nav: ui_fidelity. Đối chiếu provider và adversarial source review: cloudflare_review. Root: schema runtime, route bảo vệ, integration tests, PRD, build/deploy/CI/merge. Không gọi paid API, không bật Containers/R2/GPU mới trong đợt này. Giữ ranh giới gói Cloudflare5USD hiện có; không tuyên bố đây là hard billing cap.
