#!/usr/bin/env python3
"""Validate Creative Hook Lab JSON contracts, examples, and negative fixtures."""

from __future__ import annotations

import copy
import hashlib
import json
import platform
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError:  # no package installation is performed by this script
    jsonschema = None


ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "contracts"
EXAMPLES = ROOT / "examples"
REPORT = ROOT / "evidence" / "contracts-verification.json"
MEGA_SCHEMA_PATH = CONTRACTS / "mega-prompt.schema.json"
NEG_SCHEMA_PATH = CONTRACTS / "negative-prompt.schema.json"
MEGA_EXAMPLES = [EXAMPLES / "image-mega-prompt.demo.json", EXAMPLES / "video-mega-prompt.demo.json"]
PAIR_PATHS = [
    (EXAMPLES / "image-mega-prompt.demo.json", EXAMPLES / "image-negative-prompt.demo.json"),
    (EXAMPLES / "video-mega-prompt.demo.json", EXAMPLES / "video-negative-prompt.demo.json"),
]
FIXTURES = sorted((EXAMPLES / "invalid").glob("*.fixture.json"))
EPSILON = 1e-9


class SemanticError(ValueError):
    pass


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _type_matches(value: Any, expected: str) -> bool:
    return {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool),
        "boolean": isinstance(value, bool),
        "null": value is None,
    }[expected]


def _resolve_ref(root_schema: dict[str, Any], reference: str) -> dict[str, Any]:
    if not reference.startswith("#/"):
        raise ValueError(f"fallback validator only supports local refs, got {reference}")
    node: Any = root_schema
    for token in reference[2:].split("/"):
        node = node[token.replace("~1", "/").replace("~0", "~")]
    return node


def fallback_schema_errors(instance: Any, schema: dict[str, Any], root_schema: dict[str, Any], path: str = "") -> list[str]:
    """Small dependency-free validator for the exact keywords used by these contracts.

    This is not advertised as a general Draft 2020-12 implementation. CI should use
    python-jsonschema when available; the receipt identifies which engine ran.
    """
    errors: list[str] = []
    pointer = path or "/"
    if "$ref" in schema:
        return fallback_schema_errors(instance, _resolve_ref(root_schema, schema["$ref"]), root_schema, path)
    if "type" in schema and not _type_matches(instance, schema["type"]):
        return [f"{pointer}: expected type {schema['type']}"]
    if "const" in schema and instance != schema["const"]:
        errors.append(f"{pointer}: value must equal {schema['const']!r}")
    if "enum" in schema and instance not in schema["enum"]:
        errors.append(f"{pointer}: value {instance!r} is not in enum")
    if isinstance(instance, str):
        if len(instance) < schema.get("minLength", 0):
            errors.append(f"{pointer}: string shorter than minLength")
        if "maxLength" in schema and len(instance) > schema["maxLength"]:
            errors.append(f"{pointer}: string longer than maxLength")
        if "pattern" in schema and not re.search(schema["pattern"], instance):
            errors.append(f"{pointer}: string does not match pattern")
        if schema.get("format") == "date-time":
            try:
                datetime.fromisoformat(instance.replace("Z", "+00:00"))
            except ValueError:
                errors.append(f"{pointer}: invalid date-time")
    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in schema and instance < schema["minimum"]:
            errors.append(f"{pointer}: value below minimum")
        if "maximum" in schema and instance > schema["maximum"]:
            errors.append(f"{pointer}: value above maximum")
        if "exclusiveMinimum" in schema and instance <= schema["exclusiveMinimum"]:
            errors.append(f"{pointer}: value not above exclusiveMinimum")
    if isinstance(instance, list):
        if len(instance) < schema.get("minItems", 0):
            errors.append(f"{pointer}: array shorter than minItems")
        if schema.get("uniqueItems"):
            frozen = [json.dumps(item, sort_keys=True, ensure_ascii=False) for item in instance]
            if len(frozen) != len(set(frozen)):
                errors.append(f"{pointer}: array items are not unique")
        if "items" in schema:
            for index, item in enumerate(instance):
                errors.extend(fallback_schema_errors(item, schema["items"], root_schema, f"{path}/{index}"))
    if isinstance(instance, dict):
        for key in schema.get("required", []):
            if key not in instance:
                errors.append(f"{pointer}: required property {key} is missing")
        properties = schema.get("properties", {})
        for key, value in instance.items():
            if key in properties:
                errors.extend(fallback_schema_errors(value, properties[key], root_schema, f"{path}/{key}"))
            elif schema.get("additionalProperties") is False:
                errors.append(f"{path}/{key}: additional property is not allowed")
    if "oneOf" in schema:
        branch_results = [fallback_schema_errors(instance, branch, root_schema, path) for branch in schema["oneOf"]]
        if sum(not result for result in branch_results) != 1:
            errors.append(f"{pointer}: expected exactly one matching oneOf branch")
    for branch in schema.get("allOf", []):
        errors.extend(fallback_schema_errors(instance, branch, root_schema, path))
    if "if" in schema:
        condition_matches = not fallback_schema_errors(instance, schema["if"], root_schema, path)
        if condition_matches and "then" in schema:
            errors.extend(fallback_schema_errors(instance, schema["then"], root_schema, path))
        if not condition_matches and "else" in schema:
            errors.extend(fallback_schema_errors(instance, schema["else"], root_schema, path))
    if "not" in schema and not fallback_schema_errors(instance, schema["not"], root_schema, path):
        errors.append(f"{pointer}: instance matches forbidden not schema")
    return errors


