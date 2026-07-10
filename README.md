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

## 🚀 Getting Started

### Prerequisites

- [AMD AI Developer Program](https://www.amd.com/en/developer/ai-program.html) account
- [Fireworks AI API key](https://fireworks.ai) (with hackathon credits)
- Docker (for containerized submission)
- AMD GPU (for ROCm acceleration) or CPU fallback

### Quick Start (Frontend Demo)

```bash
# Clone the repo
git clone https://github.com/your-username/omnicaption-ai.git
cd omnicaption-ai

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend runs standalone with mock data — no API key needed for the demo.

### Full Stack (Docker)

```bash
# Set your API key
export FIREWORKS_API_KEY="fw_xxx"

# Build and run
docker compose up --build
```

Open **http://localhost** to see the app.

### Backend Only (AMD Developer Cloud)

```bash
# Set up Python environment
cd backend
pip install -r requirements.txt

# Set environment variables
export FIREWORKS_API_KEY="fw_xxx"
export DEVICE="cuda"

# Start the API
python main.py
```

---

## 🔧 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **GPU Compute** | AMD Developer Cloud + ROCm | Run all AI workloads on AMD GPUs |
| **Inference** | Fireworks AI API | Gemma 4 Vision, Qwen3-VL, Gemma 4 9B |
| **Frontend** | React 18 + Tailwind CSS v4 | User interface with glassmorphism design |
| **Backend** | FastAPI (Python 3.12) | REST API and agent orchestration |
| **Video Processing** | FFmpeg + PySceneDetect | Frame extraction, scene detection |
| **Speech** | OpenAI Whisper | Automatic speech recognition |
| **Containerization** | Docker + Docker Compose | Required for hackathon submission |
| **Animation** | Framer Motion | UI animations and transitions |

### AMD Platform Integration

- **AMD ROCm**: PyTorch runs on AMD GPUs via ROCm 6.2 for Whisper inference
- **AMD Developer Cloud**: All compute runs on AMD Instinct MI300X GPUs
- **Fireworks AI**: Vision and language models served on AMD hardware

---

## 📊 Track 2 Requirements

This submission fulfills all Track 2 requirements:

- ✅ **Fixed video clips** (30 seconds to 2 minutes)
- ✅ **4 distinct caption styles**: Formal, Sarcastic, Tech Humor, Funny
- ✅ **Fireworks AI API** for model inference
- ✅ **Fine-tuning compatible architecture**
- ✅ **Containerized** (Docker)
- ✅ **LLM-Judge ready** — Verification Agent ensures accuracy and tone

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