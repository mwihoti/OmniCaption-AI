# OmniCaption AI — FastAPI Backend
# Runs on AMD Developer Cloud with ROCm acceleration

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import uuid
import json
from datetime import datetime
from typing import Optional

app = FastAPI(
    title="OmniCaption AI",
    description="Multi-agent video intelligence system for the AMD Developer Hackathon: ACT II",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job storage (SQLite for hackathon, PostgreSQL for production)
JOBS = {}

# ─── Models ───────────────────────────────────────────────────────────

from pydantic import BaseModel

class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str

class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: float
    result: Optional[dict] = None

# ─── Routes ───────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "OmniCaption AI",
        "version": "1.0.0",
        "status": "running",
        "hackathon": "AMD Developer Hackathon: ACT II — Track 2",
    }

@app.post("/api/analyze", response_model=JobResponse)
async def analyze_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a video and start the 13-agent analysis pipeline."""
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    upload_dir = "/data/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{job_id}_{file.filename}")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    JOBS[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "file_path": file_path,
        "filename": file.filename,
        "created_at": datetime.utcnow().isoformat(),
        "result": None,
    }

    # Start pipeline in background
    from app.pipeline import run_pipeline
    background_tasks.add_task(run_pipeline, job_id, file_path, JOBS)

    return JobResponse(
        job_id=job_id,
        status="queued",
        message=f"Analysis started for {file.filename}. 13 agents processing.",
    )

@app.get("/api/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the status and results of a video analysis job."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        result=job.get("result"),
    )

@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY")),
        "huggingface_configured": bool(os.environ.get("HF_API_TOKEN")),
        "active_jobs": len([j for j in JOBS.values() if j["status"] == "processing"]),
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)