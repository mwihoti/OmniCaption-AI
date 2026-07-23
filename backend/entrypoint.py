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
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from app import pipeline

# Where downloaded clips are staged (grader provides URLs, not local files).
DOWNLOAD_DIR = os.environ.get("DOWNLOAD_DIR", "/tmp/clips")


def resolve_source(clip_id, src):
    """Return a local video path. If src is an http(s) URL, download it first."""
    if not src:
        raise RuntimeError("clip has no path/url")
    if isinstance(src, str) and src.lower().startswith(("http://", "https://")):
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(src.split("?")[0])[1] or ".mp4"
        dest = os.path.join(DOWNLOAD_DIR, f"{clip_id}{ext}")
        write_log(f"Downloading {clip_id} from {src}")
        req = urllib.request.Request(src, headers={"User-Agent": "omnicaption/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as f:
            while True:
                chunk = resp.read(1 << 20)  # 1 MiB
                if not chunk:
                    break
                f.write(chunk)
        size = os.path.getsize(dest)
        if size == 0:
            raise RuntimeError(f"downloaded 0 bytes from {src}")
        write_log(f"Downloaded {clip_id}: {size} bytes -> {dest}")
        return dest
    return src  # already a local path

INPUT_PATH = "/input/tasks.json"
OUTPUT_PATH = "/output/results.json"
LOG_PATH = "/output/log.txt"

# Time budgets (seconds). Kept comfortably under a typical grader wall clock so
# we always flush results before the harness kills us. Override via env.
# Global budget is deliberately high: per-clip cap + incremental flush already
# bound hangs, so we'd rather let every clip run than self-skip and risk
# MISSING_TASKS. Lower it via env only if the grader's wall clock is tight.
GRADER_BUDGET_S = float(os.environ.get("GRADER_BUDGET_S", "1800"))
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


def run_single(job_id, src, budget_s):
    jobs_store = {
        job_id: {
            "status": "queued",
            "progress": 0.0,
            "file_path": src,
            "filename": os.path.basename((src or "").split("?")[0]),
            "created_at": "now",
            "result": None,
        }
    }

    def _on_timeout(signum, frame):
        raise _ClipTimeout(f"clip exceeded {budget_s:.0f}s budget")

    # SIGALRM interrupts blocking network calls (download + provider calls) so a
    # hung fetch or API can't stall the whole run.
    old_handler = signal.signal(signal.SIGALRM, _on_timeout)
    signal.setitimer(signal.ITIMER_REAL, max(1.0, budget_s))
    try:
        video_path = resolve_source(job_id, src)  # downloads URLs, bounded by the budget
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
        write_log(f"ERROR running pipeline for {src}: {e}")
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
        if isinstance(clip, dict):
            # Preserve the grader's task id EXACTLY; accept common field names.
            clip_id = (
                clip.get("id")
                or clip.get("task_id")
                or clip.get("clip_id")
                or clip.get("name")
                or f"clip-{i + 1}"
            )
            clip_path = (
                clip.get("path")
                or clip.get("url")
                or clip.get("video_url")
                or clip.get("video")
            )
        else:
            clip_id = f"clip-{i + 1}"
            clip_path = clip

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
