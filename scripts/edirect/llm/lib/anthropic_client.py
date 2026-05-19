"""Minimal Anthropic Messages API client for cloud LLM inference.

Matches the call surface of lib/ollama_client.generate_json so the rest
of the pipeline doesn't care which transport is in use. Stdlib-only —
no `anthropic` SDK required.

Default model is claude-sonnet-4-6 (good cost/quality balance for our
structured-input prompts). Override with --model for haiku-4-5 (cheaper,
fast) or opus-4-7 (strongest, expensive).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass


API_URL = 'https://api.anthropic.com/v1/messages'
API_VERSION = '2023-06-01'

# Models we support (as of 2026-05). The CLI accepts any model id — we
# just default to one sensible for our use case and validate the env var.
DEFAULT_MODEL = 'claude-sonnet-4-6'
MAX_TOKENS_DEFAULT = 8192

# 5 min default — even Opus rarely needs more than 30 s for our prompts,
# but network hiccups happen.
_DEFAULT_TIMEOUT_S = 300


class AnthropicError(RuntimeError):
    pass


@dataclass
class AnthropicResponse:
    text: str
    model: str
    elapsed_s: float
    input_tokens: int
    output_tokens: int


def generate_json(
    prompt: str,
    image_b64: str | None = None,
    *,
    model: str = DEFAULT_MODEL,
    api_key: str | None = None,
    temperature: float = 0.1,
    timeout: float = _DEFAULT_TIMEOUT_S,
    max_tokens: int = MAX_TOKENS_DEFAULT,
    num_ctx: int | None = None,   # unused — Anthropic doesn't expose num_ctx
) -> AnthropicResponse:
    """Call Anthropic /v1/messages with the same JSON-only output discipline
    as the Ollama client. Image input is supported (base64 PNG) via vision
    models (any current Claude); pass image_b64 to use it.

    The model is instructed in-prompt to return raw JSON only; Anthropic
    doesn't have a `format=json` flag, but Claude models reliably emit
    pure JSON when asked. The parser in shape_prompt is tolerant of
    minor drift either way.
    """
    api_key = api_key or os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise AnthropicError(
            'ANTHROPIC_API_KEY is not set. Export it before running, or '
            'pass --api-key-env=<VAR_NAME> to use a different env var.'
        )

    # Reinforce JSON-only at the message level since we can't pass format=json.
    augmented = prompt + '\n\nRespond with raw JSON only — no markdown fences, no preamble.'

    if image_b64 is None:
        content = [{'type': 'text', 'text': augmented}]
    else:
        content = [
            {
                'type': 'image',
                'source': {
                    'type': 'base64',
                    'media_type': 'image/png',
                    'data': image_b64,
                },
            },
            {'type': 'text', 'text': augmented},
        ]

    body = json.dumps({
        'model': model,
        'max_tokens': max_tokens,
        'temperature': temperature,
        'messages': [{'role': 'user', 'content': content}],
    }).encode('utf-8')

    req = urllib.request.Request(
        API_URL,
        data=body,
        method='POST',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': API_VERSION,
        },
    )

    import time
    t0 = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        try:
            err = json.loads(exc.read().decode('utf-8'))
            msg = err.get('error', {}).get('message', str(exc))
        except Exception:
            msg = str(exc)
        raise AnthropicError(f'API {exc.code}: {msg}') from exc
    except urllib.error.URLError as exc:
        raise AnthropicError(f'cannot reach Anthropic API: {exc.reason}') from exc

    blocks = payload.get('content', [])
    text = ''.join(b.get('text', '') for b in blocks if b.get('type') == 'text')
    if not text:
        raise AnthropicError(f'Anthropic returned no text content: {payload}')

    usage = payload.get('usage', {})
    return AnthropicResponse(
        text=text,
        model=payload.get('model', model),
        elapsed_s=time.monotonic() - t0,
        input_tokens=int(usage.get('input_tokens', 0)),
        output_tokens=int(usage.get('output_tokens', 0)),
    )


def ensure_api_key(api_key_env: str = 'ANTHROPIC_API_KEY') -> None:
    """Fail fast if the env var isn't populated."""
    if not os.environ.get(api_key_env):
        raise AnthropicError(
            f'environment variable {api_key_env} is not set. Get a key at '
            f'https://console.anthropic.com and `export {api_key_env}=...`.'
        )
