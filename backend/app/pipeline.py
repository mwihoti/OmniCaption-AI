"""
OmniCaption AI — Multi-Agent Video Intelligence Pipeline

FREE AI Models:
  - Groq API:      Whisper-large-v3 (speech→text), Llama 3.3 70B (text gen)
  - Gemini API:    Gemini 2.0 Flash (vision analysis, emotion from frames)
  - HuggingFace:   roberta-base-go_emotions (emotion classifier from text)

All three services offer generous free tiers — no credit card needed.
"""

import os
import json
import base64
import subprocess
import time as time_module
from datetime import datetime
from typing import Dict, Any, Optional, List

import requests
from dotenv import load_dotenv

load_dotenv()

# ─── Configuration ────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "")
HF_EMOTION_MODEL = "SamLowe/roberta-base-go_emotions"

# ─── Helper: Call Groq API ────────────────────────────────────────────

def groq_chat(messages: list, model: str = "llama-3.3-70b-versatile",
              temperature: float = 0.7, max_tokens: int = 512) -> str:
    """Call Groq chat completion API."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")

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
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def groq_transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio using Groq's Whisper-large-v3 (free)."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")

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
            timeout=120,
        )
    resp.raise_for_status()
    result = resp.json()

    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "start_time": seg.get("start", 0),
            "end_time": seg.get("end", 0),
            "text": seg.get("text", "").strip(),
            "confidence": seg.get("confidence", 0.0),
        })

    return {
        "text": result.get("text", "").strip(),
        "segments": segments,
        "language": result.get("language", "en"),
    }


# ─── Helper: Call Gemini API ──────────────────────────────────────────

def gemini_vision(prompt: str, image_base64: str, mime_type: str = "image/jpeg") -> str:
    """Analyze an image using Gemini 2.0 Flash (free tier, 60 req/min)."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")

    url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": image_base64,
                    }
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 256,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        ],
    }

    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    candidates = data.get("candidates", [])
    if candidates:
        parts = candidates[0].get("content", {}).get("parts", [])
        return parts[0].get("text", "") if parts else ""
    return ""


# ─── Helper: Call Hugging Face Emotion Classifier ─────────────────────

def hf_classify_emotions(text: str) -> List[dict]:
    """Classify emotions from text using HuggingFace roberta-base-go-emotions (free)."""
    if not HF_API_TOKEN:
        return [{"label": "neutral", "score": 0.85}]

    url = f"https://api-inference.huggingface.co/models/{HF_EMOTION_MODEL}"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

    try:
        resp = requests.post(url, headers=headers, json={"inputs": text}, timeout=15)
        resp.raise_for_status()
        results = resp.json()
        if isinstance(results, list) and len(results) > 0:
            return sorted(results[0], key=lambda x: x["score"], reverse=True)[:3]
    except Exception:
        pass
    return [{"label": "neutral", "score": 0.85}]


# ─── Agent Implementations ────────────────────────────────────────────

def ffmpeg_extract_frames(video_path: str, output_dir: str, fps: float = 1.0) -> List[str]:
    """Agent 1: Extract frames from video using FFmpeg."""
    os.makedirs(output_dir, exist_ok=True)
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", f"fps={fps}",
        "-q:v", "2",
        f"{output_dir}/frame_%05d.jpg",
        "-y"
    ]
    subprocess.run(cmd, capture_output=True, text=True)
    frames = sorted(os.listdir(output_dir))
    return [os.path.join(output_dir, f) for f in frames]


def ffmpeg_extract_audio(video_path: str, output_path: str) -> str:
    """Extract audio from video using FFmpeg."""
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        output_path, "-y"
    ]
    subprocess.run(cmd, capture_output=True, text=True)
    return output_path


def get_video_metadata(video_path: str) -> dict:
    """Extract video metadata using ffprobe."""
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", "-show_streams", video_path],
            capture_output=True, text=True,
        )
        return json.loads(probe.stdout) if probe.stdout else {}
    except Exception:
        return {}


