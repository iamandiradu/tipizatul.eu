"""Thin abstraction over `ollama_client` and `anthropic_client`.

The two clients already share the same `generate_json(prompt, image_b64,
model=..., timeout=...)` shape; this module just picks one by name and
forwards. Keeps the CLIs free of provider-specific branching.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from . import anthropic_client, ollama_client


@dataclass
class ProviderResult:
    text: str
    model: str
    elapsed_s: float
    provider: str
    # Only populated for the Anthropic provider — handy for cost tracking.
    input_tokens: int = 0
    output_tokens: int = 0


# Defaults per provider for the digital (text-only) path.
DEFAULT_TEXT_MODELS = {
    'ollama': 'qwen2.5:7b',
    'anthropic': anthropic_client.DEFAULT_MODEL,
}

# Defaults per provider for the scan (vision) path.
DEFAULT_VISION_MODELS = {
    'ollama': 'qwen2.5vl:3b',
    # Any current Claude has vision; sonnet is the cost/quality default.
    'anthropic': anthropic_client.DEFAULT_MODEL,
}


def generate_json(
    prompt: str,
    image_b64: str | None = None,
    *,
    provider: str,
    model: str,
    timeout: float,
    host: str = 'http://localhost:11434',
    api_key_env: str = 'ANTHROPIC_API_KEY',
) -> ProviderResult:
    if provider == 'ollama':
        r = ollama_client.generate_json(
            prompt, image_b64,
            model=model, host=host, timeout=timeout,
        )
        return ProviderResult(
            text=r.text, model=r.model, elapsed_s=r.elapsed_s,
            provider='ollama',
        )
    if provider == 'anthropic':
        api_key = os.environ.get(api_key_env)
        r = anthropic_client.generate_json(
            prompt, image_b64,
            model=model, api_key=api_key, timeout=timeout,
        )
        return ProviderResult(
            text=r.text, model=r.model, elapsed_s=r.elapsed_s,
            provider='anthropic',
            input_tokens=r.input_tokens,
            output_tokens=r.output_tokens,
        )
    raise ValueError(f'unknown provider: {provider!r}. Use "ollama" or "anthropic".')


def ensure_ready(provider: str, model: str, *, host: str, api_key_env: str) -> None:
    """Fail fast before processing a batch when the provider isn't usable.

    For Ollama: check the server reachable + the model pulled.
    For Anthropic: check the env var is populated (we can't probe without
    spending a request).
    """
    if provider == 'ollama':
        ollama_client.ensure_model_available(model, host=host)
    elif provider == 'anthropic':
        anthropic_client.ensure_api_key(api_key_env)
    else:
        raise ValueError(f'unknown provider: {provider!r}')


# Exceptions normalised under one name so callers don't import both modules.
ProviderError = (ollama_client.OllamaError, anthropic_client.AnthropicError)
