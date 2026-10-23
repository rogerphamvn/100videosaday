# Kết nối API

## Nhập key

Nhập key tại **Thiết lập chạy** trên web; xem [PROVIDER-SETUP.md](PROVIDER-SETUP.md). Không gửi key vào chat hoặc form JSON của workflow. Cloudflare Secrets bên dưới là cách cấu hình thay thế.

Trong Cloudflare dashboard: **Workers & Pages → 100videosaday → Settings → Variables and Secrets → Add**. Chọn **Secret**:

| Name | Value |
|---|---|
| `OPENROUTER_API_KEY` | Key OpenRouter |
| `FAL_KEY` | Key fal.ai |

Lưu/deploy thay đổi theo giao diện Cloudflare. Không sửa `INTERNAL_PASSWORD`. [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

Vào `/workflow`, chọn dự án để màn **Tự động** kiểm tra điều kiện chạy. Khi cần kiểm tra riêng, mở **Thiết lập chạy** hoặc **Canvas nâng cao → Kiểm tra kết nối**. Server không trả lại giá trị key; app không lưu key vào browser storage.

## Ý nghĩa kết quả

- OpenRouter: GET `/api/v1/key` và `/api/v1/models` kiểm tra credential/catalog/model roles; không gọi inference. [API kiểm tra key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key).
- fal.ai: chỉ kiểm tra có cấu hình key, vẫn **chưa xác minh**. Không gọi inference để thử key; chưa chứng minh quota, quyền model hay chất lượng.
- Jev/Replicate: kiểm tra cấu hình. Pilot dùng OpenRouter Web Search; Jev là bridge tùy chọn riêng.
- Không trả key, raw provider response hoặc exception cho browser.

## Chế độ chờ

`WORKFLOW_AI_EXECUTION_ENABLED=false`, `WORKFLOW_PILOT_EXECUTION_ENABLED=true` và `WORKFLOW_MEDIA_EXECUTION_ENABLED=true` trong bản node v0.11. Thêm key hoặc kiểm tra kết nối không tự tạo yêu cầu có phí. Pilot cần owner bấm chạy trong ngân sách 2 USD; media có ngân sách riêng mặc định 0/paused và cần dự toán + xác nhận tạo.

Model đã chuẩn bị: Opus5.5 analysis/strategy/prompt, Gemini3.8Flash research; fal GPT Image2.5 Flare và Seedance2.5. Catalog không có model thì báo lỗi, không tự thay thế.

Có reservation từng run/job và giữ ngân sách khi kết quả tính phí chưa rõ; biến bật/tắt và dự toán app không phải hard billing cap của provider. Gói Cloudflare 5 USD không gồm phí OpenRouter/fal. Submit/poll/lưu media đã có kiểm thử giả lập; tạo media trả phí thật, ghép video dài và chất lượng đầu ra chưa được xác minh. Xem [NODE-WORKFLOW-RUNBOOK.md](NODE-WORKFLOW-RUNBOOK.md).

## Local và kiểm thử

Copy `.env.example` sang `.dev.vars` rồi tự điền key; giữ lại cấu hình local cũ nếu đã có. `.dev.vars` đã bị Git ignore. Không dùng mật khẩu production cho test.

`node scripts/test-provider-preflight.mjs` dùng mocked GET responses; `node scripts/test-workflow-api.mjs` kiểm tra auth/CSRF, body rỗng, từ chối browser-supplied secrets. Test execution-off phải chứng minh zero outbound calls. Mock PASS không phải live provider verification.

OpenRouter preflight báo riêng pha `key` và `catalog` bằng trạng thái cố định đã lọc. `key_rejected`, `network_error`, `provider_unavailable`, `timeout`, `invalid_response` và `response_too_large` không chứa upstream body hay giá trị secret. Catalog được đọc tối đa 2 MiB; key hợp lệ vẫn không bật execution hoặc gọi inference.
