#!/usr/bin/env python3
"""
Batch entrypoint for grader:
Reads /input/tasks.json (either {"clips":[{id,path},...] } or list of paths),
runs pipeline.run_pipeline for each clip, writes /output/results.json and /output/log.txt.
"""

import json
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(__file__))
from app import pipeline

INPUT_PATH = "/input/tasks.json"
OUTPUT_PATH = "/output/results.json"
LOG_PATH = "/output/log.txt"


def write_log(msg):
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(msg + "\n")
        f.flush()


def read_tasks():
    if not os.path.exists(INPUT_PATH):
        raise FileNotFoundError(f"{INPUT_PATH} not found")
    return json.load(open(INPUT_PATH, "r"))


def run_single(job_id, video_path):
    jobs_store = {
        job_id: {
            "status": "queued",
            "progress": 0.0,
            "file_path": video_path,
            "filename": os.path.basename(video_path),
            "created_at": "now",
            "result": None,
        }
    }
    try:
        pipeline.run_pipeline(job_id, video_path, jobs_store)
        return jobs_store[job_id].get("result")
    except Exception as e:
        write_log(f"ERROR running pipeline for {video_path}: {e}")
        write_log(traceback.format_exc())
        return {"id": job_id, "status": "error", "error": str(e)}


def main():
    os.makedirs("/output", exist_ok=True)
    try:
        tasks = read_tasks()
    except Exception as e:
        write_log(f"Failed to read tasks.json: {e}")
        sys.exit(2)

    results = []
    clips = (
        tasks.get("clips") if isinstance(tasks, dict) and "clips" in tasks else tasks
    )
    if not isinstance(clips, list):
        write_log("Invalid tasks format")
        sys.exit(3)

    for i, clip in enumerate(clips):
        clip_id = clip.get("id") if isinstance(clip, dict) else f"clip-{i + 1}"
        clip_path = clip.get("path") if isinstance(clip, dict) else clip
        write_log(f"Starting clip {clip_id} -> {clip_path}")
        res = run_single(clip_id, clip_path)
        results.append(res)

    with open(OUTPUT_PATH, "w") as f:
        json.dump({"results": results}, f, indent=2)
    write_log(f"Wrote results to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
