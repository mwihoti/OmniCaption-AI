"""
OmniCaption AI — Multi-Agent Video Intelligence Pipeline

FREE AI Models:
  - Groq API:      Whisper-large-v3 (speech→text), Llama 3.3 70B (text gen)
  - Gemini API:    Gemini 2.0 Flash (vision analysis, emotion from frames)
  - HuggingFace:   roberta-base-go_emotions (emotion classifier from text)

All three services offer generous free tiers — no credit card needed.
"""

import base64
import json
import math
import os
import re
import subprocess
import time
import time as time_module
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

# --- Fireworks helper configuration (optional) ---
# If FIREWORKS_API_KEY is set in the environment, we will prefer calling Fireworks for
# chat and audio transcription. These helpers are best-effort and will raise on failure
# so callers can fallback to other providers.
FIREWORKS_API_KEY = os.environ.get("FIREWORKS_API_KEY", "")
FIREWORKS_BASE_URL = os.environ.get(
    "FIREWORKS_BASE_URL", "https://api.fireworks.ai/inference/v1"
)

import traceback


def fireworks_chat(
    messages: list,
    model: str = "accounts/fireworks/models/gpt-oss-120b",
    temperature: float = 0.7,
    max_tokens: int = 512,
    timeout: int = 60,
) -> str:
    """Call a Fireworks-style chat/completion endpoint. Returns text content on success,
    or raises on failure so callers can fallback."""
    if not FIREWORKS_API_KEY:
        raise ValueError("FIREWORKS_API_KEY not set")
    url = f"{FIREWORKS_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {FIREWORKS_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        # gpt-oss spends tokens on hidden reasoning before the final answer;
        # give it headroom so the answer itself doesn't get truncated to nothing.
        "max_tokens": max(max_tokens * 4, 1024),
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
    resp.raise_for_status()
    j = resp.json()
    text = ""
    if isinstance(j, dict):
        choices = j.get("choices") or j.get("outputs") or []
        if choices:
            first = choices[0]
            if isinstance(first, dict):
                msg = first.get("message") or first.get("output") or first
                if isinstance(msg, dict):
                    # reasoning_content is chain-of-thought, never the answer —
                    # returning it leaks internal reasoning to users.
                    text = msg.get("content") or msg.get("text") or ""
                else:
                    text = first.get("text") or ""
    if text:
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    if not text:
        raise ValueError("Fireworks returned no final content (reasoning-only or empty response)")
    return text


