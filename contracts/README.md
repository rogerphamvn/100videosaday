# Creative Hook Lab prompt contracts

These Draft 2020-12 schemas are the internal source-of-truth contract. They are not provider request bodies.

The provider adapter must validate the source contract, compile an allowlisted subset into the provider's documented fields, and write a compilation record containing source prompt ID/revision/hash, adapter version, provider/model ID, emitted field names, and every omitted or transformed constraint. It must never forward this JSON object wholesale or use arbitrary keys as provider parameters. A negative prompt binds to both `megaPromptId` and `megaPromptRevision`; changing the MEGA PROMPT revision requires a reviewed negative-prompt revision or regeneration.

When a provider has no negative-prompt channel, the adapter follows `policy.unsupportedHandling`: fold the constraint into the positive instruction, omit it and report the omission, or fail closed. No adapter may silently drop a `must_not` constraint. The schemas deliberately contain no endpoint names, credentials, provider model versions, sampler names, or undocumented tuning parameters.

Evidence locators are references, not proof by themselves. Runtime ingestion must hash bytes, assign review status, and prevent `app_screenshot` or `creative_reference` records marked `productEvidence: false` from becoming an exact product identity reference. The semantic validator in `scripts/validate-contracts.py` enforces the cross-object rules that JSON Schema cannot express reliably.
