# Creative Hook Lab — PRD & UI concept v1

Ứng dụng nội bộ dự kiến triển khai trên Cloudflare. Ngày 20/10/2026.

**Bắt đầu xem:** mở [REVIEW.html](REVIEW.html) để xem ba mockup và truy cập tài liệu. Đây là trang xem gói thiết kế, không phải ứng dụng Creative Hook Lab hoạt động.

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/PRD.md](docs/PRD.md) | PRD chi tiết, agent pipeline, màn hình, MVP, test/winner/remix và nghiệm thu |
| [docs/TECHNICAL-SPEC.md](docs/TECHNICAL-SPEC.md) | Cloudflare, dữ liệu, API, async jobs, budgets, bảo mật, roadmap kỹ thuật |
| [docs/provider-research.md](docs/provider-research.md) | Model ID/nguồn chính thức và giới hạn xác minh tại 20/10/2026 |
| [docs/DESIGN.md](docs/DESIGN.md) | Visual system và ý đồ ba màn hình |
| [docs/PLAN.md](docs/PLAN.md) | Mục tiêu, phạm vi, phân công và tiêu chí giai đoạn này |
| [references/ATTACHMENTS.md](references/ATTACHMENTS.md) | Cách dùng bảy ảnh tham khảo của người dùng |
| [contracts/README.md](contracts/README.md) | Quy tắc compile JSON sang provider và xử lý negative constraints |
| [examples/README.md](examples/README.md) | Mẫu image/video; dữ liệu giả lập, không phải product research thật |
| [mockups/PROMPTS.json](mockups/PROMPTS.json) | Prompt tạo ba mockup và negative JSON |
| [evidence/INTEGRATION-REVIEW.md](evidence/INTEGRATION-REVIEW.md) | Review chéo và phạm vi đã kiểm |
| [evidence/contracts-verification.json](evidence/contracts-verification.json) | Kết quả kiểm tra JSON hợp lệ và ca sai |

## Quyết định sản phẩm chính

1. Phân tích ảnh ngay khi nhập, nhưng giữ nhãn quan sát/suy luận/đã xác nhận; claim không được suy từ vẻ ngoài.
2. So sánh motivator và cách người dùng đang giải quyết trước khi chọn cảnh hoặc hook. Nhu cầu tích cực cũng hợp lệ.
3. Research trend có nguồn, thời điểm và mức liên quan. Tín hiệu phổ biến không tự chứng minh hiệu quả cho SKU.
4. Tạo creative theo nhiều hướng có ý nghĩa, theo dõi coverage trong white-space map; tránh chỉ thay vài từ rồi tính là concept mới.
5. Mega prompt JSON + negative prompt JSON có version, author metadata, product locks, evidence, storyboard khi là video; provider adapter biên dịch riêng.
6. Chạy batch có budget, preview số lượng và job trạng thái rõ. Dữ liệu test giữ nguyên bối cảnh mục tiêu, kỳ đo, attribution và đối chứng.
7. Remix có lineage và trường khóa/được phép đổi. Chỉ gọi một concept là winner theo tiêu chí người phụ trách đã chọn và dữ liệu đủ điều kiện.

## Trạng thái và giới hạn

- Gói này giao thiết kế trước implementation theo yêu cầu “PRD trước → tạo giao diện trước”.
- Ba ảnh là concept giao diện, dữ liệu demo, chưa owner-approved. ImageGen tích hợp không cho chọn/xác nhận phiên bản 2.5.
- Schema và script kiểm tra là artifact có thể chạy; không phải bằng chứng các provider đã nhận prompt.
- Model IDs được nghiên cứu trên tài liệu công khai; không có API entitlement, quality, billing hoặc latency test.
- Chưa có app frontend/backend, authentication runtime, browser interaction test, API thật hay Cloudflare deployment.
- Giai đoạn tiếp theo: dựng vertical slice bằng mock adapters trên stack đã đặc tả; sau đó kết nối research/image/video từng capability và preflight riêng.

Không có commit/push hoặc publication trong giai đoạn này. Không lưu API key vào gói bàn giao.