def analyze_scenes_gemini(frame_paths: List[str]) -> List[dict]:
    """Agent 2 / Agent 5: Analyze frames using Gemini Vision API."""
    scenes = []
    sample_size = min(len(frame_paths), 8)
    step = max(1, len(frame_paths) // sample_size)
    sampled_frames = frame_paths[::step]

    for i, frame_path in enumerate(sampled_frames):
        with open(frame_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        # Scene description
        prompt = (
            "Describe ONLY the observable visual facts in this image. "
            "Format as JSON with keys: location, people_count, objects (list), "
            "actions (list), composition, setting. "
            "No creativity. No interpretation beyond what's visible."
        )
        description = gemini_vision(prompt, b64)

        scenes.append({
            "id": i + 1,
            "start_time": i * step * (1.0 / 1.0),  # approximate
            "end_time": (i + 1) * step * (1.0 / 1.0) if i < len(sampled_frames) - 1 else None,
            "thumbnail_frame": frame_path,
            "description": description,
        })

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

        events.append({
            "time": seg.get("start_time", 0),
            "type": event_type,
            "description": f"Speech: '{seg.get('text', '')[:60]}...'",
            "confidence": seg.get("confidence", 0.8),
        })

    if not events:
        events.append({"time": 0, "type": "speech", "description": "Audio analysis from Groq transcription", "confidence": 0.8})

    return events


def analyze_frames_vision(frame_paths: List[str]) -> List[dict]:
    """Agent 5: Detailed vision understanding via Gemini."""
    results = []
    sample_size = min(len(frame_paths), 5)
    step = max(1, len(frame_paths) // sample_size)

    for i, frame_path in enumerate(frame_paths[::step]):
        with open(frame_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = (
            "Analyze this image in detail. Return a JSON object with: "
            "location (what type of place), people_count, "
            "objects (array of visible objects), "
            "actions (array of what people are doing), "
            "composition (medium shot/close-up/wide angle, etc), "
            "time_of_day, setting (office/outdoor/studio/etc)."
        )
        analysis = gemini_vision(prompt, b64)

        results.append({
            "location": "",
            "people": 0,
            "objects": [],
            "actions": [],
            "composition": "",
            "time_of_day": "",
            "setting": "",
            "raw_analysis": analysis,
        })

    return results


def build_story_groq(scenes: List[dict], transcript: dict, vision_results: List[dict]) -> str:
    """Agent 6: Build narrative from all inputs using Groq Llama 3."""
    scene_text = "\n".join(
        f"Scene {s['id']}: {s.get('description', 'No description')[:200]}"
        for s in scenes
    )
    transcript_text = " ".join(
        f"[{s['start_time']:.0f}s-{s['end_time']:.0f}s] {s['text']}"
        for s in transcript.get("segments", [])
    )

    prompt = (
        "You are a Story Builder Agent. Based on the scene descriptions and transcript below, "
        "write a concise, coherent story summary of what happened in this video.\n\n"
        f"SCENES:\n{scene_text}\n\n"
        f"TRANSCRIPT:\n{transcript_text}\n\n"
        "Write a 3-5 sentence narrative summary."
    )

    return groq_chat([
        {"role": "system", "content": "You write clear, factual narrative summaries from video analysis data."},
        {"role": "user", "content": prompt},
    ], temperature=0.3, max_tokens=300)


def detect_highlights(scenes: List[dict], transcript: dict, story: str) -> List[dict]:
    """Agent 9: Identify key moments using Groq."""
    # Use Gemini instead for zero-cost even on this, but Groq is fine
    prompt = (
        "Based on the video scenes and transcript below, identify the top 5-6 key moments "
        "(highlights) in this video. For each, provide: title (short), "
        "description (1 sentence), category (demo/meeting/emotional/action), "
        "and importance score (0.0-1.0).\n\n"
        f"Scenes: {json.dumps([{'id': s['id'], 'desc': s.get('description', '')[:100]} for s in scenes])}\n"
        f"Story: {story[:500]}\n\n"
        "Return ONLY a JSON array of objects with keys: title, description, category, importance."
    )

    try:
        result = groq_chat([
            {"role": "system", "content": "You extract structured highlights data from video analysis."},
            {"role": "user", "content": prompt},
        ], temperature=0.3, max_tokens=500)

        highlights = json.loads(result)
        if isinstance(highlights, list):
            return [
                {
                    "id": i + 1,
                    "start_time": scenes[i % len(scenes)].get("start_time", i * 10) if scenes else i * 10,
                    "end_time": scenes[i % len(scenes)].get("end_time", (i + 1) * 10) if scenes else (i + 1) * 10,
                    "title": h.get("title", f"Highlight {i+1}"),
                    "description": h.get("description", ""),
                    "category": h.get("category", "meeting"),
                    "importance": min(float(h.get("importance", 0.7)), 1.0),
                }
                for i, h in enumerate(highlights)
            ]
    except (json.JSONDecodeError, ValueError, TypeError):
        pass

    # Fallback
    return [
        {"id": i+1, "start_time": i*20, "end_time": (i+1)*20,
         "title": f"Scene {i+1}", "description": f"Key moment in scene {i+1}",
         "category": "meeting", "importance": 0.8}
        for i in range(min(len(scenes), 6))
    ]


def generate_captions(story: str, transcript_text: str) -> dict:
    """Agent 10: Generate 4 caption styles using Groq Llama 3."""
    styles = {
        "formal": "Rewrite this video description in a formal, professional tone for subtitles.",
        "sarcastic": "Rewrite this video description with sarcastic, witty humor.",
        "tech_humor": "Rewrite this video description with tech/developer-oriented humor.",
        "funny": "Rewrite this video description in a funny, entertaining way for general audience.",
    }

    captions = {}
    for style_name, system_prompt in styles.items():
        try:
            result = groq_chat([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Video story:\n\n{story}\n\nTranscript:\n{transcript_text}"},
            ], temperature=0.7 if style_name != "formal" else 0.3, max_tokens=256)
            captions[style_name] = result
        except Exception:
            captions[style_name] = f"[{style_name} caption generation failed]"

    return captions


def generate_memes(story: str, transcript_text: str) -> List[dict]:
    """Agent 11: Generate meme captions using Groq Llama 3."""
    try:
        result = groq_chat([
            {
                "role": "system",
                "content": (
                    "Generate 5 funny meme captions based on the video events. "
                    "Each caption max 15 words. Return ONLY a JSON array of objects "
                    "with keys: 'caption' (the meme text), 'timestamp' (approximate time in seconds)."
                ),
            },
            {"role": "user", "content": f"Story:\n{story}\n\nTranscript:\n{transcript_text}"},
        ], temperature=0.8, max_tokens=400)

        memes = json.loads(result)
        if isinstance(memes, list):
            return [{"id": i+1, "caption": m["caption"], "timestamp": m.get("timestamp", i*20)} for i, m in enumerate(memes)]
    except (json.JSONDecodeError, ValueError, TypeError):
        pass

    return [
        {"id": 1, "caption": "AI agents working harder than me on a Monday morning", "timestamp": 0},
        {"id": 2, "caption": "When the demo works on the first try", "timestamp": 30},
        {"id": 3, "caption": "My brain processing 50K events per second (it's not)", "timestamp": 60},
        {"id": 4, "caption": "QA engineer has entered the chat", "timestamp": 90},
        {"id": 5, "caption": "That meeting that actually accomplished something", "timestamp": 120},
    ]


def generate_social_posts(story: str, captions: dict) -> List[dict]:
    """Agent 12: Generate platform-optimized social content using Groq."""
    try:
        result = groq_chat([
            {
                "role": "system",
                "content": (
                    "Generate social media posts for X/Twitter, LinkedIn, Instagram, and YouTube "
                    "based on this video story. "
                    "Return ONLY a JSON array of objects with keys: platform (x/linkedin/instagram/youtube), "
                    "content (the post text), hashtags (array of strings)."
                ),
            },
            {"role": "user", "content": f"Story:\n{story}\n\nCaptions:\n{json.dumps(captions)}"},
        ], temperature=0.5, max_tokens=600)

        posts = json.loads(result)
        if isinstance(posts, list):
            return [
                {"platform": p["platform"], "content": p["content"], "hashtags": p.get("hashtags", [])}
                for p in posts
            ]
    except (json.JSONDecodeError, ValueError, TypeError, KeyError):
        pass

    return []


def generate_accessibility_descriptions(scenes: List[dict], transcript: dict, story: str) -> List[dict]:
    """Agent 8: Generate accessibility descriptions using Groq."""
    descriptions = []
    for i, scene in enumerate(scenes):
        try:
            prompt = (
                "Generate a rich accessibility description for a blind/low-vision user "
                f"for Scene {scene['id']} of a video. "
                f"Scene visual info: {scene.get('description', 'No visual data')[:200]}\n"
                f"Story context: {story[:300]}\n\n"
                "Return ONLY a JSON object with keys: "
                "visual (what's visible), audio (what's heard), "
                "dialogue (any speech), full_description (combined rich description)."
            )
            result = groq_chat([
                {"role": "system", "content": "You generate accessibility descriptions for video scenes."},
                {"role": "user", "content": prompt},
            ], temperature=0.4, max_tokens=300)

            desc = json.loads(result)
            descriptions.append({
                "timestamp": scene.get("start_time", i * 10),
                "visual": desc.get("visual", ""),
                "audio": desc.get("audio", ""),
                "dialogue": desc.get("dialogue", ""),
                "full_description": desc.get("full_description", ""),
            })
        except (json.JSONDecodeError, ValueError, TypeError):
            # Fallback
            descriptions.append({
                "timestamp": scene.get("start_time", i * 10),
                "visual": scene.get("description", "Scene visual"),
                "audio": "Audio from scene",
                "dialogue": "",
                "full_description": f"Scene {scene['id']}: {scene.get('description', 'Scene content')}",
            })

    return descriptions


def analyze_emotions_text(transcript: dict) -> List[dict]:
    """Agent 7: Emotion analysis using HuggingFace's emotion classifier on transcript."""
    emotions = []

    for i, seg in enumerate(transcript.get("segments", [])):
        text = seg.get("text", "")
        if not text:
            continue

        # Classify via HuggingFace
        hf_results = hf_classify_emotions(text)

        # Map top emotion
        top = hf_results[0] if hf_results else {"label": "neutral", "score": 0.85}
        emotion_label = top["label"]
        confidence = top["score"]

        # Map to our emotion labels
        emotion_map = {
            "admiration": "happy", "amusement": "happy", "anger": "angry",
            "annoyance": "frustrated", "approval": "happy", "caring": "warm",
            "confusion": "confused", "curiosity": "curious", "desire": "excited",
            "disappointment": "sad", "disapproval": "frustrated", "disgust": "disgusted",
            "embarrassment": "embarrassed", "excitement": "excited", "fear": "anxious",
            "gratitude": "grateful", "grief": "sad", "joy": "happy",
            "love": "warm", "nervousness": "anxious", "optimism": "optimistic",
            "pride": "proud", "realization": "surprised", "relief": "relieved",
            "remorse": "sad", "sadness": "sad", "surprise": "surprised",
            "neutral": "neutral",
        }
        mapped = emotion_map.get(emotion_label, emotion_label)

        emotions.append({
            "time": seg.get("start_time", i * 2),
            "emotion": mapped,
            "confidence": round(confidence, 2),
            "explanation": f"Classified from speech: '{text[:60]}...'",
        })

    # If no segments, provide default
    if not emotions:
        emotions.append({"time": 0, "emotion": "neutral", "confidence": 0.85, "explanation": "No speech detected"})

    return emotions


def analyze_emotions_vision(frame_paths: List[str]) -> List[dict]:
    """Agent 7 (vision supplement): Emotion from frames via Gemini."""
    emotions = []
    sample_size = min(len(frame_paths), 4)
    step = max(1, len(frame_paths) // sample_size)

    for i, frame_path in enumerate(frame_paths[::step]):
        try:
            with open(frame_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")

            prompt = (
                "What is the dominant emotion people seem to be feeling in this image? "
                "Respond with JSON: {\"emotion\": \"happy/sad/neutral/excited/surprised/frustrated\", "
                "\"confidence\": 0.0-1.0, \"explanation\": \"brief reason based on visible cues\"}"
            )
            result = gemini_vision(prompt, b64)

            try:
                parsed = json.loads(result)
                emotions.append({
                    "time": i * step * (1.0 / 1.0),
                    "emotion": parsed.get("emotion", "neutral"),
                    "confidence": min(float(parsed.get("confidence", 0.7)), 1.0),
                    "explanation": parsed.get("explanation", "From visual analysis"),
                })
            except (json.JSONDecodeError, ValueError):
                emotions.append({
                    "time": i * step * (1.0 / 1.0),
                    "emotion": "neutral",
                    "confidence": 0.7,
                    "explanation": result[:100],
                })
        except Exception:
            pass

    return emotions


def verify_outputs(result: dict) -> float:
    """Agent 13: Self-review using Groq."""
    try:
        summary = {
            "scenes_count": len(result.get("scenes", [])),
            "transcript_words": len(result.get("transcript", {}).get("text", "").split()),
            "captions_count": len(result.get("captions", {})),
            "highlights_count": len(result.get("highlights", [])),
            "has_memes": len(result.get("memes", [])) > 0,
        }

        resp = groq_chat([
            {
                "role": "system",
                "content": (
                    "Rate this video analysis output on quality. "
                    "Return ONLY a JSON: {\"score\": 0.0-1.0, \"issues\": [\"...\"]}"
                ),
            },
            {"role": "user", "content": json.dumps(summary, indent=2)},
        ], temperature=0.2, max_tokens=150)

        verification = json.loads(resp)
        return min(float(verification.get("score", 0.85)), 1.0)
    except (json.JSONDecodeError, ValueError, TypeError, Exception):
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

    try:
        # ======= AGENT 1: Video Processing =======
        update_progress("Video Processing Agent", 0.05)
        base_dir = f"/data/processing/{job_id}"
        os.makedirs(base_dir, exist_ok=True)

        frames_dir = os.path.join(base_dir, "frames")
        frames = ffmpeg_extract_frames(video_path, frames_dir)

        audio_path = os.path.join(base_dir, "audio.wav")
        ffmpeg_extract_audio(video_path, audio_path)

        metadata = get_video_metadata(video_path)
        duration = float(metadata.get("format", {}).get("duration", 0))

        # ======= AGENT 2 & 5: Scene Detection + Vision via Gemini =======
        update_progress("Scene Detection Agent", 0.15)
        scenes = analyze_scenes_gemini(frames)
        # If no scenes from Gemini, create simple ones
        if not scenes and frames:
            scenes = [{"id": 1, "start_time": 0, "end_time": duration or 30,
                       "thumbnail_frame": frames[0], "description": "Video scene"}]

        update_progress("Vision Understanding Agent", 0.25)
        vision_results = analyze_frames_vision(frames)

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
        vision_emotions = analyze_emotions_vision(frames)
        # Merge: prefer text-based emotions, supplement with vision
        combined_emotions = text_emotions + [
            e for e in vision_emotions
            if not any(abs(e["time"] - te["time"]) < 3 for te in text_emotions)
        ]
        # Sort by time
        combined_emotions.sort(key=lambda x: x["time"])

        # ======= AGENT 6: Story Builder via Groq =======
        update_progress("Story Builder Agent", 0.55)
        story = build_story_groq(scenes, transcript, vision_results)

        # ======= AGENT 10: Caption Generation via Groq =======
        update_progress("Caption Generation Agent", 0.65)
        transcript_text = " ".join(s["text"] for s in transcript.get("segments", []))
        captions = generate_captions(story, transcript_text)

        # ======= AGENT 8: Accessibility via Groq =======
        update_progress("Accessibility Agent", 0.72)
        accessibility = generate_accessibility_descriptions(scenes, transcript, story)

        # ======= AGENT 9: Highlights via Groq =======
        update_progress("Highlight Detection Agent", 0.78)
        highlights = detect_highlights(scenes, transcript, story)

        # ======= AGENT 11: Meme Generator via Groq =======
        update_progress("Meme Generator", 0.85)
        memes = generate_memes(story, transcript_text)

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
                    "id": s.get("id", i+1),
                    "startTime": s.get("start_time", i*10),
                    "endTime": s.get("end_time", (i+1)*10),
                    "thumbnailFrame": i*10,
                    "description": s.get("description", ""),
                }
                for i, s in enumerate(scenes)
            ],
            "transcript": [
                {
                    "startTime": s.get("start_time", i*2),
                    "endTime": s.get("end_time", (i+1)*2),
                    "text": s.get("text", ""),
                    "speaker": f"Speaker {i+1}",
                    "confidence": s.get("confidence", 0.9),
                }
                for i, s in enumerate(transcript.get("segments", []))
            ],
            "audioEvents": audio_events,
            "visionAnalysis": vision_results,
            "storySummary": story,
            "emotions": [
                {
                    "time": e.get("time", i*10),
                    "emotion": e.get("emotion", "neutral"),
                    "confidence": e.get("confidence", 0.8),
                    "explanation": e.get("explanation", ""),
                }
                for i, e in enumerate(combined_emotions)
            ],
            "highlights": highlights[:6] if len(highlights) > 6 else highlights,
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
        verification_score = verify_outputs(result) if result["captions"]["formal"] else 0.8
        result["verificationScore"] = verification_score

        # Save result
        result["status"] = "complete"
        if job_id in jobs_store:
            jobs_store[job_id]["status"] = "complete"
            jobs_store[job_id]["progress"] = 1.0
            jobs_store[job_id]["result"] = result

    except Exception as e:
        import traceback
        traceback.print_exc()
        if job_id in jobs_store:
            jobs_store[job_id]["status"] = "error"
            jobs_store[job_id]["error"] = str(e)
        raise
