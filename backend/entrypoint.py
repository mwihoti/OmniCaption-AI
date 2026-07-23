#!/usr/bin/env python3
"""
Batch entrypoint for grader.

Reads /input/tasks.json (either {"clips":[{id,path},...]} or a list of paths),
runs pipeline.run_pipeline for each clip, and writes /output/results.json and
/output/log.txt.

Reliability guarantees (to avoid TIMEOUT / empty-output failures):
  * results.json is written INCREMENTALLY after every clip, so a mid-run kill
    still leaves valid, scorable output on disk.
  * Each clip is bounded by a hard per-clip timeout (PER_CLIP_BUDGET_S).
  * The whole run is bounded by a global deadline (GRADER_BUDGET_S); once it is
    reached we stop starting new clips and flush what we have.
"""

import json
import os
import signal
import sys
import time
import traceback

sys.path.insert(0, os.path.dirname(__file__))
from app import pipeline

INPUT_PATH = "/input/tasks.json"
OUTPUT_PATH = "/output/results.json"
LOG_PATH = "/output/log.txt"

# Time budgets (seconds). Kept comfortably under a typical grader wall clock so
# we always flush results before the harness kills us. Override via env.
GRADER_BUDGET_S = float(os.environ.get("GRADER_BUDGET_S", "600"))
PER_CLIP_BUDGET_S = float(os.environ.get("PER_CLIP_BUDGET_S", "180"))


class _ClipTimeout(Exception):
    pass


def write_log(msg):
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(msg + "\n")
        f.flush()


def flush_results(results):
    """Atomically write the current results so a later kill can't corrupt them."""
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    tmp = OUTPUT_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"results": results}, f, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, OUTPUT_PATH)


def read_tasks():
    if not os.path.exists(INPUT_PATH):
        raise FileNotFoundError(f"{INPUT_PATH} not found")
    return json.load(open(INPUT_PATH, "r"))


def run_single(job_id, video_path, budget_s):
    jobs_store = {
        job_id: {
            "status": "queued",
            "progress": 0.0,
            "file_path": video_path,
            "filename": os.path.basename(video_path or ""),
            "created_at": "now",
            "result": None,
        }
    }

    def _on_timeout(signum, frame):
        raise _ClipTimeout(f"clip exceeded {budget_s:.0f}s budget")

    # SIGALRM interrupts blocking network calls in the pipeline, so a hung
    # provider can't stall the whole run.
    old_handler = signal.signal(signal.SIGALRM, _on_timeout)
    signal.setitimer(signal.ITIMER_REAL, max(1.0, budget_s))
    try:
        pipeline.run_pipeline(job_id, video_path, jobs_store)
        return jobs_store[job_id].get("result") or {
            "id": job_id,
            "status": "error",
            "error": "pipeline produced no result",
        }
    except _ClipTimeout as e:
        write_log(f"TIMEOUT on clip {job_id}: {e}")
        partial = jobs_store[job_id].get("result")
        if partial:
            partial["status"] = "partial"
            partial["error"] = str(e)
            return partial
        return {"id": job_id, "status": "timeout", "error": str(e)}
    except Exception as e:
        write_log(f"ERROR running pipeline for {video_path}: {e}")
        write_log(traceback.format_exc())
        return {"id": job_id, "status": "error", "error": str(e)}
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old_handler)


def main():
    start = time.time()
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    # Write an empty-but-valid results file up front so we never leave /output
    # bare, even if we're killed during the very first clip.
    flush_results([])

    try:
        tasks = read_tasks()
    except Exception as e:
        write_log(f"Failed to read tasks.json: {e}")
        flush_results([])
        sys.exit(2)

    clips = (
        tasks.get("clips") if isinstance(tasks, dict) and "clips" in tasks else tasks
    )
    if not isinstance(clips, list):
        write_log("Invalid tasks format")
        flush_results([])
        sys.exit(3)

    results = []
    for i, clip in enumerate(clips):
        clip_id = clip.get("id") if isinstance(clip, dict) else f"clip-{i + 1}"
        clip_path = clip.get("path") if isinstance(clip, dict) else clip

        elapsed = time.time() - start
        remaining = GRADER_BUDGET_S - elapsed
        if remaining <= 5:
            write_log(
                f"Global budget exhausted after {elapsed:.0f}s — "
                f"skipping remaining {len(clips) - i} clip(s)."
            )
            results.append(
                {"id": clip_id, "status": "skipped", "error": "global time budget exhausted"}
            )
            flush_results(results)
            continue

        # Leave headroom so we can always flush; never exceed the per-clip cap.
        clip_budget = min(PER_CLIP_BUDGET_S, remaining - 3)
        write_log(
            f"Starting clip {clip_id} -> {clip_path} (budget {clip_budget:.0f}s)"
        )
        res = run_single(clip_id, clip_path, clip_budget)
        results.append(res)
        flush_results(results)  # incremental: survive a later kill

    flush_results(results)
    write_log(f"Wrote results to {OUTPUT_PATH} ({len(results)} clip(s))")


if __name__ == "__main__":
    main()
