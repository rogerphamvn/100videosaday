# Provider research — Creative Hook Lab

> Kiểm tra tài liệu công khai ngày 2026-10-20. Đây là bằng chứng thiết kế, không phải runtime proof: chưa dùng API key, chưa submit prediction, chưa đo latency/chất lượng và chưa phát sinh chi phí.

## 1. Kết luận sử dụng

Các model label do người dùng nêu hiện có trang/ID chính thức trên OpenRouter hoặc fal. Tuy vậy, implementation phải dùng endpoint ID + capability snapshot, không dùng display name. Availability, schema và giá có thể đổi sau thời điểm tài liệu này.

| Yêu cầu | Provider/ID đã thấy trong tài liệu chính thức | Mức xác minh | Quyết định thiết kế |
|---|---|---|---|
| Opus 5.5 plan/taste/prompt | OpenRouter `anthropic/claude-opus-5.5` | trang model + model family | registry entry; preflight trước enable |
| Gemini 3.8 Flash research | OpenRouter `google/gemini-3.8-flash` | trang model + API | phải đi cùng web search/fetch tool |
| GPT 6.1 Sol prompt writer | OpenRouter `openai/gpt-6.1-sol` | trang model + API examples | structured output adapter |
| GPT Image 2.5 image | fal `openai/gpt-image-2.5/flare/text-to-image`, `.../sunburst/text-to-image`; edit endpoints riêng | API pages | chọn variant bằng policy, không alias chung |
| OmniFlash 1.1 video | tên chính xác trên fal là **Gemini Omni Flash 1.1**: `google/gemini-omni-flash/v1.1/text-to-video`, `.../image-to-video`, `.../reference-to-video`, `.../edit` | API pages | UI có thể viết ngắn; registry giữ ID đầy đủ |
| Seedance 2.5 video | fal `bytedance/seedance-2.5/text-to-video`, `.../image-to-video`; có US/reference variants trên catalog | API pages | chọn endpoint theo input và data residency |
| Các model trên Replicate | chưa xác minh exact slug/version trong lượt này | chỉ xác minh Predictions + webhook contract | không hard-code slug; admin onboarding phải verify |

## 2. OpenRouter

### Model discovery và pinning

OpenRouter có `GET /api/v1/models` trả model ID, modalities, context, pricing và supported parameters. App nên sync vào staging registry, diff với revision đang active và yêu cầu admin enable. Không tự đổi sang alias `latest` cho production artifact cần reproducibility.

Nguồn:

