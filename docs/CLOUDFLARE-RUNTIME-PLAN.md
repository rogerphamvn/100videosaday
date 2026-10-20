# Cloudflare processing runtime proposal

Status: proposed, not provisioned. Checked 2026-10-20. Owner confirms existing $5/month plan; account entitlement not independently inspected. Existing Workers UI deployment does not imply these processors exist.

## Current owner budget decision

Owner rejected the proposed $10 trial ceiling and requested a $5 limit, with remaining processing via APIs. Conservatively interpret this as $5 total Cloudflare per month including the existing subscription. **Do not provision Containers or run the proposed paid pilot.** Keep research/voice/render services unavailable until their endpoints and pricing are established. External API charges are separate and are not included or automatically authorized by this document.

Cloudflare budget alerts notify; they do not stop or cap usage. Therefore neither an alert nor this proposal guarantees an account invoice at most $5. Current account-wide usage has not been inspected. Other Workers, D1, storage and request/CPU overages can also count. An application admission budget can limit its own jobs but cannot cap unrelated account usage or all incoming-request overhead.

For 100 videos/day over 30 days, a unique voice track per video means 1,500 audio minutes at 30 seconds, 2,250 at 45 seconds, or 3,000 at 60 seconds. Reuse can reduce synthesis; retries can increase it. If a voice API charges P per generated minute, monthly voice cost is generated minutes × P. If it charges by characters, use actual normalized script characters instead. No reliable exact API invoice can be quoted before choosing an endpoint, current tariff, usage and retry policy.

## Architecture

- Workers: authenticated UI/API, admission checks and dispatch.
- D1: projects, batches, job state, evidence and idempotency.
- Queues + Durable Objects: bounded concurrency, retries, leases, deduplication and per-project limits. These are still to implement.
- R2: source assets, WAVs, intermediate clips and verified exports; local container disk is disposable.
- Browser Run: browser sessions for a Jev-compatible research executor. Existing Jev bridge contract needs a concrete adapter; Jev is not a ready-made hosted search API.
- Containers: candidate CPU runtime for VieNeu ONNX and FFmpeg assembly. Separate workloads to prevent rendering starving speech. Start one voice instance, one stream, benchmark before scaling.
- Image/video generation: external model APIs remain separate, with their own credits and rate limits.

24/7 service availability means queued work can wake processors; it does not require paying for idle containers all day. Cold start/model loading, retries, and interrupted jobs need measurement and durable recovery. No public GPU configuration is established by the cited instance table; CPU suitability for this model remains unverified.

## Illustrative cost, not a quote or throughput benchmark

Candidate voice instance: standard-2, 1 vCPU, 6 GiB RAM, 12 GB disk. Capacity fit must be tested. Pricing at source: memory $0.009/GiB-hour, active CPU $0.072/vCPU-hour, disk $0.000252/GB-hour. Included monthly allowance: 25 GiB-hours, 6.25 vCPU-hours, 200 GB-hours. Allowances shared with other account workloads.

For 30 days, assuming a full active CPU throughout each awake period and all included allowances available:

| Scenario | Awake hours/month | CPU + RAM + disk after allowance | Workers base | Subtotal |
|---|---:|---:|---:|---:|
| 2 hours/day | 60 | $7.02 | $5 | $12.02 |
| 8 hours/day | 240 | $30.24 | $5 | $35.24 |
| Always awake | 720 | $92.17 | $5 | $97.17 |

These figures exclude additional FFmpeg containers, Browser Run, R2, D1, Queues, Durable Objects, logs, excess egress, taxes and external AI generation. They do not imply 2 or 8 hours will produce 100 videos. CPU billing follows active use; memory/disk follow provisioned resources while awake.

Browser Run Paid includes 10 browser-hours/month, then $0.09/hour. Sessions include 10 monthly-average concurrent browsers, then $2 per extra average browser. Example: 60 browser-hours with concurrency within allowance adds $4.50. This does not include an LLM for research synthesis.

## Concrete pilot before production

1. Verify owner account plan and available Docker/build environment; approve any paid-plan activation before provisioning.
2. Build sidecar, freeze model and transitive codec cache, record image digest and licenses.
3. Deploy authenticated voice service, one instance, one stream, scale-to-zero; no public unauthenticated inference.
4. Synthesize a small fixed Vietnamese evaluation set, listen and measure cold/warm latency, memory, failures and cost. Do not download arbitrary voice samples or enable cloning.
5. Build and validate Browser Run research bridge, with source evidence, caching, host pacing and bounded navigation.
6. Add durable queue/executor and R2 outputs; test retries, duplicate delivery, timeout and budget admission.
7. Connect image/video providers only when configured. Follow `100-VIDEOS-BENCHMARK.md` for an actual 100 accepted exports/day trial.

The earlier $10 trial proposal was a ceiling, not a measured cost estimate, and is withdrawn. The illustrative table above explains why always-on CPU processing is unsuitable for the current budget; it does not authorize any processing spend.

## Official sources

- https://developers.cloudflare.com/containers/platform/pricing/
- https://developers.cloudflare.com/containers/platform/limits/
- https://developers.cloudflare.com/containers/get-started/
- https://developers.cloudflare.com/browser-run/pricing/
- https://developers.cloudflare.com/browser-run/faq/
- https://developers.cloudflare.com/billing/manage/budget-alerts/