def schema_errors(instance: dict[str, Any], schema: dict[str, Any]) -> list[str]:
    if jsonschema is None:
        return fallback_schema_errors(instance, schema, schema)
    validator = jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
    errors = sorted(validator.iter_errors(instance), key=lambda error: list(error.absolute_path))
    rendered: list[str] = []
    for error in errors:
        pointer = "/" + "/".join(str(part) for part in error.absolute_path)
        rendered.append(f"{pointer}: {error.message}")
    return rendered


def ensure_unique(values: list[str], label: str) -> None:
    if len(values) != len(set(values)):
        raise SemanticError(f"duplicate {label}")


def semantic_mega(doc: dict[str, Any]) -> None:
    evidence = {item["evidenceId"]: item for item in doc["sourceEvidence"]}
    claims = {item["claimId"]: item for item in doc["approvedClaims"]}
    ensure_unique([item["evidenceId"] for item in doc["sourceEvidence"]], "evidenceId")
    ensure_unique([item["claimId"] for item in doc["approvedClaims"]], "claimId")

    def evidence_refs_resolve(refs: list[str], location: str) -> None:
        missing = sorted(set(refs) - set(evidence))
        if missing:
            raise SemanticError(f"{location}: unresolved evidence ref {missing[0]}")

    for claim in doc["approvedClaims"]:
        evidence_refs_resolve(claim["evidenceRefs"], f"claim {claim['claimId']}")

    for key in ("audience", "motivator", "painPoint", "useCase", "trend"):
        hypothesis = doc["strategy"].get(key)
        if not hypothesis:
            continue
        evidence_refs_resolve(hypothesis["evidenceRefs"], f"strategy.{key}")
        if hypothesis["status"] in {"observed", "supported_hypothesis"} and not hypothesis["evidenceRefs"]:
            raise SemanticError(f"strategy.{key}: supported statement requires evidence")
        if hypothesis["status"] == "untested_hypothesis" and not hypothesis.get("testMethod"):
            raise SemanticError(f"strategy.{key}: untested hypothesis requires testMethod")

    missing_claims = sorted(set(doc["strategy"]["hook"]["claimRefs"]) - set(claims))
    if missing_claims:
        raise SemanticError(f"hook: unresolved claim ref {missing_claims[0]}")

    for reference in doc["productLock"]["references"]:
        evidence_refs_resolve([reference["evidenceRef"]], f"reference {reference['referenceId']}")
        item = evidence[reference["evidenceRef"]]
        if reference["role"] in {"product_identity", "packaging_identity", "logo_identity"}:
            if not item["productEvidence"] or item["reviewStatus"] != "approved":
                raise SemanticError(f"reference {reference['referenceId']}: exact identity requires approved product evidence")
            if reference["fidelity"] == "inspiration_only":
                raise SemanticError(f"reference {reference['referenceId']}: identity role cannot be inspiration_only")
        if not item["productEvidence"] and reference["fidelity"] != "inspiration_only":
            raise SemanticError(f"reference {reference['referenceId']}: non-product evidence must be inspiration_only")

    fixture_status = doc["authorship"]["verificationStatus"] == "synthetic_fixture"
    if fixture_status:
        if not doc["productLock"]["syntheticDemo"]:
            raise SemanticError("synthetic fixture must set productLock.syntheticDemo=true")
        if doc["authorship"]["invocationRef"] != "demo:no-actual-model-call":
            raise SemanticError("synthetic fixture must use demo:no-actual-model-call")
        if any(item["hashStatus"] != "illustrative_fixture" for item in doc["sourceEvidence"]):
            raise SemanticError("synthetic fixture evidence hashes must be illustrative_fixture")
    else:
        if doc["authorship"]["invocationRef"].startswith("demo:"):
            raise SemanticError("verified authorship requires a non-demo invocationRef")
        identity_refs = {ref["evidenceRef"] for ref in doc["productLock"]["references"] if ref["role"] in {"product_identity", "packaging_identity", "logo_identity"}}
        for ref in identity_refs:
            if evidence[ref]["hashStatus"] != "verified_bytes":
                raise SemanticError(f"production identity evidence {ref} must have verified_bytes hash")

    ratio_values = {"1:1": 1, "4:5": 4 / 5, "9:16": 9 / 16, "16:9": 16 / 9}
    output = doc["output"]
    actual_ratio = output["widthPx"] / output["heightPx"]
    if abs(actual_ratio - ratio_values[output["aspectRatio"]]) > 0.002:
        raise SemanticError("output pixel dimensions do not match aspectRatio")

    creative = doc["creative"]
    if creative["kind"] != doc["mediaType"]:
        raise SemanticError("creative.kind does not match mediaType")
    overlays = creative.get("textOverlays", [])
    if creative["kind"] == "video":
        overlays = [overlay for shot in creative["shots"] for overlay in shot.get("textOverlays", [])]
    for overlay in overlays:
        if overlay["claimRef"] not in claims:
            raise SemanticError(f"overlay: unresolved claim ref {overlay['claimRef']}")
        claim = claims[overlay["claimRef"]]
        if overlay["exactText"] != claim["exactText"]:
            raise SemanticError(f"overlay text differs from approved claim {overlay['claimRef']}")
        if claim.get("allowedContexts") and "overlay" not in claim["allowedContexts"]:
            raise SemanticError(f"claim {overlay['claimRef']} is not approved for overlay")

    if creative["kind"] == "video":
        shots = creative["shots"]
        ensure_unique([shot["shotId"] for shot in shots], "shotId")
        if abs(shots[0]["startS"]) > EPSILON:
            raise SemanticError("video timeline must begin at 0")
        previous_end = 0.0
        for shot in shots:
            if shot["endS"] <= shot["startS"]:
                raise SemanticError(f"shot {shot['shotId']}: endS must be greater than startS")
            if abs(shot["startS"] - previous_end) > EPSILON:
                raise SemanticError(f"shot {shot['shotId']}: timeline gap or overlap")
            previous_end = shot["endS"]
        if abs(previous_end - creative["durationS"]) > EPSILON:
            raise SemanticError("video timeline end does not equal durationS")