- [List all models and properties](https://openrouter.ai/docs/api/api-reference/models/get-models)
- [Claude Opus 5.5](https://openrouter.ai/anthropic/claude-opus-5.5/)
- [Gemini 3.8 Flash](https://openrouter.ai/google/gemini-3.8-flash/api)
- [GPT-6.1 Sol](https://openrouter.ai/openai/gpt-6.1-sol)

### Research không đồng nghĩa với model call

OpenRouter phân biệt model và server tools. `openrouter:web_search` tìm dữ liệu hiện thời, `openrouter:web_fetch` lấy nội dung URL; model có thể gọi 0–N lần. Web search plugin/`:online` cũ được docs đánh dấu deprecated, vì vậy thiết kế mới dùng server tools hoặc research adapter riêng.

Hệ quả:

- request research phải ghi tool configuration và tool call results;
- citation chỉ được tạo từ returned URL/source record;
- model response không tool/source là hypothesis;
- cần cap số tool calls và budget riêng cho search.

Nguồn:

- [OpenRouter Server Tools](https://openrouter.ai/docs/guides/features/server-tools/overview)
- [OpenRouter Web Search](https://openrouter.ai/tool/web-search/)
- [Plugin overview and deprecation note](https://openrouter.ai/docs/guides/features/plugins/overview)

## 3. fal

### GPT Image 2.5

Tài liệu fal thể hiện ít nhất hai variant:

- `openai/gpt-image-2.5/flare/text-to-image`: default/fast-oriented variant;
- `openai/gpt-image-2.5/sunburst/text-to-image`: precision-oriented variant;
- edit dùng endpoint khác: `.../flare/edit`, `.../sunburst/edit`.

Schema cụ thể khác theo endpoint; đừng giả định mọi endpoint có `negative_prompt`. Adapter phải inspect schema/capability, rồi compile negative constraints vào field riêng hoặc prompt chính và ghi warning.

Nguồn:

- [GPT Image 2.5 Flare text-to-image](https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api)
- [GPT Image 2.5 Sunburst text-to-image](https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api)
- [GPT Image 2.5 Flare edit](https://fal.ai/models/openai/gpt-image-2.5/flare/edit/api)

### Gemini Omni Flash 1.1

Các task dùng endpoint riêng:

- `google/gemini-omni-flash/v1.1/text-to-video`
- `google/gemini-omni-flash/v1.1/image-to-video`
- `google/gemini-omni-flash/v1.1/reference-to-video`
- `google/gemini-omni-flash/v1.1/edit`

Tài liệu khuyên long-running request dùng Queue + webhook thay vì giữ synchronous request. `FAL_KEY` phải ở server-side proxy.

Nguồn:

- [Text to video](https://fal.ai/models/google/gemini-omni-flash/v1.1/text-to-video/api)
- [Image to video](https://fal.ai/models/google/gemini-omni-flash/v1.1/image-to-video/api)
- [Reference to video](https://fal.ai/models/google/gemini-omni-flash/v1.1/reference-to-video)
- [Edit video](https://fal.ai/models/google/gemini-omni-flash/v1.1/edit/api)

### Seedance 2.5

Tài liệu fal ghi nhận text-to-video, image-to-video và reference/US variants. Một trang image-to-video công khai schema gồm `image_url`, prompt, optional end frame, resolution, duration, aspect ratio, audio và seed. Đây là snapshot theo endpoint; adapter không áp schema đó lên variant khác.

Nguồn:

- [Seedance 2.5 catalog](https://fal.ai/explore/bytedance)
- [Seedance 2.5 image-to-video](https://fal.ai/models/bytedance/seedance-2.5/image-to-video)
- [Seedance 2.5 text-to-video API](https://fal.ai/models/bytedance/seedance-2.5/text-to-video/api)
- [US text-to-video variant](https://fal.ai/models/bytedance/seedance-2.5/us/text-to-video)

### Queue/webhook

fal API pages dùng `fal.queue.submit(..., { webhookUrl })`, sau đó status/result theo `request_id`; API key không được đưa vào client. Tài liệu public của fal cũng mô tả webhook signature ED25519. Khi triển khai phải đọc đúng webhook guide/schema hiện hành và test signature fixture; không copy code blog mà không pin/verify.

Nguồn:

- [fal production queue/webhook overview](https://fal.ai/learn/serverless/ai-inference-provider-for-generative-media)
- Các API pages phía trên, mục Queue và “Protect your API key”.

## 4. Replicate

Replicate hỗ trợ tạo prediction, polling/SSE và webhook. Tài liệu webhook nêu:

- terminal webhook có retry khi delivery lỗi;
- identical webhooks có thể đến nhiều lần;
- event có thể đến sai thứ tự;
- handler cần idempotent;
- API output có thể bị xóa sau thời gian ngắn, nên phải persist output sớm.

Vì lượt nghiên cứu này chưa có bằng chứng official cho exact model slug/version tương ứng GPT Image 2.5, Gemini Omni Flash 1.1 hoặc Seedance 2.5 trên Replicate, registry không được tự phát minh ID. Onboarding flow cần:

1. query/search provider catalog bằng API hoặc tài liệu official;
2. pin owner/model/version hoặc official model endpoint;
3. capture input/output schema, webhook behavior, price snapshot;
4. chạy sandbox contract test;
5. admin enable revision.

Nguồn:

- [Replicate HTTP API](https://replicate.com/docs/reference/http)
- [Replicate webhooks](https://replicate.com/docs/topics/webhooks/)
- [Receive webhooks: retries, idempotency, ordering](https://replicate.com/docs/topics/webhooks/receive-webhook/)

## 5. Cloudflare platform evidence

| Dịch vụ | Bằng chứng dùng trong kiến trúc | Nguồn |
|---|---|---|
| Workers Static Assets | deploy Worker + static asset như một unit; hỗ trợ SPA routing | [docs](https://developers.cloudflare.com/workers/static-assets/) |
| D1 | prepared statements; `batch()` chạy tuần tự và rollback sequence khi lỗi | [D1Database](https://developers.cloudflare.com/d1/worker-api/d1-database/) |
| R2 | presigned PUT cho direct upload; multipart cho file lớn | [upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/) |
| Queues | mặc định at-least-once; duplicate phải được dedupe bằng unique/idempotency key | [delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) |
| Workflows | multi-step durable execution, retry/persist; steps cần idempotent vì có thể retry | [guide](https://developers.cloudflare.com/workflows/get-started/guide/), [rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/) |
| Access | identity-aware proxy cho self-hosted web app/Workers | [web applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/), [application types](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/choose-application-type/) |

Một nuance cần test: docs Static Assets ghi Access vẫn bảo vệ Worker/assets nhưng Access context có giới hạn trong user Worker. Không thiết kế authorization chỉ dựa vào một API context chưa được test.

## 6. Preflight bắt buộc trước tích hợp có phí

Không model nào được `enabled=true` nếu thiếu tất cả bằng chứng sau:

- endpoint ID resolve thành công bằng credential của workspace;
- schema snapshot và hash;
- modalities/limits cần cho use case;
- structured-output/tool/negative-prompt/webhook capability thực tế;
- price snapshot + currency/unit;
- data retention/residency setting đã được owner chọn;
- one low-cost sandbox call có explicit authorization;
- output persistence và webhook/poll fallback pass;
- adapter contract tests pass.

## 7. Hạn chế của nghiên cứu này

- Không có API key/runtime call nên chưa chứng minh account entitlement, quota, latency, actual billing hoặc region availability.
- Trang model có thể thay đổi sau 2026-10-20.
- Chưa xác minh model parity giữa fal và Replicate; cùng display name không bảo đảm cùng version/schema/output.
- Chưa xác minh provider-specific negative prompt fields cho từng endpoint; đặc tả chủ động dùng capability flag `unknown` cho tới preflight.
- Chưa xác minh signature mechanism của Replicate cho cấu hình dùng; thiết kế yêu cầu GET-back verification nếu authenticity không được provider bảo đảm.

