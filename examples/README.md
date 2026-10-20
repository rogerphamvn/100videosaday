# Synthetic contract examples

All AERIS files in this directory are fixtures for schema and semantic testing. AERIS is a fictional demo product and is not a user SKU. Asset locators use `r2://demo/` or the reserved `.invalid` domain. Repeated-digit SHA-256 strings are illustrative placeholders with `hashStatus: illustrative_fixture`; they do not claim that bytes were fetched or hashed.

The `modelFamily` values demonstrate the author allowlist required by the product brief. `verificationStatus: synthetic_fixture` and `invocationRef: demo:no-actual-model-call` explicitly state that no Claude Opus 5.5 or GPT-6.1 Sol invocation produced these examples. Production records must carry `actual_invocation_verified`, a real invocation/request reference, and byte-verified evidence hashes.

The files under `invalid/` are mutation descriptors. The validator applies each mutation to its named valid base document and proves that the schema or semantic gate fails for the expected reason.