def semantic_pair(mega: dict[str, Any], negative: dict[str, Any]) -> None:
    if negative["megaPromptId"] != mega["promptId"]:
        raise SemanticError("negative megaPromptId does not match promptId")
    if negative["megaPromptRevision"] != mega["revision"]:
        raise SemanticError("negative megaPromptRevision does not match mega revision")
    if negative["mediaType"] != mega["mediaType"]:
        raise SemanticError("negative mediaType does not match mega mediaType")
    if negative["provenance"]["projectId"] != mega["provenance"]["projectId"]:
        raise SemanticError("negative provenance projectId does not match mega provenance")
    if negative["provenance"]["sourceSnapshotId"] != mega["provenance"]["sourceSnapshotId"]:
        raise SemanticError("negative provenance sourceSnapshotId does not match mega provenance")
    if negative["authorship"]["verificationStatus"] == "synthetic_fixture":
        if negative["authorship"]["invocationRef"] != "demo:no-actual-model-call":
            raise SemanticError("synthetic negative fixture must use demo:no-actual-model-call")
    elif negative["authorship"]["invocationRef"].startswith("demo:"):
        raise SemanticError("verified negative authorship requires a non-demo invocationRef")
    ensure_unique([item["constraintId"] for item in negative["constraints"]], "constraintId")
    required = {"product_geometry", "packaging", "logo", "text", "physics", "unsupported_claim"}
    if mega["mediaType"] == "video":
        required |= {"continuity", "audio"}
    categories = {item["category"] for item in negative["constraints"]}
    missing = sorted(required - categories)
    if missing:
        raise SemanticError(f"negative prompt missing category {missing[0]}")
    shot_ids = {shot["shotId"] for shot in mega["creative"].get("shots", [])}
    for constraint in negative["constraints"]:
        scope = constraint["scope"]
        if scope["type"] == "shot":
            if mega["mediaType"] != "video":
                raise SemanticError(f"constraint {constraint['constraintId']}: shot scope used for image")
            unresolved = sorted(set(scope["shotRefs"]) - shot_ids)
            if unresolved:
                raise SemanticError(f"constraint {constraint['constraintId']}: unresolved shot ref {unresolved[0]}")
        if constraint["severity"] == "must_not" and negative["policy"]["unsupportedHandling"] == "omit_and_report":
            raise SemanticError("must_not constraints cannot use omit_and_report")


