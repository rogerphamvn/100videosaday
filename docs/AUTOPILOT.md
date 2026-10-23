# Automatic creative run

The default workflow prepares one image or one 15-second video segment. It does not schedule recurring content production. The advanced canvas remains available for manual operations.

## Execution contract

- `GET /api/autopilot/readiness?projectId=…` reports project sources, model roles, missing configuration, scheduler state and an existing active run.
- `POST /api/autopilot/plan` prepares a short-lived plan without paid inference. Input includes project, goal, output, creative priority, total budget and media allocation. The response exposes the exact model and any proposed persistent project media-budget change.
- `POST /api/autopilot/start` requires the plan's confirmation ID and an idempotency key. A confirmed run is stored in D1 before background processing.
- `GET /api/autopilot/runs/:id` returns durable progress and the run's aggregate accounting.
- `POST /api/autopilot/runs/:id/cancel` stops future steps. A submitted provider operation cannot be recalled; unresolved billing retains its reservation.

These routes require the existing authenticated session and same-origin write protection. Keys and credential fingerprints are not public plan fields.

## Background processing

The Worker has a minute Cron Trigger. Each invocation advances a bounded step under a D1 lease. The database is the source of truth, so browser polling is only presentation. A recent scheduler heartbeat is required before starting. Deployment and Cron propagation do not prove a paid run succeeded.

Sources, model settings and credential identity are frozen for a confirmed plan. A relevant change stops progression instead of silently substituting inputs. Unknown outcomes of paid requests are held for reconciliation; safe status polling is bounded and does not resubmit generation.

## Accounting and limits

The maximum automatic-run cap is USD 2 for AI plus media together. Existing pilot/provider-account controls still apply. Media allowance is part of the confirmed plan. Application reservations are estimates and accounting controls, not a guarantee of provider-side billing enforcement. An actual-cost overrun stops further work and requires reconciliation.

Creative priority is guidance for the prompts, not automatic model routing. Only supported reference-preserving media adapters are eligible. Long-video assembly, voice/motion completion and 100 finished videos per day remain separate, unverified capabilities.

## Deployment and validation

Apply migrations through `0009_autopilot.sql`, deploy the Worker and assets, and verify the configured Cron Trigger and a fresh heartbeat. Keep general AI disabled; the existing bounded pilot and media execution flags plus `WORKFLOW_AUTOPILOT_ENABLED` control this flow.

Run the repository checks, including `scripts/test-autopilot.mjs`, and inspect the simple workspace in a browser. Local fixtures and mocked provider transitions must be reported separately from any paid production run.
