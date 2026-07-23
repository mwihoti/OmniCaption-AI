# 🎬 OmniCaption AI

> An AI agent that watches, understands, and narrates any video for everyone.
>
> **Built for the AMD Developer Hackathon: ACT II — Track 2 (Video Captioning)**

[![AMD Hackathon](https://img.shields.io/badge/AMD-Hackathon%20ACT%20II-ED1C24?style=flat-square)](https://lablab.ai)
[![Made with ROCm](https://img.shields.io/badge/Made%20with-ROCm-6A0DAD?style=flat-square)](https://rocm.docs.amd.com)
[![Fireworks AI](https://img.shields.io/badge/Powered%20by-Fireworks%20AI-FF6B35?style=flat-square)](https://fireworks.ai)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)](https://react.dev)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📋 Overview

**OmniCaption AI** is a multi-agent video intelligence system that goes beyond simple speech transcription. Instead of asking one AI model to "describe the video," we divide the work into **13 specialized AI agents** — each with one responsibility. Together they build a complete understanding of the video.

### The Problem

Most captioning systems only answer one question: *"What words were spoken?"*

But people need answers to much richer questions:
- What *happened* in the video?
- What *emotions* were present?
- What are the *important moments*?
- What *sounds* matter for accessibility?
- How do I turn this into a *social media post*?
- Can you make it *funny*?

**OmniCaption AI answers all of these from a single video.**

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **🎯 4 Caption Styles** | Formal, Sarcastic, Tech Humor, Funny — same facts, different tones |
| **♿ Accessibility Descriptions** | Rich scene-by-scene descriptions for blind/low-vision users — combining visual, audio, and dialogue |
| **📊 Emotion Timeline** | Track emotional arc across the video (excited, curious, celebratory, etc.) |
| **⭐ Intelligent Highlights** | Detect key moments — sports goals, meeting decisions, podcast insights |
| **🎭 Meme Generator** | AI-generated meme captions grounded in actual video events |
| **📱 Social Media Export** | Auto-generate platform-specific posts for X, LinkedIn, Instagram, YouTube |
| **📖 Scene Detection** | Structured scene timeline with intelligent keyframe selection |
| **🔍 Verification Agent** | Self-review loop checks for hallucinations, style consistency, and accuracy |

### The 13 AI Agents

```
1.  🎬 Video Processing Agent    → Extract frames, audio, metadata via FFmpeg
2.  ✂️ Scene Detection Agent     → Detect scene transitions (PySceneDetect)
3.  🔊 Audio Intelligence Agent  → Analyze speech, music, environmental sounds
4.  🎤 Speech Recognition Agent  → Transcribe dialogue (Whisper)
5.  👁️ Vision Understanding Agent → Analyze frames with VLM (Qwen3-VL / Gemma)
6.  📖 Story Builder Agent       → Reconstruct narrative from all inputs
7.  ❤️ Emotion Analysis Agent    → Estimate emotions from faces, voice, pacing
8.  ♿ Accessibility Agent       → Generate rich accessibility descriptions
9.  ⭐ Highlight Detection Agent → Identify key moments
10. 💬 Caption Generation Agent → Generate 4 styles from factual story
11. 😂 Meme Generator           → Create internet-ready memes
12. 📱 Social Media Generator   → Repurpose content for social platforms
13. ✅ Verification Agent        → Self-review for accuracy & consistency
```

---

## 🏗️ Architecture

```
                    Upload Video
                         │
                         ▼
               Video Processing Agent
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   Scene Detection (PySceneDetect)    Whisper ASR
          │                             │
          ▼                             ▼
   Representative Frames      Transcript + Timestamps
          │                             │
          └──────────┬──────────────────┘
                     ▼
         Fireworks AI Vision (Gemma/Qwen3-VL)
                     │
                     ▼
        Structured Scene Description
                     │
                     ▼
              Story Builder Agent
                     │
     ┌───────┬───────┬───────┬───────┐
     ▼       ▼       ▼       ▼       ▼
   Access  Emotion  Highlight Object Timeline
     │       │       │       │
     └───────┴───────┴───────┘
                     │
                     ▼
            Caption Generator
                     │
       ┌───────┬───────┬───────┬───────┐
       ▼       ▼       ▼       ▼       ▼
    Formal  Sarcastic TechHumor  Funny  Memes
                     │
                     ▼
            Verification Agent
                     │
       ┌───────┬───────┬───────┐
       ▼       ▼       ▼       ▼
   Access  Memes  Social  JSON Export
```

---

## 🔑 API Keys

OmniCaption calls hosted inference APIs at runtime. Each capability has a
**primary provider and automatic fallbacks**, so you don't need all of them —
but for full-quality captions you want a chat key and a vision key.

| Env var | Powers | Priority | Get a key |
|---|---|---|---|
| `GROQ_API_KEY` | Chat (story + captions) **and** Whisper transcription | ⭐ Primary for text | https://console.groq.com |
| `NVIDIA_API_KEY` | Vision / scene understanding | ⭐ Primary for vision | https://build.nvidia.com |
| `GEMINI_API_KEY` | Vision fallback | Optional | https://aistudio.google.com/apikey |
| `FIREWORKS_API_KEY` | Chat + transcription fallback | Optional | https://fireworks.ai |
| `HF_API_TOKEN` | Emotion classifier + vision fallback | Optional | https://huggingface.co/settings/tokens |

**Minimum recommended:** `GROQ_API_KEY` + `NVIDIA_API_KEY`. With no keys the
pipeline still runs and writes valid output, but captions will be empty.

Provider order — chat: Groq → NVIDIA → Fireworks. Vision: NVIDIA → Gemini →
Hugging Face. Transcription: Fireworks (if set) → Groq.

---

## 🚀 Getting Started

### Prerequisites

- Docker
- At least one API key from the table above (`GROQ_API_KEY` + `NVIDIA_API_KEY` recommended)

### Run on Docker — Grader / batch mode (how the hackathon judges run it)

This is the mode the scoring harness uses. Build the lean backend-only image
(`Dockerfile.grader`), mount an `/input` folder with `tasks.json`, and read
results from `/output`.

```bash
# 1. Build the grader image (keys are optional at build time; see note below)
docker build -f Dockerfile.grader -t omnicaption-grader .

# 2. Provide the task list. Each clip has an id and a video URL (or local path).
mkdir -p /tmp/in /tmp/out
cat > /tmp/in/tasks.json <<'JSON'
{"clips":[
  {"id":"v1","url":"https://storage.googleapis.com/amd-hackathon-clips/1860079-uhd_2560_1440_25fps.mp4"}
]}
JSON

# 3. Run under the grading constraints (2 vCPU / 4 GB), passing keys at runtime
docker run --rm --cpus=2 --memory=4g \
  -e GROQ_API_KEY=gsk_xxx \
  -e NVIDIA_API_KEY=nvapi_xxx \
  -v /tmp/in:/input:ro \
  -v /tmp/out:/output \
  omnicaption-grader

# 4. Read the captions
cat /tmp/out/results.json
```

The container auto-detects `/input/tasks.json` and runs the batch pipeline
(`docker/run.sh` → `backend/entrypoint.py`). It downloads each `url`, produces
captions, and writes `/output/results.json`. Each result contains a `captions`
object with the four required styles: **`formal`, `sarcastic`, `humorous_tech`,
`humorous_non_tech`**.

`tasks.json` accepts either `{"clips":[{id, url|path}, ...]}` or a bare list of
paths/URLs; task ids are preserved exactly. The grader image sets
`CAPTIONS_ONLY=1` so it produces only what Track 2 scores (skipping memes,
social posts, accessibility, highlights, emotion, verification) for faster,
lighter runs.

> **Baking keys into the image** (so it runs with no runtime env — e.g. for a
> submission where the judge can't inject secrets): pass them as build args.
> ⚠️ A public image with baked keys is extractable — use throwaway keys you
> revoke after judging.
> ```bash
> docker build -f Dockerfile.grader \
>   --build-arg GROQ_API_KEY=gsk_xxx \
>   --build-arg NVIDIA_API_KEY=nvapi_xxx \
>   -t ghcr.io/mwihoti/omnicaption-ai:latest .
> ```

### Run on Docker — Web app (interactive UI + API)

```bash
git clone https://github.com/mwihoti/omnicaption-ai.git
cd omnicaption-ai

# Put your keys in a .env file (see the table above)
cp .env.example .env   # then edit .env

docker compose up --build
```

Open **http://localhost**. Upload a video and the full 13-agent pipeline runs.
(`docker compose` uses the full `Dockerfile`, which also builds the React UI.)

### Frontend only (mock data, no keys)

```bash
npm install
npm run dev
```

The UI runs standalone with mock data — no API key needed for a quick look.

---

## 🔧 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **GPU Compute** | AMD Developer Cloud + ROCm | Run AI workloads on AMD GPUs |
| **Chat / captions** | Groq (primary) → NVIDIA NIM → Fireworks | Story building + 4-style caption generation |
| **Vision** | NVIDIA NIM (primary) → Gemini → Hugging Face | Scene/frame understanding |
| **Speech** | Whisper via Fireworks / Groq | Automatic speech recognition |
| **Frontend** | React 18 + Tailwind CSS v4 | User interface with glassmorphism design |
| **Backend** | FastAPI (Python 3.12) | REST API and agent orchestration |
| **Video Processing** | FFmpeg | Frame extraction, downscaling, audio |
| **Containerization** | Docker + Docker Compose | Required for hackathon submission |
| **Animation** | Framer Motion | UI animations and transitions |

### AMD Platform Integration

- **AMD ROCm**: PyTorch runs on AMD GPUs via ROCm 6.2 for Whisper inference
- **AMD Developer Cloud**: All compute runs on AMD Instinct MI300X GPUs
- **Fireworks AI**: Vision and language models served on AMD hardware

---


## 🗂️ Project Structure

```
omnicaption-ai/
├── src/                    # React frontend
│   ├── components/
│   │   ├── Header.tsx          # Navigation bar
│   │   ├── UploadZone.tsx      # Drag-and-drop upload
│   │   ├── VideoPlayer.tsx     # Video player with controls
│   │   ├── Timeline.tsx        # Scene timeline
│   │   ├── CaptionTabs.tsx     # 4-style caption display
│   │   ├── AccessibilityView.tsx  # Accessibility descriptions
│   │   ├── HighlightsPanel.tsx # Key moments
│   │   ├── MemeGallery.tsx     # Meme captions
│   │   ├── EmotionTimeline.tsx # Emotion arc visualization
│   │   ├── SocialExport.tsx    # Social media posts
│   │   └── AgentPipeline.tsx   # 13-agent pipeline visualization
│   ├── data/mockData.ts        # Demo data
│   ├── types/index.ts          # TypeScript definitions
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind v4 + design tokens
├── backend/                    # FastAPI backend
│   ├── main.py                 # API routes
│   ├── app/pipeline.py         # 13-agent orchestration
│   └── requirements.txt        # Python dependencies
├── docker/
│   └── nginx.conf              # Nginx configuration
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose setup
├── index.html                  # HTML entry point
├── package.json                # Node dependencies
├── vite.config.ts              # Vite configuration
└── README.md                   # This file
```

---

## 🎯 Why OmniCaption AI Stands Out

### 1. **Factual Grounding First**
Most captioning systems prompt the model to "describe the video" — which causes hallucinations. Our Vision Agent is prompted to output **only facts** (objects, people, actions, locations). Creativity is applied *after* fact-checking.

### 2. **Verification Loop**
Agent 13 (Verification) reviews every output before returning it. If confidence drops below threshold, it regenerates the affected section. This self-review dramatically reduces hallucinations.

### 3. **Accessibility-First Design**
Every video gets rich accessibility descriptions combining visual, audio, and dialogue into a complete narrative — making content usable for blind and low-vision users.

### 4. **Multi-Style from One Understanding**
One factual story → 4 caption styles + memes + social posts + accessibility descriptions. No redundant processing.

### 5. **AMD-Optimized**
Whisper runs on AMD GPUs via ROCm. Vision and language inference uses AMD-hosted models on Fireworks AI.

---

## 📝 Submission

This project was submitted to the **AMD Developer Hackathon: ACT II** (Track 2 — Video Captioning).

- **Project Title**: OmniCaption AI
- **Track**: Track 2 — Video Captioning
- **Team**: Solo
- **Technologies**: AMD ROCm, AMD Developer Cloud, Fireworks AI, React, FastAPI, Docker

---

## 📄 License

MIT License — see LICENSE for details.

---

## 🙏 Acknowledgments

- AMD AI Developer Program for GPU credits and ROCm support
- Fireworks AI for API credits and AMD-hardware hosted models
- Google DeepMind for Gemma models
- lablab.ai for hosting the hackathon
- NativelyAI for the builder platform