def decode_pointer_token(token: str) -> str:
    return token.replace("~1", "/").replace("~0", "~")


def apply_mutation(document: dict[str, Any], mutation: dict[str, Any]) -> None:
    tokens = [decode_pointer_token(token) for token in mutation["path"].strip("/").split("/") if token]
    if not tokens:
        raise ValueError("root mutations are not supported")
    target: Any = document
    for token in tokens[:-1]:
        target = target[int(token)] if isinstance(target, list) else target[token]
    final = tokens[-1]
    key: Any = int(final) if isinstance(target, list) else final
    if mutation["op"] == "remove":
        target.pop(key) if isinstance(target, list) else target.pop(key)
    elif mutation["op"] == "replace":
        target[key] = mutation["value"]
    else:
        raise ValueError(f"unsupported fixture mutation op {mutation['op']}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    mega_schema = load_json(MEGA_SCHEMA_PATH)
    negative_schema = load_json(NEG_SCHEMA_PATH)
    if mega_schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema" or negative_schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        raise SystemExit("ERROR: unsupported schema version")
    if jsonschema is not None:
        jsonschema.Draft202012Validator.check_schema(mega_schema)
        jsonschema.Draft202012Validator.check_schema(negative_schema)
    tests: list[dict[str, Any]] = []
    failures: list[str] = []

    for mega_path, negative_path in PAIR_PATHS:
        mega = load_json(mega_path)
        negative = load_json(negative_path)
        errors = schema_errors(mega, mega_schema) + schema_errors(negative, negative_schema)
        try:
            if not errors:
                semantic_mega(mega)
                semantic_pair(mega, negative)
        except SemanticError as exc:
            errors.append(str(exc))
        passed = not errors
        test = {"name": f"positive:{mega_path.stem}+{negative_path.stem}", "expected": "pass", "actual": "pass" if passed else "fail", "passed": passed, "errors": errors}
        tests.append(test)
        if not passed:
            failures.append(test["name"])

    for fixture_path in FIXTURES:
        fixture = load_json(fixture_path)
        base_path = (fixture_path.parent / fixture["base"]).resolve()
        document = copy.deepcopy(load_json(base_path))
        for mutation in fixture["mutations"]:
            apply_mutation(document, mutation)
        is_mega = document.get("schemaVersion", "").startswith("creative-hook-lab.mega-prompt/")
        schema = mega_schema if is_mega else negative_schema
        schema_messages = schema_errors(document, schema)
        semantic_messages: list[str] = []
        if not schema_messages:
            try:
                if is_mega:
                    semantic_mega(document)
                elif "pairBase" in fixture:
                    paired_mega = load_json((fixture_path.parent / fixture["pairBase"]).resolve())
                    paired_schema_messages = schema_errors(paired_mega, mega_schema)
                    if paired_schema_messages:
                        raise SemanticError("pairBase does not pass mega schema")
                    semantic_mega(paired_mega)
                    semantic_pair(paired_mega, document)
            except SemanticError as exc:
                semantic_messages.append(str(exc))
        actual_class = "schema" if schema_messages else "semantic" if semantic_messages else "none"
        all_messages = schema_messages + semantic_messages
        expectation = fixture["expect"]
        contains = expectation["contains"]
        passed = actual_class == expectation["errorClass"] and any(contains in message for message in all_messages)
        test = {"name": f"negative:{fixture_path.stem}", "expected": f"fail:{expectation['errorClass']}", "actual": f"fail:{actual_class}" if all_messages else "pass", "passed": passed, "errors": all_messages}
        tests.append(test)
        if not passed:
            failures.append(test["name"])

    tracked = [MEGA_SCHEMA_PATH, NEG_SCHEMA_PATH, CONTRACTS / "README.md", EXAMPLES / "README.md", *[path for pair in PAIR_PATHS for path in pair], *FIXTURES, Path(__file__).resolve()]
    hashes = {str(path.relative_to(ROOT)).replace("\\", "/"): f"sha256:{sha256(path)}" for path in sorted(set(tracked))}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    result = {
        "reportVersion": "creative-hook-lab.contract-verification/1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "validator": {
            "python": platform.python_version(),
            "engine": "python-jsonschema" if jsonschema is not None else "contract-keyword-fallback",
            "jsonschema": getattr(jsonschema, "__version__", None),
            "draft": "2020-12",
            "fallbackScope": None if jsonschema is not None else "Only the JSON Schema keywords present in these two contracts; use python-jsonschema in CI for independent meta-schema validation."
        },
        "summary": {"total": len(tests), "passed": sum(test["passed"] for test in tests), "failed": len(failures)},
        "tests": tests,
        "artifactHashes": hashes,
        "limitations": [
            "Schema and semantic validation do not prove visual fidelity of generated media.",
            "Demo evidence hashes and authorship are explicitly illustrative fixtures, not actual asset or model-call evidence.",
            "Provider adapters and provider capabilities are outside this validation scope."
        ],
        "verdict": "PASS" if not failures else "FAIL"
    }
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"contracts={len(PAIR_PATHS) * 2} fixtures={len(FIXTURES)} tests={len(tests)} passed={result['summary']['passed']} failed={result['summary']['failed']}")
    print(f"report={REPORT}")
    if failures:
        print("failed_tests=" + ",".join(failures))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
