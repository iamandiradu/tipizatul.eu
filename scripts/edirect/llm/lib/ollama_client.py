"""Minimal Ollama HTTP client for vision-LLM inference.

Hits the local /api/generate endpoint. Designed to be dependency-light:
uses urllib from the stdlib so we don't pull in extra packages beyond
what paddle/.venv already provides.
"""

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request
from dataclasses import dataclass


# Per-page generation is the slowest step. With Metal enabled (Ollama
# 0.24+ on M1), the 3B model runs ~15–20 s/page. Without Metal — older
# Ollama, or model not yet Metal-compiled — the same call drops to
# CPU-only and can take 3–5 minutes per page. Default budget is 10 min
# so the slow path can complete; bump higher via the `timeout` arg if
# you're processing very dense or multi-page PDFs on CPU.
_DEFAULT_TIMEOUT_S = 600


class OllamaError(RuntimeError):
    pass


@dataclass
class OllamaResponse:
    text: str
    model: str
    elapsed_s: float


def png_to_b64(png_bytes: bytes) -> str:
    return base64.b64encode(png_bytes).decode('ascii')


def generate_json(
    prompt: str,
    image_b64: str | None = None,
    *,
    model: str,
    host: str = 'http://localhost:11434',
    temperature: float = 0.1,
    timeout: float = _DEFAULT_TIMEOUT_S,
    num_ctx: int = 32768,
) -> OllamaResponse:
    """Call Ollama /api/generate with optional vision input + JSON output mode.

    Pass `image_b64` for vision models; omit for text-only models. The
    `format='json'` flag constrains decoding to JSON syntax only — the
    model still has to produce sensible content.

    `num_ctx` is critical: Ollama's default is 4096 tokens, but our
    structured-input prompts run 4k–12k tokens for a single dense form
    page. If the prompt exceeds num_ctx Ollama silently truncates,
    leaving the model to hallucinate JSON from a chopped-off input.
    16k is generous enough for any single-page Romanian admin form.
    """
    payload = {
        'model': model,
        'prompt': prompt,
        'format': 'json',
        'stream': False,
        'options': {
            'temperature': temperature,
            # Generous max output — a busy form can have 40+ fields and
            # each field row is ~80–120 chars.
            'num_predict': 8192,
            'num_ctx': num_ctx,
        },
    }
    if image_b64 is not None:
        payload['images'] = [image_b64]
    body = json.dumps(payload).encode('utf-8')

    req = urllib.request.Request(
        f'{host.rstrip("/")}/api/generate',
        data=body,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
    except urllib.error.URLError as exc:
        raise OllamaError(f'cannot reach Ollama at {host}: {exc.reason}') from exc

    if 'response' not in payload:
        raise OllamaError(f'Ollama returned no "response" field: {payload}')

    return OllamaResponse(
        text=payload['response'],
        model=payload.get('model', model),
        # total_duration is in nanoseconds when present.
        elapsed_s=payload.get('total_duration', 0) / 1e9,
    )


def ensure_model_available(model: str, host: str = 'http://localhost:11434') -> None:
    """Raise OllamaError with an actionable message if the model isn't pulled.

    Cheap GET to /api/tags so we fail fast before generating, not after
    a 5-minute timeout chasing a missing model.
    """
    try:
        with urllib.request.urlopen(f'{host.rstrip("/")}/api/tags', timeout=10) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
    except urllib.error.URLError as exc:
        raise OllamaError(
            f'cannot reach Ollama at {host}. Start it with `ollama serve` '
            f'or open the Ollama app. ({exc.reason})'
        ) from exc

    tags = {m.get('name') for m in payload.get('models', [])}
    if model not in tags:
        raise OllamaError(
            f'model {model!r} not found in Ollama. Pull it with: '
            f'`ollama pull {model}`'
        )
