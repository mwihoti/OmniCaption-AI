/**
 * OmniCaption AI — Backend API Client
 *
 * Connects to the Python FastAPI backend.
 * Falls back to mock data if backend is unreachable.
 */

import { mockAgentStatuses } from "../data/mockData";
import type { VideoAnalysisResult, AgentStatus, CaptionStyle } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://localhost:8000");

interface JobResponse {
  job_id: string;
  status: string;
  message: string;
}

interface JobStatus {
  job_id: string;
  status: string;
  progress: number;
  current_agent?: string;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Upload a video and start the analysis pipeline.
 * Returns the job ID for status polling.
 */
export async function uploadVideo(file: File): Promise<JobResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Poll the status of a video analysis job.
 * Returns the current job status including result when complete.
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.status}`);
  }

  return response.json();
}

/**
 * Convert a backend job result to our frontend VideoAnalysisResult type.
 */
function transformBackendResult(
  jobResult: Record<string, unknown>,
  jobId: string,
): VideoAnalysisResult {
  return {
    id: jobId || "live-001",
    title: (jobResult.title as string) || "Video Analysis",
    duration: (jobResult.duration as number) || 0,
    thumbnailUrl: "",
    status: "complete",
    processingTimeMs: (jobResult.processingTimeMs as number) || 0,
    verificationScore: (jobResult.verificationScore as number) || 0,
    videoUrl: "",
    scenes: (jobResult.scenes as VideoAnalysisResult["scenes"]) || [],
    transcript:
      (jobResult.transcript as VideoAnalysisResult["transcript"]) || [],
    audioEvents:
      (jobResult.audioEvents as VideoAnalysisResult["audioEvents"]) || [],
    visionAnalysis:
      (jobResult.visionAnalysis as VideoAnalysisResult["visionAnalysis"]) || [],
    storySummary: (jobResult.storySummary as string) || "",
    emotions: (jobResult.emotions as VideoAnalysisResult["emotions"]) || [],
    highlights:
      (jobResult.highlights as VideoAnalysisResult["highlights"]) || [],
    captions: (jobResult.captions as VideoAnalysisResult["captions"]) || {
      formal: "",
      sarcastic: "",
      techHumor: "",
      funny: "",
    },
    memes: (jobResult.memes as VideoAnalysisResult["memes"]) || [],
    socialPosts:
      (jobResult.socialPosts as VideoAnalysisResult["socialPosts"]) || [],
    accessibilityDescriptions:
      (jobResult.accessibilityDescriptions as VideoAnalysisResult["accessibilityDescriptions"]) ||
      [],
    chapters: (jobResult.chapters as VideoAnalysisResult["chapters"]) || [],
  };
}

/**
 * Convert progress info to an AgentStatus array for the pipeline simulation.
 */
function progressToAgentStatuses(
  progress: number,
  currentAgent?: string,
): AgentStatus[] {
  const agentList = mockAgentStatuses;

  // Calculate how many agents should be "done" based on progress
  const completedCount = Math.floor(progress * agentList.length);

  return agentList.map((agent, index) => {
    if (index < completedCount) {
      return { ...agent, status: "complete", progress: 1 };
    }
    if (index === completedCount && agent.name === currentAgent) {
      return { ...agent, status: "processing", progress: 0.5 };
    }
    if (index === completedCount) {
      return { ...agent, status: "processing", progress: 0.5 };
    }
    return { ...agent, status: "pending", progress: 0 };
  });
}

/**
 * Poll a job until it completes or errors.
 * Calls onProgress with intermediate agent statuses.
 * Returns the final VideoAnalysisResult.
 */
export async function pollJobUntilComplete(
  jobId: string,
  onProgress?: (
    agentStatuses: AgentStatus[],
    result?: VideoAnalysisResult,
  ) => void,
): Promise<VideoAnalysisResult> {
  return new Promise((resolve, reject) => {
    let pollCount = 0;
    let consecutiveErrors = 0;
    const maxPolls = 1200; // 20 minutes — slow free-tier providers can take a while
    const intervalMs = 1000; // poll every second
    const maxConsecutiveErrors = 5; // tolerate transient network blips

    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        consecutiveErrors = 0;
        pollCount++;

        // Report progress
        const agentStatuses = progressToAgentStatuses(
          status.progress,
          status.current_agent,
        );

        if (status.status === "complete" && status.result) {
          const result = transformBackendResult(status.result, jobId);
          onProgress?.(agentStatuses, result);
          resolve(result);
          return;
        }

        if (status.status === "error") {
          onProgress?.(agentStatuses);
          reject(new Error(status.error || "Analysis failed"));
          return;
        }

        if (pollCount >= maxPolls) {
          reject(new Error("Analysis timed out"));
          return;
        }

        onProgress?.(agentStatuses);
        setTimeout(poll, intervalMs);
      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          reject(err);
          return;
        }
        setTimeout(poll, intervalMs * 2);
      }
    };

    poll();
  });
}

/**
 * Check if the backend is reachable.
 */
export async function checkBackendHealth(): Promise<{
  healthy: boolean;
  groq: boolean;
  gemini: boolean;
  huggingface: boolean;
  fireworks: boolean;
  nvidia: boolean;
  geminiModel?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok)
      return {
        healthy: false,
        groq: false,
        gemini: false,
        huggingface: false,
        fireworks: false,
        nvidia: false,
      };
    const data = await response.json();
    return {
      healthy: data.status === "healthy",
      groq: data.groq_configured || false,
      gemini: data.gemini_configured || false,
      huggingface: data.huggingface_configured || false,
      fireworks: data.fireworks_configured || false,
      nvidia: data.nvidia_configured || false,
      geminiModel: data.gemini_model,
    };
  } catch {
    return {
      healthy: false,
      groq: false,
      gemini: false,
      huggingface: false,
      fireworks: false,
      nvidia: false,
    };
  }
}

export interface ShortenCaptionResponse {
  original: string;
  shortened: string;
  style: string;
}

export async function shortenCaption(
  text: string,
  style: CaptionStyle,
): Promise<ShortenCaptionResponse> {
  const response = await fetch(`${API_BASE}/api/captions/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, style }),
  });
  if (!response.ok) {
    throw new Error(`Shorten caption failed: ${response.status}`);
  }
  return response.json();
}
