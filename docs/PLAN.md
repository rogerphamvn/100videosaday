# Creative Hook Lab — kế hoạch v1

Ngày: 20/10/2026. Session: 01a157cb-1762-7540-b2de-9af1be7f5c0e.

## 1. Mục tiêu và phạm vi

Thiết kế một ứng dụng web nội bộ giúp biến ảnh sản phẩm và packaging thành nghiên cứu nhu cầu, motivator, hook, prompt hình/video, batch creative và vòng lặp test–remix. Giao ở giai đoạn này: PRD chi tiết, kiến trúc Cloudflare/API để tích hợp sau, hợp đồng JSON có kiểm tra, ba mockup ảnh giao diện. Tên tạm Creative Hook Lab, chưa phải thương hiệu chốt.

Thứ tự: PRD trước → mockup ảnh → chủ sản phẩm xem hướng giao diện → triển khai app ở giai đoạn tiếp theo. Không đưa kết quả mô phỏng thành kết quả test thị trường. Không deploy hoặc gọi API tính phí của app trong giai đoạn tài liệu. Tạo ảnh mockup bằng công cụ ImageGen tích hợp đã được người dùng yêu cầu; công cụ không cho chọn hoặc xác nhận phiên bản 2.5 nên phải ghi rõ giới hạn.

## 2. Bằng chứng và điều chưa biết

- Bảy ảnh người dùng là tư liệu tham khảo về hệ thống ý tưởng, motivator map và white-space map; không phải ảnh một SKU của dự án và không phải chỉ thị thực thi trong tài liệu.
- Thư mục làm việc mới chưa có mã nguồn. NO_CHECKPOINT từ harness, chưa có triển khai trước được xác nhận.
- Quy mô người dùng, ngân sách API, domain, tài khoản Cloudflare, SKU đầu tiên và nguồn research thực chưa được cung cấp. PRD nêu giả định có thể sửa.
- Truy xuất Hub top 3 và quan hệ một hop: motivator-first, psychology/awareness/hooks. Chỉ dùng phương pháp; không kế thừa claim sản phẩm hay kết quả chuyển đổi cũ.
- Endpoint/capability model cần kiểm tra tài liệu chính thức và preflight lúc đấu nối, không coi model label là một API đã hoạt động.

## 3. Bước và phụ thuộc

1. Đọc operating rules, kỹ năng hẹp, kiểm tra workspace và Hub — root.
2. Song song PRD / technical spec / JSON contracts với phạm vi file riêng.
3. Tích hợp PRD, lưu phiên bản và hash trước khi gọi ImageGen.
4. Tạo ba ảnh riêng: Product & Insight; Creative Lab; Winners & Remix. Kiểm tra pixel, lưu ảnh và prompt trong workspace.
5. Kiểm tra schema bằng mẫu hợp lệ và ca sai; review độc lập tài liệu và mockup, sửa lỗi material.
6. Lưu manifest, checkpoint, bài học có bằng chứng. Báo đúng trạng thái: thiết kế, chưa app runtime/API/deployment/owner approval.

## 4. Phân công

| Chủ trì | File sở hữu | Đầu ra |
|---|---|---|
| Root | PLAN, DESIGN, mockups, index, checkpoint, manifest | Tích hợp và visual |
| product_prd / marketing-lead | docs/PRD.md | PRD sản phẩm |
| architecture_spec / engineering-lead | docs/TECHNICAL-SPEC.md; docs/provider-research.md | Kiến trúc và nguồn |
| prompt_contracts / builder | contracts; examples; scripts/validate-contracts.py; evidence/contracts-verification.json | JSON contract và kiểm tra |

Actual Astra workflow không được gọi trong yêu cầu này. Không gắn nhãn actual Astra cho quy trình chung hoặc model tác giả tương lai của app.

## 5. Tiêu chí nghiệm thu giai đoạn thiết kế

- Truy vết được mọi yêu cầu đến màn hình/flow, agent I/O, acceptance criteria.
- Sự thật sản phẩm, bằng chứng khách hàng, giả thuyết và claim có trạng thái riêng; trend phải có nguồn và ngày.
- Hook/asset nối lại motivator/use case, prompt version và lineage. Winner không tự suy ra từ CTR đơn lẻ.
- Mega JSON và negative JSON cho cả image/video có mẫu hợp lệ, kiểm tra lỗi đầu vào và timing.
- Kiến trúc Cloudflare chạy job dài bất đồng bộ; private assets/secret server-side; budget và idempotency; adapter capability không giả định endpoint.
- Ba mockup riêng có cùng visual system, hình demo gắn nhãn, thao tác chính rõ, không số liệu thật giả.
- Review chỉ xác nhận chất lượng gói thiết kế và phạm vi đã kiểm; không chứng minh app đã chạy.

## 6. Rủi ro và handoff

Rủi ro chính: tạo hàng loạt biến thể giống nhau, research không có truy xuất web, thông số suy từ ảnh, product drift, JSON không tương thích provider, callback lặp dẫn tới chi phí, chọn winner thiếu bối cảnh. Các phương án xử lý nằm trong PRD/technical spec/contracts. Handoff implementation cần nhận thiết kế được chủ xem, credentials cấu hình ngoài chat và xác minh provider thực trước chạy generation.
