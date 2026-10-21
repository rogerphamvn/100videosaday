# Kết nối API

## Nhập key

Tạo hai key OpenRouter và fal.ai. Không gửi key vào chat hoặc form JSON của app.

Trong Cloudflare dashboard: **Workers & Pages → 100videosaday → Settings → Variables and Secrets → Add**. Chọn **Secret**:

| Name | Value |
|---|---|
| `OPENROUTER_API_KEY` | Key OpenRouter |
| `FAL_KEY` | Key fal.ai |

Lưu/deploy thay đổi theo giao diện Cloudflare. Không sửa `INTERNAL_PASSWORD`. [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

Vào `/workflow` → **Kết nối API** → kiểm tra. Browser không nhận/lưu key; server đọc Secret.

## Ý nghĩa kết quả

- OpenRouter: GET `/api/v1/key` và `/api/v1/models` kiểm tra credential/catalog/model roles; không gọi inference. [API kiểm tra key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key).
- fal.ai: chỉ kiểm tra có cấu hình key, vẫn **chưa xác minh**. Không gọi inference để thử key; chưa chứng minh quota, quyền model hay chất lượng.
- Jev/Replicate: chỉ kiểm tra cấu hình. Research đầy đủ vẫn cần Jev bridge có nguồn; hai key trên không tự cung cấp bridge.
- Không trả key, raw provider response hoặc exception cho browser.

## Chế độ chờ

`WORKFLOW_AI_EXECUTION_ENABLED=false` và `WORKFLOW_MEDIA_EXECUTION_ENABLED=false` đã đặt trong `wrangler.jsonc`. Thêm key hoặc kiểm tra thành công không tự bật gọi có phí.

Model đã chuẩn bị: Opus5.5 analysis/strategy/prompt, Gemini3.8Flash research; fal GPT Image2.5 Flare và Seedance2.5. Catalog không có model thì báo lỗi, không tự thay thế.

Trước khi bật AI cần ngân sách API riêng và kiểm soát chi phí. Chưa có reservation/reconciliation từng run; biến bật/tắt không phải hard billing cap. Gói Cloudflare5USD không gồm phí OpenRouter/fal. Submit/poll/lưu media vẫn chưa hoàn chỉnh.

## Local và kiểm thử

Copy `.env.example` sang `.dev.vars` rồi tự điền key; giữ lại cấu hình local cũ nếu đã có. `.dev.vars` đã bị Git ignore. Không dùng mật khẩu production cho test.

`node scripts/test-provider-preflight.mjs` dùng mocked GET responses; `node scripts/test-workflow-api.mjs` kiểm tra auth/CSRF, body rỗng, từ chối browser-supplied secrets. Test execution-off phải chứng minh zero outbound calls. Mock PASS không phải live provider verification.