def fireworks_transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio via Fireworks inference endpoint. Returns a dict similar to Groq verbose_json when possible."""
    if not FIREWORKS_API_KEY:
        raise ValueError("FIREWORKS_API_KEY not set")
    url = f"{FIREWORKS_BASE_URL}/audio/transcriptions"
    headers = {"Authorization": f"Bearer {FIREWORKS_API_KEY}"}
    with open(audio_path, "rb") as f:
        files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
        data = {"model": "whisper-large", "response_format": "verbose_json"}
        resp = requests.post(url, headers=headers, files=files, data=data, timeout=60)
    resp.raise_for_status()
    return resp.json()


# ─── Configuration ────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
# Base URL for Google Generative Language API
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
# The GEMINI_MODEL controls which Gemini model to call. Set this in your .env to one of:
# "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash", etc.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "")
HF_EMOTION_MODEL = "SamLowe/roberta-base-go_emotions"

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

# Track which provider answered last for provenance
LAST_VISION_PROVIDER: Optional[str] = None
LAST_TRANSCRIPT_PROVIDER: Optional[str] = None
LAST_CHAT_PROVIDER: Optional[str] = None
# Cache of failed providers to avoid retrying them on subsequent frames
_FAILED_VISION_PROVIDERS: set = set()
# Consecutive failure count per chat provider; a provider is skipped for the
# rest of the job once it hits the limit (so one dead API doesn't add 30s
# of timeout to every single chat call).
_CHAT_PROVIDER_FAILURES: Dict[str, int] = {}
_CHAT_FAILURE_LIMIT = 2
# Rate-limited providers are skipped until this timestamp so every call
# doesn't waste a round trip on a guaranteed 429 (free tiers reset per minute)
_CHAT_PROVIDER_COOLDOWN: Dict[str, float] = {}
_RATE_LIMIT_COOLDOWN_S = 60.0


def _chat_provider_available(name: str) -> bool:
    return _CHAT_PROVIDER_FAILURES.get(name, 0) < _CHAT_FAILURE_LIMIT


def _chat_provider_cooling(name: str) -> bool:
    return time.time() < _CHAT_PROVIDER_COOLDOWN.get(name, 0.0)


def _chat_provider_rate_limited(name: str):
    _CHAT_PROVIDER_COOLDOWN[name] = time.time() + _RATE_LIMIT_COOLDOWN_S


def _chat_provider_failed(name: str):
    count = _CHAT_PROVIDER_FAILURES.get(name, 0) + 1
    _CHAT_PROVIDER_FAILURES[name] = count
    if count == _CHAT_FAILURE_LIMIT:
        print(f"[warning] {name} chat disabled for this job after {count} consecutive failures")


def _chat_provider_ok(name: str):
    _CHAT_PROVIDER_FAILURES[name] = 0
    _CHAT_PROVIDER_COOLDOWN.pop(name, None)

# Global rate limiter for chat API calls (1.5s minimum between calls)
_LAST_CHAT_TIME: float = 0.0
# Gemini free tier allows ~15 vision requests/minute; space calls to stay under it
_LAST_VISION_TIME: float = 0.0


def _throttle_chat():
    global _LAST_CHAT_TIME
    elapsed = time.time() - _LAST_CHAT_TIME
    if elapsed < 1.5:
        time.sleep(1.5 - elapsed)
    _LAST_CHAT_TIME = time.time()


def _throttle_vision():
    global _LAST_VISION_TIME
    elapsed = time.time() - _LAST_VISION_TIME
    if elapsed < 4.0:
        time.sleep(4.0 - elapsed)
    _LAST_VISION_TIME = time.time()


# ─── Helper: Call Groq API ────────────────────────────────────────────


def _is_rate_limit(e: Exception) -> bool:
    """Check if an exception is a 429 rate limit error."""
    s = str(e)
    return "429" in s or "Too Many Requests" in s or "rate_limit" in s or "RESOURCE_EXHAUSTED" in s


def _log_error(provider: str, e: Exception):
    try:
        status = ""
        if hasattr(e, "response") and e.response is not None:
            status = f" (HTTP {e.response.status_code})"
        elif hasattr(e, "status_code") and e.status_code is not None:
            status = f" (HTTP {e.status_code})"
        msg = str(e)[:100].replace("\n", " ")
        print(f"[warning] {provider} failed{status}: {msg}")
    except Exception:
        pass


def _extract_json(text: str):
    """Parse JSON from an LLM reply that may wrap it in prose or ```json fences."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError("empty response")
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if fence:
        cleaned = fence.group(1).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    for open_ch, close_ch in (("[", "]"), ("{", "}")):
        start = cleaned.find(open_ch)
        end = cleaned.rfind(close_ch)
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError(f"no JSON found in response: {text[:80]}")


def _normalize_whisper_segments(raw_segments: list) -> List[dict]:
    """Normalize Whisper verbose_json segments to our schema and drop likely
    hallucinations (music/noise decoded as speech, or degenerate repetition)."""
    segments = []
    for seg in raw_segments or []:
        if not isinstance(seg, dict):
            continue
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        no_speech = float(seg.get("no_speech_prob") or 0.0)
        avg_logprob = float(seg.get("avg_logprob") or 0.0)
        compression = float(seg.get("compression_ratio") or 1.0)
        # Whisper's own no-speech rule, plus the repetition-loop heuristic
        if no_speech > 0.6 and avg_logprob < -0.7:
            continue
        if compression > 2.4:
            continue
        confidence = round(min(1.0, max(0.0, math.exp(avg_logprob))), 2)
        segments.append(
            {
                "start_time": float(seg.get("start", seg.get("start_time", 0)) or 0),
                "end_time": float(seg.get("end", seg.get("end_time", 0)) or 0),
                "text": text,
                "confidence": confidence,
            }
        )
    return segments


def groq_chat(
    messages: list,
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.7,
    max_tokens: int = 512,
) -> str:
    """Call chat completion with multi-provider fallback chain and retries.
    Provider order: NVIDIA -> Groq -> Fireworks."""
    global LAST_CHAT_PROVIDER
    _throttle_chat()

    def _groq_call(messages, temperature=0.7, max_tokens=512):
        resp = requests.post(
            f"{GROQ_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=30,
        )
        resp.raise_for_status()
        j = resp.json()
        choices = (j or {}).get("choices") or []
        if choices:
            first = choices[0]
            if isinstance(first, dict) and "message" in first:
                return first["message"].get("content", "")
            return first.get("text", "") if isinstance(first, dict) else str(first)
        raise ValueError("Groq returned empty response")

    # Groq is the fast, reliable chat provider — try it first. NVIDIA's chat
    # endpoint frequently read-times-out (~30s each), so it's a fallback here
    # even though it stays primary for vision. This ordering avoids paying a
    # ~60s timeout tax on every clip.
    providers = [
        ("groq", GROQ_API_KEY, _groq_call),
        ("nvidia", NVIDIA_API_KEY, nvidia_chat),
        ("fireworks", FIREWORKS_API_KEY, fireworks_chat),
    ]

    last_error = "All configured providers skipped or missing keys"
    for attempt in range(3):
        if attempt > 0:
            wait = 15 * attempt
            try:
                print(f"[info] Chat retry {attempt + 1}/3 after {wait}s")
            except Exception:
                pass
            time.sleep(wait)
            _throttle_chat()

        # On the last attempt, try cooling providers anyway rather than
        # returning a failure with providers left untried.
        final_attempt = attempt == 2
        had_rate_limit = False

        for name, key, fn in providers:
            if not key or not _chat_provider_available(name):
                continue
            if _chat_provider_cooling(name) and not final_attempt:
                # recently rate-limited — let the next provider take this call
                had_rate_limit = True
                continue
            try:
                print(f"[info] Attempting {name} chat...")
                result = fn(messages, temperature=temperature, max_tokens=max_tokens)
                LAST_CHAT_PROVIDER = name
                _chat_provider_ok(name)
                return result
            except Exception as e:
                LAST_CHAT_PROVIDER = f"{name}_failed"
                last_error = str(e)
                if _is_rate_limit(e):
                    had_rate_limit = True
                    _chat_provider_rate_limited(name)
                else:
                    # rate limits recover in seconds — only hard failures
                    # (timeouts, 5xx) count toward disabling the provider
                    _chat_provider_failed(name)
                _log_error(name, e)

        if not had_rate_limit and attempt == 0:
            # If no provider worked and no provider was rate limited on first attempt,
            # then they either all failed or all were missing keys. Don't retry.
            break

    return f"[generation failed after {attempt + 1} retries: {last_error[:100]}]"


def groq_transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio using Groq's Whisper-large-v3. Prefer Fireworks if configured."""
    # Prefer Fireworks if available
    try:
        if FIREWORKS_API_KEY:
            j = fireworks_transcribe_audio(audio_path)
            if isinstance(j, dict):
                try:
                    global LAST_TRANSCRIPT_PROVIDER
                    LAST_TRANSCRIPT_PROVIDER = "fireworks"
                except Exception:
                    pass
                text = j.get("text") or j.get("transcript") or ""
                segments = _normalize_whisper_segments(j.get("segments") or [])
                return {
                    "text": text,
                    "segments": segments,
                    "language": j.get("language", "en"),
                }
    except Exception:
        # fireworks failed, fall through to Groq
        try:
            LAST_TRANSCRIPT_PROVIDER = "fireworks_failed"
        except Exception:
            pass

    if not GROQ_API_KEY:
        # No model available; return empty transcript
        try:
            LAST_TRANSCRIPT_PROVIDER = "none"
        except Exception:
            pass
        return {"text": "", "segments": [], "language": "en"}

    with open(audio_path, "rb") as f:
        files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
        data = {
            "model": "whisper-large-v3",
            "response_format": "verbose_json",
            "language": "en",
        }
        resp = requests.post(
            f"{GROQ_BASE_URL}/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files=files,
            data=data,
            timeout=60,
        )
        resp.raise_for_status()
        result = resp.json()
        try:
            LAST_TRANSCRIPT_PROVIDER = "groq"
        except Exception:
            pass

    segments = _normalize_whisper_segments(result.get("segments", []))

    return {
        "text": result.get("text", "").strip(),
        "segments": segments,
        "language": result.get("language", "en"),
    }


# ─── Helper: Call Gemini API ──────────────────────────────────────────


def nvidia_vision(prompt: str, image_base64: str, mime_type: str = "image/jpeg") -> str:
    """Analyze an image using NVIDIA NIM vision models via integrate.api.nvidia.com."""
    if not NVIDIA_API_KEY:
        raise ValueError("NVIDIA_API_KEY not set")
    vision_models = [
        "nvidia/nemotron-nano-12b-v2-vl",
    ]
    for model in vision_models:
        if f"nvidia:{model}" in _FAILED_VISION_PROVIDERS:
            continue
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_base64}"
                        },
                    },
                ],
            }
        ]
        for attempt in range(2):
            try:
                resp = requests.post(
                    f"{NVIDIA_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {NVIDIA_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.2,
                        "max_tokens": 256,
                    },
                    timeout=60,
                )
                resp.raise_for_status()
                j = resp.json()
                choices = j.get("choices", [])
                if choices:
                    msg = choices[0].get("message", {})
                    text = msg.get("content", "")
                    if text:
                        print(f"[info] NVIDIA vision {model} succeeded")
                        return text.strip()
                break
            except Exception as e:
                try:
                    print(f"[warning] NVIDIA vision {model} attempt {attempt + 1} failed: {e}")
                except Exception:
                    pass
                if attempt == 1:
                    # only blacklist after repeated failure — a single timeout is transient
                    _FAILED_VISION_PROVIDERS.add(f"nvidia:{model}")
    raise ValueError("All NVIDIA vision models failed")


def hf_vision(prompt: str, image_base64: str, mime_type: str = "image/jpeg") -> str:
    """Analyze an image using HuggingFace inference API (Florence-2 / BLIP)."""
    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN not set")
    import base64 as b64_mod
    image_bytes = b64_mod.b64decode(image_base64)
    vision_models = [
        "microsoft/Florence-2-large",
        "microsoft/Florence-2-base",
        "Salesforce/blip2-opt-2.7b",
    ]
    for model in vision_models:
        if f"hf:{model}" in _FAILED_VISION_PROVIDERS:
            continue
        try:
            headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
            # Florence-2 and BLIP accept raw image bytes
            resp = requests.post(
                f"https://router.huggingface.co/hf-inference/models/{model}",
                headers=headers,
                data=image_bytes,
                timeout=60,
            )
            resp.raise_for_status()
            result = resp.json()
            generated = ""
            if isinstance(result, list) and len(result) > 0:
                generated = result[0].get("generated_text", "") or ""
            elif isinstance(result, dict):
                generated = result.get("generated_text", "") or str(result)
            if generated:
                print(f"[info] HF vision {model} succeeded")
                return generated.strip()
        except Exception as e:
            _FAILED_VISION_PROVIDERS.add(f"hf:{model}")
            try:
                print(f"[warning] HF vision {model} failed: {e}")
            except Exception:
                pass
    raise ValueError("All HF vision models failed")


def gemini_chat(
    messages: list,
    model: str = "gemini-2.0-flash",
    temperature: float = 0.7,
    max_tokens: int = 512,
) -> str:
    """Call Gemini chat API. Converts from OpenAI message format to Gemini format."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")
    system_prompt = ""
    contents = []
    for msg in messages:
        role = msg.get("role", "")
        text = msg.get("content", "")
        if role == "system":
            system_prompt = text
        elif role == "user":
            contents.append({"role": "user", "parts": [{"text": text}]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": text}]})
    url = f"{GEMINI_BASE_URL}/{model}:generateContent?key={GEMINI_API_KEY}"
    payload: dict = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }
    if system_prompt:
        payload["system_instruction"] = {"parts": [{"text": system_prompt}]}
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates", [])
    if candidates:
        parts = candidates[0].get("content", {}).get("parts", [])
        text = parts[0].get("text", "") if parts else ""
        if text:
            return text.strip()
    raise ValueError("Gemini chat returned empty response")


def nvidia_chat(
    messages: list,
    model: str = "meta/llama-3.3-70b-instruct",
    temperature: float = 0.7,
    max_tokens: int = 512,
) -> str:
    """Call NVIDIA NIM chat API (OpenAI-compatible)."""
    if not NVIDIA_API_KEY:
        raise ValueError("NVIDIA_API_KEY not set")
    resp = requests.post(
        f"{NVIDIA_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        timeout=30,
    )
    resp.raise_for_status()
    j = resp.json()
    choices = j.get("choices", [])
    if choices:
        msg = choices[0].get("message", {})
        text = msg.get("content", "")
        if text:
            return text.strip()
    raise ValueError("NVIDIA chat returned empty response")


def gemini_vision(prompt: str, image_base64: str, mime_type: str = "image/jpeg") -> str:
    """Analyze an image using NVIDIA first, falling back to Gemini then HuggingFace.
    Returns a description string, or "" if every provider failed."""
    global LAST_VISION_PROVIDER, _FAILED_VISION_PROVIDERS

    placeholder = ""

    # Try NVIDIA NIM first
    if NVIDIA_API_KEY and "nvidia_vision" not in _FAILED_VISION_PROVIDERS:
        try:
            result = nvidia_vision(prompt, image_base64, mime_type)
            try:
                LAST_VISION_PROVIDER = "nvidia_vision"
            except Exception:
                pass
            return result
        except Exception as e:
            _FAILED_VISION_PROVIDERS.add("nvidia_vision")
            try:
                print(f"[warning] NVIDIA vision failed: {e}")
            except Exception:
                pass

    # Fallback to Gemini
    if GEMINI_API_KEY and "gemini" not in _FAILED_VISION_PROVIDERS:
        # We try the configured model first, then fallback to 1.5-flash if it fails
        models_to_try = [GEMINI_MODEL]
        if GEMINI_MODEL != "gemini-1.5-flash":
            models_to_try.append("gemini-1.5-flash")

        for model in models_to_try:
            url = f"{GEMINI_BASE_URL}/{model}:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": image_base64,
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 256},
                "safetySettings": [
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ],
            }
            _throttle_vision()
            try:
                resp = requests.post(url, json=payload, timeout=30)
                resp.raise_for_status()
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    text = parts[0].get("text", "") if parts else ""
                    if text:
                        try:
                            LAST_VISION_PROVIDER = f"gemini:{model}"
                        except Exception:
                            pass
                        return text
            except Exception as e:
                if _is_rate_limit(e):
                    print(f"[info] Gemini vision {model} rate-limited")
                else:
                    print(f"[warning] Gemini vision {model} failed: {e}")
                # continue to next model or next provider

        _FAILED_VISION_PROVIDERS.add("gemini")

    # Fallback to HuggingFace
    if HF_API_TOKEN and "hf_vision" not in _FAILED_VISION_PROVIDERS:
        try:
            result = hf_vision(prompt, image_base64, mime_type)
            try:
                LAST_VISION_PROVIDER = "hf_vision"
            except Exception:
                pass
            return result
        except Exception as e:
            _FAILED_VISION_PROVIDERS.add("hf_vision")
            try:
                print(f"[warning] HF vision failed: {e}")
            except Exception:
                pass

    return placeholder


# ─── Helper: Call Hugging Face Emotion Classifier ─────────────────────


def hf_classify_emotions(text: str) -> List[dict]:
    """Classify emotions from text using HuggingFace roberta-base-go-emotions (free)."""
    if not HF_API_TOKEN:
        return [{"label": "neutral", "score": 0.85}]

    # api-inference.huggingface.co is deprecated; the router is the current endpoint
    url = f"https://router.huggingface.co/hf-inference/models/{HF_EMOTION_MODEL}"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

    try:
        resp = requests.post(url, headers=headers, json={"inputs": text}, timeout=15)
        resp.raise_for_status()
        results = resp.json()
        if isinstance(results, list) and len(results) > 0:
            return sorted(results[0], key=lambda x: x["score"], reverse=True)[:3]
    except Exception as e:
        _log_error("hf_emotion", e)
    return [{"label": "neutral", "score": 0.85}]


# ─── Agent Implementations ────────────────────────────────────────────


def ffmpeg_extract_frames(
    video_path: str, output_dir: str, fps: float = 1.0
) -> List[str]:
    """Agent 1: Extract frames from video using FFmpeg."""
    if not os.path.isfile(video_path):
        raise RuntimeError(f"input video not found at {video_path}")
    if os.path.getsize(video_path) == 0:
        raise RuntimeError(f"input video is empty (0 bytes) at {video_path}")
    os.makedirs(output_dir, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-nostdin",
        "-loglevel",
        "error",
        "-i",
        video_path,
        "-vf",
        f"fps={fps}",
        "-q:v",
        "2",
        f"{output_dir}/frame_%05d.jpg",
        "-y",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        # ffmpeg writes the actual error at the END of stderr, so show the tail
        # (the head is just the build banner).
        err = (result.stderr or "").strip()
        raise RuntimeError(
            f"FFmpeg frame extraction failed (rc={result.returncode}): {err[-500:]}"
        )
    frames = sorted(os.listdir(output_dir))
    if not frames:
        raise RuntimeError("FFmpeg extracted zero frames")
    return [os.path.join(output_dir, f) for f in frames]


def ffmpeg_extract_audio(video_path: str, output_path: str) -> str:
    """Extract audio from video using FFmpeg."""
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-nostdin",
        "-loglevel",
        "error",
        "-i",
        video_path,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        output_path,
        "-y",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        err = (result.stderr or "").strip()
        print(f"[warning] Audio extraction failed (rc={result.returncode}): {err[-200:]}")
    return output_path


def get_video_metadata(video_path: str) -> dict:
    """Extract video metadata using ffprobe."""
    try:
        probe = subprocess.run(
            [
                "ffprobe",
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                video_path,
            ],
            capture_output=True,
            text=True,
        )
        return json.loads(probe.stdout) if probe.stdout else {}
    except Exception:
        return {}


def analyze_scenes_gemini(
    frame_paths: List[str], duration: float = 30.0
) -> List[dict]:
    """Agent 2 / Agent 5: Analyze frames using Gemini Vision API."""
    scenes = []
    sample_size = min(len(frame_paths), 8)
    step = max(1, len(frame_paths) // sample_size)
    sampled_frames = frame_paths[::step]
    sec_per_frame = duration / max(len(frame_paths), 1)

    for i, frame_path in enumerate(sampled_frames):
        with open(frame_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        scene_start = i * step * sec_per_frame
        scene_end = (i + 1) * step * sec_per_frame
        if i == len(sampled_frames) - 1:
            scene_end = duration

        prompt = (
            f"This frame is from {scene_start:.0f}s into a video. "
            "In 2-3 sentences, describe the concrete event happening: who/what is in frame, "
            "what action is taking place, and the setting. Include any on-screen text verbatim. "
            "Do not start with 'This video frame' or 'This image' — describe the event directly."
        )
        description = gemini_vision(prompt, b64) or "No visual description available."

        scenes.append(
            {
                "id": i + 1,
                "start_time": round(scene_start, 1),
                "end_time": round(scene_end, 1),
                "thumbnail_frame": frame_path,
                "description": description,
            }
        )

    return scenes


def generate_audio_events(transcript: dict, duration: float) -> List[dict]:
    """Agent 3: Analyze audio events from transcript patterns."""
    events = []
    for seg in transcript.get("segments", []):
        text = seg.get("text", "").lower()
        event_type = "speech"
        if "applause" in text or "applaud" in text or "clap" in text:
            event_type = "applause"
        elif "laugh" in text or "funny" in text or "ha ha" in text:
            event_type = "laughter"

        events.append(
            {
                "time": seg.get("start_time", 0),
                "type": event_type,
                "description": f"Speech: '{seg.get('text', '')[:60]}...'",
                "confidence": seg.get("confidence", 0.8),
            }
        )

    if not events:
        events.append(
            {
                "time": 0,
                "type": "speech",
                "description": "Audio analysis from Groq transcription",
                "confidence": 0.8,
            }
        )

    return events


def analyze_frames_vision(
    frame_paths: List[str], duration: float = 30.0
) -> List[dict]:
    """Agent 5: Detailed vision understanding via Gemini."""
    results = []
    sample_size = min(len(frame_paths), 5)
    step = max(1, len(frame_paths) // sample_size)
    sec_per_frame = duration / max(len(frame_paths), 1)

    for i, frame_path in enumerate(frame_paths[::step]):
        with open(frame_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        frame_time = round(i * step * sec_per_frame, 1)

        prompt = (
            f"This is a video frame at timestamp {frame_time:.1f}s. "
            "Analyze what is happening in detail. Describe the actions, "
            "people, objects, setting, camera composition, and time of day. "
            "Focus on motion, interactions, and scene context."
        )
        analysis = gemini_vision(prompt, b64)

        results.append(
            {
                "time": frame_time,
                "location": "",
                "people": 0,
                "objects": [],
                "actions": [],
                "composition": "",
                "time_of_day": "",
                "setting": "",
                "raw_analysis": analysis,
            }
        )

    return results


def build_story_groq(
    scenes: List[dict],
    transcript: dict,
    vision_results: List[dict],
    duration: float = 0.0,
) -> str:
    """Agent 6: Build narrative from all inputs using the chat fallback chain."""
    scene_text = "\n".join(
        f"Scene {s['id']} [{s.get('start_time', 0):.0f}s-{s.get('end_time', 0):.0f}s]: "
        f"{s.get('description', 'No description')[:200]}"
        for s in scenes
    )
    transcript_text = " ".join(
        f"[{s['start_time']:.0f}s-{s['end_time']:.0f}s] {s['text']}"
        for s in transcript.get("segments", [])
    )
    duration_note = f"The video is {duration:.0f} seconds long. " if duration > 0 else ""

    prompt = (
        "You are a Story Builder Agent. Based on the scene descriptions and transcript below, "
        f"write a concise, coherent story summary of what happened in this video. {duration_note}"
        "The transcript is auto-generated and may contain errors — when it conflicts with "
        "the visual scene descriptions, trust the visuals.\n\n"
        f"SCENES:\n{scene_text}\n\n"
        f"TRANSCRIPT:\n{transcript_text}\n\n"
        "Write a 3-6 sentence narrative summary of the actual events. "
        "Output ONLY the summary — no preamble. End with a complete sentence."
    )

    return groq_chat(
        [
            {
                "role": "system",
                "content": "You write clear, factual narrative summaries from video analysis data.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=500,
    )


def detect_highlights(
    scenes: List[dict], transcript: dict, story: str, duration: float = 0.0
) -> List[dict]:
    """Agent 9: Identify key moments, anchored to actual scene timestamps."""
    scene_summaries = [
        {
            "scene_id": s.get("id", i + 1),
            "start": s.get("start_time", 0),
            "end": s.get("end_time", 0),
            "desc": (s.get("description") or "")[:150],
        }
        for i, s in enumerate(scenes)
    ]
    prompt = (
        "Based on the video scenes and story below, identify the top 4-6 key moments "
        "(highlights). For each, provide: scene_id (which scene from the list it happens in), "
        "title (short, about the actual event), description (1 sentence about what happens), "
        "category (one of: action/emotional/demo/meeting), and importance score (0.0-1.0).\n\n"
        f"Scenes: {json.dumps(scene_summaries)}\n"
        f"Story: {story[:500]}\n\n"
        "Return ONLY a JSON array of objects with keys: scene_id, title, description, category, importance."
    )

    scene_by_id = {s.get("id", i + 1): s for i, s in enumerate(scenes)}
    try:
        result = groq_chat(
            [
                {
                    "role": "system",
                    "content": "You extract structured highlights data from video analysis.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=600,
        )

        highlights = _extract_json(result)
        if isinstance(highlights, list) and highlights:
            out = []
            for i, h in enumerate(highlights[:6]):
                if not isinstance(h, dict):
                    continue
                try:
                    scene = scene_by_id.get(int(h.get("scene_id")))
                except (ValueError, TypeError):
                    scene = None
                if scene is None and scenes:
                    scene = scenes[min(i, len(scenes) - 1)]
                start = float((scene or {}).get("start_time", 0))
                end = float((scene or {}).get("end_time", start + 5))
                if duration > 0:
                    end = min(end, duration)
                out.append(
                    {
                        "id": len(out) + 1,
                        "start_time": start,
                        "end_time": end,
                        "title": h.get("title", f"Highlight {i + 1}"),
                        "description": h.get("description", ""),
                        "category": h.get("category", "action"),
                        "importance": min(float(h.get("importance", 0.7)), 1.0),
                    }
                )
            if out:
                return out
    except Exception as e:
        _log_error("highlights", e)

    # Fallback: derive highlights directly from the detected scenes
    return [
        {
            "id": i + 1,
            "start_time": s.get("start_time", 0),
            "end_time": s.get("end_time", 0),
            "title": f"Scene {s.get('id', i + 1)}",
            "description": (s.get("description") or f"Key moment in scene {i + 1}")[:150],
            "category": "action",
            "importance": 0.7,
        }
        for i, s in enumerate(scenes[:6])
    ]


def generate_captions(
    story: str, transcript_text: str, scenes: Optional[List[dict]] = None
) -> dict:
    """Agent 10: Generate 4 caption styles grounded in the actual video events."""
    scene_events = ""
    if scenes:
        scene_events = "\n".join(
            f"[{s.get('start_time', 0):.0f}s-{s.get('end_time', 0):.0f}s] "
            f"{(s.get('description') or '')[:200]}"
            for s in scenes
        )

    styles = {
        "formal": "a formal, professional tone",
        "sarcastic": "a sarcastic, witty tone",
        "tech_humor": "tech/developer-oriented humor",
        "funny": "a funny, entertaining tone for a general audience",
    }

    captions = {}
    for i, (style_name, tone) in enumerate(styles.items()):
        if i > 0:
            time.sleep(2.0)
        try:
            result = groq_chat(
                [
                    {
                        "role": "system",
                        "content": (
                            f"You write short video captions in {tone}. "
                            "Describe the ACTUAL events shown in the video, using the "
                            "scene-by-scene timeline and transcript provided. "
                            "Write 2-4 sentences. Output ONLY the caption text — "
                            "no preamble, no analysis, no notes."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Video story:\n{story}\n\n"
                            f"Scene-by-scene events:\n{scene_events}\n\n"
                            f"Transcript:\n{transcript_text}"
                        ),
                    },
                ],
                temperature=0.7 if style_name != "formal" else 0.3,
                max_tokens=256,
            )
            captions[style_name] = result.strip()
        except Exception:
            captions[style_name] = f"[{style_name} caption generation failed]"

    return captions


def shorten_caption(text: str, style: str = "formal") -> str:
    """Shorten a single caption using the chat fallback chain."""
    if not text or text.startswith("[") or "generation failed" in text:
        return text
    prompt = (
        f"Shorten this {style} caption to be more concise while keeping the same tone. "
        f"Max 15 words. Output ONLY the shortened caption. Original:\n\n{text}"
    )
    result = groq_chat(
        [
            {"role": "system", "content": "You shorten captions to be brief and impactful."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=100,
    )
    result = result.strip()
    if not result or result.startswith("[generation failed"):
        return text
    return result


def generate_memes(
    story: str,
    transcript_text: str,
    scenes: Optional[List[dict]] = None,
    duration: float = 0.0,
) -> List[dict]:
    """Agent 11: Generate meme captions grounded in the video's actual events."""
    scene_events = ""
    if scenes:
        scene_events = "\n".join(
            f"[{s.get('start_time', 0):.0f}s] {(s.get('description') or '')[:150]}"
            for s in scenes
        )
    duration_note = (
        f" Timestamps must be within 0-{int(duration)} seconds." if duration > 0 else ""
    )
    try:
        result = groq_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "Generate 5 funny meme captions based on the ACTUAL video events "
                        "described below — reference what is really happening on screen. "
                        "Each caption max 15 words. Return ONLY a JSON array of objects "
                        "with keys: 'caption' (the meme text), 'timestamp' (time in seconds "
                        f"of the moment it refers to).{duration_note}"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Story:\n{story}\n\nScene events:\n{scene_events}\n\n"
                        f"Transcript:\n{transcript_text}"
                    ),
                },
            ],
            temperature=0.8,
            max_tokens=400,
        )

        memes = _extract_json(result)
        if isinstance(memes, list) and memes:
            out = []
            for i, m in enumerate(memes[:5]):
                if not isinstance(m, dict) or not m.get("caption"):
                    continue
                try:
                    ts = float(m.get("timestamp", 0))
                except (ValueError, TypeError):
                    ts = 0
                if duration > 0:
                    ts = min(max(ts, 0), duration)
                out.append({"id": len(out) + 1, "caption": m["caption"], "timestamp": ts})
            if out:
                return out
    except Exception as e:
        _log_error("memes", e)

    # Fallback: pull moments straight from the detected scenes
    return [
        {
            "id": i + 1,
            "caption": (s.get("description") or "A moment from the video")[:80],
            "timestamp": s.get("start_time", 0),
        }
        for i, s in enumerate((scenes or [])[:5])
    ] or [{"id": 1, "caption": "This video speaks for itself", "timestamp": 0}]


def generate_social_posts(story: str, captions: dict) -> List[dict]:
    """Agent 12: Generate platform-optimized social content using Groq."""
    try:
        result = groq_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "Generate social media posts for X/Twitter, LinkedIn, Instagram, and YouTube "
                        "based on this video story. "
                        "Return ONLY a JSON array of objects with keys: platform (x/linkedin/instagram/youtube), "
                        "content (the post text), hashtags (array of strings)."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Story:\n{story}\n\nCaptions:\n{json.dumps(captions)}",
                },
            ],
            temperature=0.5,
            max_tokens=600,
        )

        posts = _extract_json(result)
        if isinstance(posts, list):
            return [
                {
                    "platform": p["platform"],
                    "content": p["content"],
                    "hashtags": p.get("hashtags", []),
                }
                for p in posts
            ]
    except (json.JSONDecodeError, ValueError, TypeError, KeyError):
        pass

    return []


def generate_accessibility_descriptions(
    scenes: List[dict], transcript: dict, story: str
) -> List[dict]:
    """Agent 8: Generate accessibility descriptions using the scene's real dialogue."""
    segments = transcript.get("segments", [])
    descriptions = []
    for i, scene in enumerate(scenes):
        start = float(scene.get("start_time", i * 10))
        end = float(scene.get("end_time", start + 10))
        dialogue = " ".join(
            s.get("text", "")
            for s in segments
            if float(s.get("start_time", 0)) < end and float(s.get("end_time", 0)) > start
        ).strip()

        try:
            prompt = (
                "Generate a rich accessibility description for a blind/low-vision user "
                f"for Scene {scene['id']} of a video ({start:.0f}s-{end:.0f}s).\n"
                f"Scene visual info: {scene.get('description', 'No visual data')[:250]}\n"
                f"Dialogue heard in this scene: {dialogue or '(none — ambient sound or music)'}\n"
                f"Story context: {story[:300]}\n\n"
                "Return ONLY a JSON object with keys: "
                "visual (what's visible), audio (what's heard), "
                "dialogue (the speech, verbatim from above), "
                "full_description (combined rich description)."
            )
            result = groq_chat(
                [
                    {
                        "role": "system",
                        "content": "You generate accessibility descriptions for video scenes.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=300,
            )

            desc = _extract_json(result)
            descriptions.append(
                {
                    "timestamp": start,
                    "visual": desc.get("visual", ""),
                    "audio": desc.get("audio", ""),
                    "dialogue": desc.get("dialogue", dialogue),
                    "full_description": desc.get("full_description", ""),
                }
            )
        except Exception:
            # Fallback still grounded in real scene data
            descriptions.append(
                {
                    "timestamp": start,
                    "visual": scene.get("description", "Scene visual"),
                    "audio": "Speech" if dialogue else "Ambient sound or music",
                    "dialogue": dialogue,
                    "full_description": f"Scene {scene['id']}: {scene.get('description', 'Scene content')}",
                }
            )

    return descriptions


EMOTION_MAP = {
    "admiration": "happy",
    "amusement": "happy",
    "anger": "angry",
    "annoyance": "frustrated",
    "approval": "happy",
    "caring": "warm",
    "confusion": "confused",
    "curiosity": "curious",
    "desire": "excited",
    "disappointment": "sad",
    "disapproval": "frustrated",
    "disgust": "disgusted",
    "embarrassment": "embarrassed",
    "excitement": "excited",
    "fear": "anxious",
    "gratitude": "grateful",
    "grief": "sad",
    "joy": "happy",
    "love": "warm",
    "nervousness": "anxious",
    "optimism": "optimistic",
    "pride": "proud",
    "realization": "surprised",
    "relief": "relieved",
    "remorse": "sad",
    "sadness": "sad",
    "surprise": "surprised",
    "neutral": "neutral",
}


def _classify_emotions_chat(segments: List[dict]) -> Optional[List[dict]]:
    """Batch-classify segment emotions via the chat fallback chain (one call for all)."""
    lines = "\n".join(f"{i}: {s.get('text', '')}" for i, s in enumerate(segments))
    try:
        result = groq_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "Classify the emotion of each numbered line of video dialogue. "
                        "Allowed emotions: happy, sad, angry, excited, surprised, anxious, "
                        "frustrated, curious, warm, proud, neutral. "
                        'Return ONLY a JSON array like [{"index": 0, "emotion": "excited", "confidence": 0.9}] '
                        "with one entry per line."
                    ),
                },
                {"role": "user", "content": lines},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        parsed = _extract_json(result)
        if isinstance(parsed, list) and parsed:
            by_index = {}
            for item in parsed:
                if isinstance(item, dict) and "index" in item:
                    try:
                        by_index[int(item["index"])] = item
                    except (ValueError, TypeError):
                        continue
            return [
                {
                    "emotion": str(by_index.get(i, {}).get("emotion", "neutral")).lower(),
                    "confidence": min(float(by_index.get(i, {}).get("confidence", 0.7)), 1.0),
                }
                for i in range(len(segments))
            ]
    except Exception as e:
        _log_error("emotion_chat", e)
    return None


def analyze_emotions_text(transcript: dict) -> List[dict]:
    """Agent 7: Emotion analysis on transcript — HuggingFace classifier with LLM fallback."""
    segments = [s for s in transcript.get("segments", []) if s.get("text")]
    if not segments:
        return [
            {
                "time": 0,
                "emotion": "neutral",
                "confidence": 0.85,
                "explanation": "No speech detected",
            }
        ]

    classified = None
    source = "HuggingFace classifier"
    if HF_API_TOKEN:
        hf_rows = []
        hf_worked = False
        for seg in segments:
            top = hf_classify_emotions(seg["text"])[0]
            # the (neutral, 0.85) pair is this module's failure sentinel
            if not (top["label"] == "neutral" and top["score"] == 0.85):
                hf_worked = True
            hf_rows.append(top)
        if hf_worked:
            classified = [
                {
                    "emotion": EMOTION_MAP.get(r["label"], r["label"]),
                    "confidence": round(r["score"], 2),
                }
                for r in hf_rows
            ]

    if classified is None:
        classified = _classify_emotions_chat(segments)
        source = "LLM classifier"
    if classified is None:
        classified = [{"emotion": "neutral", "confidence": 0.5} for _ in segments]
        source = "fallback"

    return [
        {
            "time": seg.get("start_time", i * 2),
            "emotion": c["emotion"],
            "confidence": c["confidence"],
            "explanation": f"{source} from speech: '{seg['text'][:60]}'",
        }
        for i, (seg, c) in enumerate(zip(segments, classified))
    ]


def analyze_emotions_vision(
    frame_paths: List[str], duration: float = 30.0
) -> List[dict]:
    """Agent 7 (vision supplement): Emotion from frames via Gemini."""
    emotions = []
    sample_size = min(len(frame_paths), 4)
    step = max(1, len(frame_paths) // sample_size)
    sec_per_frame = duration / max(len(frame_paths), 1)

    for i, frame_path in enumerate(frame_paths[::step]):
        try:
            with open(frame_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")

            frame_time = round(i * step * sec_per_frame, 1)

            prompt = (
                f"At timestamp {frame_time:.1f}s in a video, "
                "what is the dominant emotion people seem to be feeling in this frame? "
                "Answer with just the emotion word (happy/sad/neutral/excited/surprised/frustrated) "
                "and optionally a brief explanation."
            )
            result = gemini_vision(prompt, b64)
            if not result:
                continue

            try:
                parsed = json.loads(result)
                emotions.append(
                    {
                        "time": frame_time,
                        "emotion": parsed.get("emotion", "neutral"),
                        "confidence": min(float(parsed.get("confidence", 0.7)), 1.0),
                        "explanation": parsed.get(
                            "explanation", "From visual analysis"
                        ),
                    }
                )
            except (json.JSONDecodeError, ValueError):
                # Gemini usually answers in plain text — pull the emotion word out
                lowered = result.lower()
                detected = next(
                    (
                        w
                        for w in (
                            "happy",
                            "sad",
                            "excited",
                            "surprised",
                            "frustrated",
                            "angry",
                            "anxious",
                            "neutral",
                        )
                        if w in lowered
                    ),
                    "neutral",
                )
                emotions.append(
                    {
                        "time": frame_time,
                        "emotion": detected,
                        "confidence": 0.7,
                        "explanation": result[:100],
                    }
                )
        except Exception:
            pass

    return emotions


def verify_outputs(result: dict) -> float:
    """Agent 13: Self-review using Groq."""
    try:
        summary = {
            "scenes_count": len(result.get("scenes", [])),
            "transcript_words": len(
                result.get("transcript", {}).get("text", "").split()
            ),
            "captions_count": len(result.get("captions", {})),
            "highlights_count": len(result.get("highlights", [])),
            "has_memes": len(result.get("memes", [])) > 0,
        }

        resp = groq_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "Rate this video analysis output on quality. "
                        'Return ONLY a JSON: {"score": 0.0-1.0, "issues": ["..."]}'
                    ),
                },
                {"role": "user", "content": json.dumps(summary, indent=2)},
            ],
            temperature=0.2,
            max_tokens=150,
        )

        verification = _extract_json(resp)
        return min(float(verification.get("score", 0.85)), 1.0)
    except Exception:
        return 0.85


# ─── Main Pipeline ────────────────────────────────────────────────────


def run_pipeline(job_id: str, video_path: str, jobs_store: Dict[str, Any]):
    """Orchestrate all 13 agents in sequence using free AI models."""
    start_time = time_module.time()

    def update_progress(agent_name: str, progress: float, status: str = "processing"):
        if job_id in jobs_store:
            jobs_store[job_id]["status"] = status
            jobs_store[job_id]["progress"] = progress
            jobs_store[job_id]["current_agent"] = agent_name

    print(f"[pipeline] Starting job {job_id} for {video_path}")
    # Log which keys are found (partially masked)
    for key_name in ["GROQ_API_KEY", "GEMINI_API_KEY", "HF_API_TOKEN", "NVIDIA_API_KEY", "FIREWORKS_API_KEY"]:
        val = os.environ.get(key_name)
        if val:
            print(f"[info] Found {key_name}: {val[:4]}...{val[-4:] if len(val) > 8 else ''}")
        else:
            print(f"[warning] Missing {key_name}")

    global _FAILED_VISION_PROVIDERS
    _FAILED_VISION_PROVIDERS = set()
    _CHAT_PROVIDER_FAILURES.clear()
    _CHAT_PROVIDER_COOLDOWN.clear()
    try:
        # ======= AGENT 1: Video Processing =======
        update_progress("Video Processing Agent", 0.05)
        # Use local data directory by default for local dev; override via env for Docker
        processing_root = os.environ.get("PROCESSING_DIR")
        if not processing_root:
            processing_root = os.path.join(os.getcwd(), "data", "processing")
        base_dir = os.path.join(processing_root, job_id)
        try:
            os.makedirs(base_dir, exist_ok=True)
        except (PermissionError, OSError):
            processing_root = os.path.join(os.getcwd(), "data", "processing")
            base_dir = os.path.join(processing_root, job_id)
            os.makedirs(processing_root, exist_ok=True)
            os.makedirs(base_dir, exist_ok=True)
        # Debug log for where we are writing processing artifacts
        try:
            print(f"[info] processing base_dir={base_dir}")
        except Exception:
            pass

        frames_dir = os.path.join(base_dir, "frames")
        frames = ffmpeg_extract_frames(video_path, frames_dir)

        audio_path = os.path.join(base_dir, "audio.wav")
        ffmpeg_extract_audio(video_path, audio_path)

        metadata = get_video_metadata(video_path)
        duration = float(metadata.get("format", {}).get("duration", 0))
        if duration <= 0 and frames:
            duration = len(frames)  # approximate from 1fps frame count

        # ======= AGENT 2 & 5: Scene Detection + Vision via Gemini =======
        update_progress("Scene Detection Agent", 0.15)
        scenes = analyze_scenes_gemini(frames, duration)
        # If no scenes from Gemini, create simple ones
        if not scenes and frames:
            scenes = [
                {
                    "id": 1,
                    "start_time": 0,
                    "end_time": duration if duration > 0 else 30,
                    "thumbnail_frame": frames[0],
                    "description": "Video scene",
                }
            ]

        update_progress("Vision Understanding Agent", 0.25)
        vision_results = analyze_frames_vision(frames, duration)

        # ======= AGENT 4: Speech Recognition via Groq Whisper =======
        update_progress("Speech Recognition Agent", 0.35)
        try:
            transcript = groq_transcribe_audio(audio_path)
        except Exception as e:
            transcript = {"text": "", "segments": [], "language": "en"}
            print(f"Whisper transcription failed: {e}")

        # ======= AGENT 3: Audio Intelligence =======
        update_progress("Audio Intelligence Agent", 0.20)
        audio_events = generate_audio_events(transcript, duration)

        # ======= AGENT 7: Emotion Analysis =======
        update_progress("Emotion Analysis Agent", 0.45)
        text_emotions = analyze_emotions_text(transcript)
        vision_emotions = analyze_emotions_vision(frames, duration)
        # Merge: prefer text-based emotions, supplement with vision
        combined_emotions = text_emotions + [
            e
            for e in vision_emotions
            if not any(abs(e["time"] - te["time"]) < 3 for te in text_emotions)
        ]
        # Sort by time
        combined_emotions.sort(key=lambda x: x["time"])

        # ======= AGENT 6: Story Builder via Groq =======
        update_progress("Story Builder Agent", 0.55)
        story = build_story_groq(scenes, transcript, vision_results, duration)

        # ======= AGENT 10: Caption Generation via Groq =======
        update_progress("Caption Generation Agent", 0.65)
        transcript_text = " ".join(s["text"] for s in transcript.get("segments", []))
        captions = generate_captions(story, transcript_text, scenes)

        # ======= AGENT 8: Accessibility via Groq =======
        update_progress("Accessibility Agent", 0.72)
        accessibility = generate_accessibility_descriptions(scenes, transcript, story)

        # ======= AGENT 9: Highlights via Groq =======
        update_progress("Highlight Detection Agent", 0.78)
        highlights = detect_highlights(scenes, transcript, story, duration)

        # ======= AGENT 11: Meme Generator via Groq =======
        update_progress("Meme Generator", 0.85)
        memes = generate_memes(story, transcript_text, scenes, duration)

        # ======= AGENT 12: Social Media via Groq =======
        update_progress("Social Media Generator", 0.90)
        social_posts = generate_social_posts(story, captions)

        # ======= Build chapters from scenes =======
        chapters = [
            {"time": s.get("start_time", i * 10), "title": f"Scene {s['id']}"}
            for i, s in enumerate(scenes)
        ]

        # ======= Assemble result =======
        result = {
            "id": job_id,
            "title": os.path.basename(video_path),
            "duration": duration,
            "scenes": [
                {
                    "id": s.get("id", i + 1),
                    "startTime": s.get("start_time", i * 10),
                    "endTime": s.get("end_time", (i + 1) * 10),
                    "thumbnailFrame": i * 10,
                    "description": s.get("description", ""),
                }
                for i, s in enumerate(scenes)
            ],
            "transcript": [
                {
                    "startTime": s.get("start_time", i * 2),
                    "endTime": s.get("end_time", (i + 1) * 2),
                    "text": s.get("text", ""),
                    # no diarization available — don't invent one speaker per segment
                    "speaker": "Speaker 1",
                    "confidence": s.get("confidence", 0.9),
                }
                for i, s in enumerate(transcript.get("segments", []))
            ],
            "audioEvents": audio_events,
            "visionAnalysis": vision_results,
            "storySummary": story,
            "emotions": [
                {
                    "time": e.get("time", i * 10),
                    "emotion": e.get("emotion", "neutral"),
                    "confidence": e.get("confidence", 0.8),
                    "explanation": e.get("explanation", ""),
                }
                for i, e in enumerate(combined_emotions)
            ],
            "highlights": [
                {
                    "id": h.get("id", i + 1),
                    "startTime": h.get("start_time", i * 20),
                    "endTime": h.get("end_time", (i + 1) * 20),
                    "title": h.get("title", f"Highlight {i + 1}"),
                    "description": h.get("description", ""),
                    "category": h.get("category", "meeting"),
                    "importance": h.get("importance", 0.8),
                }
                for i, h in enumerate(
                    highlights[:6] if len(highlights) > 6 else highlights
                )
            ],
            "captions": {
                "formal": captions.get("formal", ""),
                "sarcastic": captions.get("sarcastic", ""),
                "techHumor": captions.get("tech_humor", ""),
                "funny": captions.get("funny", ""),
            },
            "memes": memes[:5] if len(memes) > 5 else memes,
            "socialPosts": social_posts[:4] if len(social_posts) > 4 else social_posts,
            "accessibilityDescriptions": accessibility,
            "chapters": chapters or [{"time": 0, "title": "Video"}],
            "processingTimeMs": int((time_module.time() - start_time) * 1000),
            "status": "complete",
            "videoUrl": "",  # Will be set by frontend
        }

        # ======= AGENT 13: Verification via Groq =======
        update_progress("Verification Agent", 0.97)
        verification_score = (
            verify_outputs(result) if result["captions"]["formal"] else 0.8
        )
        result["verificationScore"] = verification_score

        # Save result
        result["status"] = "complete"
        # Attach provenance sources
        try:
            result_sources = {
                "vision": LAST_VISION_PROVIDER,
                "transcript": LAST_TRANSCRIPT_PROVIDER,
                "captions": LAST_CHAT_PROVIDER,
            }
            result["sources"] = result_sources
        except Exception:
            pass

        if job_id in jobs_store:
            jobs_store[job_id]["status"] = "complete"
            jobs_store[job_id]["progress"] = 1.0
            jobs_store[job_id]["result"] = result
            print(f"[pipeline] Job {job_id} complete in {time_module.time() - start_time:.1f}s")

    except Exception as e:
        import traceback

        traceback.print_exc()
        if job_id in jobs_store:
            jobs_store[job_id]["status"] = "error"
            jobs_store[job_id]["error"] = str(e)
        print(f"[pipeline] Job {job_id} FAILED: {e}")
        raise
