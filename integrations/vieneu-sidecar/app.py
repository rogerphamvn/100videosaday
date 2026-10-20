"""Authenticated VieNeu-TTS v3 Turbo preset-voice sidecar.

The model loads once during FastAPI startup. This service intentionally has no
voice-cloning endpoint. Generated WAV files stay inside VIENEU_OUTPUT_DIR in a
bounded content-addressed cache.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import importlib.metadata
import os
import tempfile
import time
import weakref
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from huggingface_hub import snapshot_download
from pydantic import BaseModel, ConfigDict, Field

MODEL_REPO = "pnnbao-ump/VieNeu-TTS-v3-Turbo"
DEFAULT_MODEL_REVISION = "61b85e3d937fbbacb387714180e8182823512523"
MAX_TEXT_CHARACTERS = 4_000
CLIENT_RECIPE_VERSION = "vieneu-client/1.0"
TEMPERATURE = 0.8
TOP_K = 25
TOP_P = 0.95
REPETITION_PENALTY = 1.2


class SpeechRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model: str = "vieneu-v3-turbo"
    input: str = Field(min_length=1, max_length=MAX_TEXT_CHARACTERS)
    voice: str = Field(min_length=1, max_length=64)
    response_format: str = "wav"
    stream_format: str = "audio"
    project_id: str = Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$")
    script_hash: str = Field(pattern=r"^[a-f0-9]{64}$")


class Runtime:
    engine = None
    model_revision = ""
    voices: set[str] = set()
    semaphore: asyncio.Semaphore | None = None
    output_dir = Path("outputs")
    locks: weakref.WeakValueDictionary[str, asyncio.Lock] = weakref.WeakValueDictionary()


runtime = Runtime()


def _integer_env(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError:
        value = default
    return min(maximum, max(minimum, value))


def _required_api_key() -> str:
    key = os.environ.get("VIENEU_API_KEY", "")
    if len(key) < 16:
        raise RuntimeError("VIENEU_API_KEY must contain at least 16 characters")
    return key


def _authorise(authorization: Annotated[str | None, Header()] = None) -> None:
    expected = f"Bearer {_required_api_key()}"
    if not hmac.compare_digest(authorization or "", expected):
        raise HTTPException(status_code=401, detail="invalid api key")


def _safe_unlink(path: Path) -> None:
    try:
        resolved = path.resolve(strict=False)
        if resolved.parent == runtime.output_dir.resolve(strict=True):
            resolved.unlink(missing_ok=True)
    except OSError:
        pass


def _prune_cache(ttl_seconds: int, max_files: int) -> None:
    now = time.time()
    files = []
    for path in runtime.output_dir.glob("*.wav"):
        try:
            resolved = path.resolve(strict=True)
            if resolved.parent != runtime.output_dir:
                continue
            stat = resolved.stat()
            if stat.st_mtime < now - ttl_seconds:
                resolved.unlink(missing_ok=True)
            else:
                files.append((stat.st_mtime, resolved))
        except OSError:
            continue
    for _, path in sorted(files, reverse=True)[max_files:]:
        _safe_unlink(path)


def _load_engine() -> None:
    from vieneu import Vieneu

    revision = os.environ.get("VIENEU_MODEL_REVISION", DEFAULT_MODEL_REVISION)
    if len(revision) != 40 or any(char not in "0123456789abcdef" for char in revision):
        raise RuntimeError("VIENEU_MODEL_REVISION must be an exact 40-character commit")
    backend = os.environ.get("VIENEU_BACKEND", "onnx")
    precision = os.environ.get("VIENEU_PRECISION", "fp32")
    onnx_subfolder = "onnx_int8" if precision == "int8" else "onnx_update"
    allow_patterns = [f"{onnx_subfolder}/*", "voices_v3_turbo.json", "denoiser.onnx", "speaker_encoder.onnx", "config.json"] \
        if backend == "onnx" else ["update/*", "voices_v3_turbo.json", "config.json"]
    model_dir = snapshot_download(
        repo_id=MODEL_REPO,
        revision=revision,
        allow_patterns=allow_patterns,
        local_files_only=os.environ.get("HF_HUB_OFFLINE") == "1",
    )
    runtime.engine = Vieneu(
        mode="v3turbo",
        backbone_repo=model_dir,
        backend=backend,
        precision=precision,
        onnx_dir=str(Path(model_dir) / onnx_subfolder) if backend == "onnx" else None,
        max_streams=_integer_env("VIENEU_MAX_CONCURRENCY", 1, 1, 32),
    )
    runtime.model_revision = revision
    runtime.voices = {voice_id for _, voice_id in runtime.engine.list_preset_voices()}


@asynccontextmanager
async def lifespan(_: FastAPI):
    _required_api_key()
    runtime.output_dir = Path(os.environ.get("VIENEU_OUTPUT_DIR", "./outputs")).resolve()
    runtime.output_dir.mkdir(parents=True, exist_ok=True)
    runtime.semaphore = asyncio.Semaphore(_integer_env("VIENEU_MAX_CONCURRENCY", 1, 1, 32))
    await asyncio.to_thread(_load_engine)
    yield
    if runtime.engine is not None and hasattr(runtime.engine, "close"):
        await asyncio.to_thread(runtime.engine.close)


app = FastAPI(title="100videosaday VieNeu voice bridge", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ready" if runtime.engine is not None else "starting",
        "provider": "vieneu-v3-turbo",
        "modelRevision": runtime.model_revision or None,
        "voices": len(runtime.voices),
        "cloningEnabled": False,
    }


@app.get("/v1/voices", dependencies=[Depends(_authorise)])
async def voices() -> dict:
    return {"data": sorted(runtime.voices), "modelRevision": runtime.model_revision}


@app.post("/v1/audio/speech", dependencies=[Depends(_authorise)])
async def speech(request: SpeechRequest):
    if request.model != "vieneu-v3-turbo" or request.response_format != "wav" or request.stream_format != "audio":
        raise HTTPException(status_code=400, detail="only vieneu-v3-turbo WAV audio is supported")
    if request.voice not in runtime.voices:
        raise HTTPException(status_code=400, detail="unknown preset voice")
    expected_hash = hashlib.sha256(
        f"{CLIENT_RECIPE_VERSION}\0{runtime.model_revision}\0{request.voice}\0{request.input.strip()}".encode("utf-8")
    ).hexdigest()
    if not hmac.compare_digest(request.script_hash, expected_hash):
        raise HTTPException(status_code=400, detail="script hash mismatch")
    if runtime.engine is None or runtime.semaphore is None:
        raise HTTPException(status_code=503, detail="voice engine is not ready")
    cache_ttl = _integer_env("VIENEU_CACHE_TTL_SECONDS", 604_800, 3_600, 2_592_000)
    cache_max_files = _integer_env("VIENEU_CACHE_MAX_FILES", 2_000, 100, 20_000)
    backend = os.environ.get("VIENEU_BACKEND", "onnx")
    precision = os.environ.get("VIENEU_PRECISION", "fp32")
    sdk_version = importlib.metadata.version("vieneu")
    render_hash = hashlib.sha256(
        (f"{CLIENT_RECIPE_VERSION}\0{sdk_version}\0{runtime.model_revision}\0{backend}\0{precision}"
         f"\0{request.voice}\0{request.input.strip()}\0{TEMPERATURE}\0{TOP_K}\0{TOP_P}\0{REPETITION_PENALTY}").encode("utf-8")
    ).hexdigest()
    output_path = (runtime.output_dir / f"{render_hash}.wav").resolve()
    if output_path.parent != runtime.output_dir:
        raise HTTPException(status_code=500, detail="unsafe output path")
    cache_hit = output_path.is_file() and output_path.stat().st_size >= 44 \
        and output_path.stat().st_mtime >= time.time() - cache_ttl
    lock = runtime.locks.setdefault(request.script_hash, asyncio.Lock())
    async with lock:
        cache_hit = output_path.is_file() and output_path.stat().st_size >= 44 \
            and output_path.stat().st_mtime >= time.time() - cache_ttl
        if not cache_hit:
            fd, raw_path = tempfile.mkstemp(prefix="voice-", suffix=".wav", dir=runtime.output_dir)
            os.close(fd)
            temp_path = Path(raw_path).resolve()
            if temp_path.parent != runtime.output_dir:
                _safe_unlink(temp_path)
                raise HTTPException(status_code=500, detail="unsafe output path")
            try:
                async with runtime.semaphore:
                    audio = await asyncio.to_thread(
                        runtime.engine.infer,
                        request.input.strip(),
                        voice=request.voice,
                        temperature=TEMPERATURE,
                        top_k=TOP_K,
                        top_p=TOP_P,
                        repetition_penalty=REPETITION_PENALTY,
                    )
                    await asyncio.to_thread(runtime.engine.save, audio, str(temp_path))
                os.replace(temp_path, output_path)
                await asyncio.to_thread(_prune_cache, cache_ttl, cache_max_files)
            except Exception as error:
                _safe_unlink(temp_path)
                raise HTTPException(status_code=500, detail="speech synthesis failed") from error

    return FileResponse(
        output_path,
        media_type="audio/wav",
        filename=f"{render_hash}.wav",
        headers={
            "Cache-Control": f"private, max-age={cache_ttl}",
            "X-Script-Hash": request.script_hash,
            "X-Render-Hash": render_hash,
            "X-Model-Revision": runtime.model_revision,
            "X-Cache": "HIT" if cache_hit else "MISS",
        },
    )
