import { useState, useCallback, useRef, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  MessageSquare,
  Accessibility,
  Star,
  Share2,
  Heart,
  SmilePlus,
  BookOpen,
  Cpu,
  Download,
  Clock,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";

import Header from "./components/Header";
import UploadZone from "./components/UploadZone";
import VideoPlayer from "./components/VideoPlayer";
import Timeline from "./components/Timeline";
import CaptionTabs from "./components/CaptionTabs";
import AccessibilityView from "./components/AccessibilityView";
import RawTranscript from "./components/RawTranscript";
import HighlightsPanel from "./components/HighlightsPanel";
import MemeGallery from "./components/MemeGallery";
import EmotionTimeline from "./components/EmotionTimeline";
import SocialExport from "./components/SocialExport";
import AgentPipeline from "./components/AgentPipeline";
import { mockResult, mockAgentStatuses } from "./data/mockData";
import {
  uploadVideo,
  pollJobUntilComplete,
  checkBackendHealth,
} from "./services/api";
import type { VideoAnalysisResult, AgentStatus } from "./types";

type ViewSection =
  | "player"
  | "captions"
  | "accessibility"
  | "highlights"
  | "emotions"
  | "memes"
  | "social"
  | "story";

const navItems: { id: ViewSection; label: string; icon: React.ReactNode }[] = [
  { id: "player", label: "Video", icon: <Video className="w-3.5 h-3.5" /> },
  {
    id: "captions",
    label: "Captions",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  {
    id: "accessibility",
    label: "Accessibility",
    icon: <Accessibility className="w-3.5 h-3.5" />,
  },
  {
    id: "highlights",
    label: "Highlights",
    icon: <Star className="w-3.5 h-3.5" />,
  },
  {
    id: "emotions",
    label: "Emotions",
    icon: <Heart className="w-3.5 h-3.5" />,
  },
  { id: "memes", label: "Memes", icon: <SmilePlus className="w-3.5 h-3.5" /> },
  { id: "social", label: "Export", icon: <Share2 className="w-3.5 h-3.5" /> },
  { id: "story", label: "Story", icon: <BookOpen className="w-3.5 h-3.5" /> },
];

export default function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSection, setActiveSection] = useState<ViewSection>("player");
  const [agents, setAgents] = useState<AgentStatus[]>(mockAgentStatuses);
  const [result, setResult] = useState<VideoAnalysisResult>(mockResult);
  // Expose the API URL used by the frontend (set via VITE_API_URL at dev or build time)
  const apiUrl =
    (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const [backendHealth, setBackendHealth] = useState<{
    healthy: boolean;
    groq: boolean;
    gemini: boolean;
    huggingface: boolean;
    fireworks: boolean;
  } | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Check backend health on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const health = await checkBackendHealth();
      if (!cancelled) {
        setBackendStatus(health.healthy ? "online" : "offline");
        setBackendHealth({
          healthy: health.healthy,
          groq: health.groq,
          gemini: health.gemini,
          huggingface: health.huggingface,
          fireworks: (health as any).fireworks || false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVideoSelected = useCallback((url: string, file?: File) => {
    setVideoUrl(url);
    if (file) setVideoFile(file);
    setIsComplete(false);
  }, []);

  const handleStartProcessing = useCallback(async () => {
    setIsProcessing(true);
    setIsComplete(false);
    setResult(mockResult);

    // Reset agents to processing state
    setAgents((prev) =>
      prev.map((a) => ({ ...a, status: "processing" as const, progress: 0 })),
    );

    // Try real backend first
    if (backendStatus === "online" && videoFile) {
      let jobStarted = false;
      try {
        // Upload video
        const job = await uploadVideo(videoFile);
        jobStarted = true;
        setLastJobId(job.job_id);

        // Poll until complete, updating agent statuses
        const liveResult = await pollJobUntilComplete(
          job.job_id,
          (agentStatuses, partialResult) => {
            setAgents(agentStatuses);
            if (partialResult) {
              setResult(partialResult);
              setIsComplete(true);
              setIsProcessing(false);
              setTimeout(
                () =>
                  resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
                300,
              );
            }
          },
        );

        setResult(liveResult);
        setIsComplete(true);
        setIsProcessing(false);
        setTimeout(
          () => resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
          300,
        );
        return;
      } catch (err) {
        if (jobStarted) {
          // A real analysis job is/was running — showing static demo data
          // here would silently mask the real results. Surface the error.
          console.error("Backend analysis failed:", err);
          setIsProcessing(false);
          alert(
            `Backend analysis failed: ${err instanceof Error ? err.message : String(err)}. ` +
              "The job may still be running — check the backend logs.",
          );
          return;
        }
        console.warn(
          "Backend upload failed, falling back to simulation:",
          err,
        );
        // Fall through to simulation
      }
    }

    // ─── Fallback: Simulate pipeline processing with staggered completion ───
    let completed = 0;
    const agentList = mockAgentStatuses;
    const interval = setInterval(() => {
      completed++;
      if (completed <= agentList.length) {
        setAgents((prev) =>
          prev.map((a, i) => ({
            ...a,
            status:
              i < completed
                ? ("complete" as const)
                : i === completed
                  ? ("processing" as const)
                  : ("pending" as const),
            progress: i < completed ? 1 : i === completed ? 0.6 : 0,
          })),
        );
      }
      if (completed >= agentList.length) {
        clearInterval(interval);
        setResult(mockResult);
        setIsProcessing(false);
        setIsComplete(true);
        setTimeout(
          () => resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
          300,
        );
      }
    }, 400);
  }, [backendStatus, videoFile]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const exportData = () => {
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "omnicaption-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-cinematic scan-lines">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "oklch(0.14 0.025 265)",
            color: "oklch(0.95 0.01 265)",
            border: "1px solid oklch(1 0 0 / 0.08)",
            borderRadius: "12px",
            fontSize: "13px",
          },
        }}
      />
      <Header />

      {/* Debug overlay: shows configured API URL and current backend status */}
      <div className="fixed bottom-4 left-4 z-50 p-2 rounded-md text-xs bg-bg-elevated border border-glass-border shadow-sm">
        <div className="font-medium text-[11px]">OmniCaption Debug</div>
        <div className="mt-1 text-[11px]">
          API: <span className="font-mono">{apiUrl}</span>
        </div>
        <div className="mt-0.5 text-[11px]">
          Backend:{" "}
          <span
            className={
              backendStatus === "online"
                ? "text-success"
                : backendStatus === "offline"
                  ? "text-error"
                  : "text-text-muted"
            }
          >
            {backendStatus}
          </span>
        </div>
        <div className="mt-1 text-[11px]">
          Providers:{" "}
          <span className="font-mono">
            {backendHealth
              ? `Fire:${backendHealth.fireworks ? "yes" : "no"}`
              : ""}
          </span>
        </div>
        <div className="mt-0.5 text-[11px]">
          {backendHealth ? (
            <div className="flex gap-2 mt-1">
              <span
                className={`text-xs ${backendHealth.groq ? "text-success" : "text-text-muted"}`}
              >
                Groq
              </span>
              <span
                className={`text-xs ${backendHealth.gemini ? "text-success" : "text-text-muted"}`}
              >
                Gemini
              </span>
              <span
                className={`text-xs ${backendHealth.huggingface ? "text-success" : "text-text-muted"}`}
              >
                HF
              </span>
              <span
                className={`text-xs ${backendHealth && backendHealth.fireworks ? "text-success" : "text-text-muted"}`}
              >
                FW
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Backend status indicator */}
      <div className="fixed top-0 right-20 z-50 mt-2 mr-2">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-md"
          style={{
            background:
              backendStatus === "online"
                ? "oklch(0.5 0.15 160 / 0.15)"
                : backendStatus === "offline"
                  ? "oklch(0.6 0.15 30 / 0.15)"
                  : "oklch(0.5 0.05 265 / 0.15)",
            border:
              backendStatus === "online"
                ? "1px solid oklch(0.6 0.15 160 / 0.3)"
                : backendStatus === "offline"
                  ? "1px solid oklch(0.6 0.15 30 / 0.3)"
                  : "1px solid oklch(0.5 0.05 265 / 0.3)",
            color:
              backendStatus === "online"
                ? "oklch(0.7 0.15 160)"
                : backendStatus === "offline"
                  ? "oklch(0.7 0.15 30)"
                  : "oklch(0.7 0.05 265)",
          }}
        >
          {backendStatus === "checking" ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Checking...
            </>
          ) : backendStatus === "online" ? (
            <>
              <Wifi className="w-2.5 h-2.5" />
              AI Backend Live
            </>
          ) : (
            <>
              <WifiOff className="w-2.5 h-2.5" />
              Demo Mode
            </>
          )}
        </div>
      </div>

      <main className="relative z-10 pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero / Upload Section */}
          <section className="mb-12">
            <UploadZone
              onVideoSelected={handleVideoSelected}
              onStartProcessing={handleStartProcessing}
              isProcessing={isProcessing}
            />
          </section>

          {/* Processing state */}
          <AnimatePresence>
            {isProcessing && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-12"
              >
                <AgentPipeline agents={agents} />
              </motion.section>
            )}
          </AnimatePresence>

          {/* Results Dashboard */}
          <AnimatePresence>
            {isComplete && !isProcessing && (
              <motion.div
                ref={resultsRef}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Results header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">
                        Analysis Complete
                      </h2>
                      <p className="text-xs text-text-muted">
                        {result.scenes.length} scenes ·{" "}
                        {result.highlights.length} highlights ·{" "}
                        {result.transcript.length} transcript segments
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {result.processingTimeMs > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        {result.processingTimeMs}ms
                      </div>
                    )}
                    {result.verificationScore > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-success">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {Math.round(result.verificationScore * 100)}% verified
                      </div>
                    )}
                    <button
                      onClick={exportData}
                      className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors bg-bg-glass px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export JSON
                    </button>
                  </div>
                </div>

                {/* Agent Pipeline (collapsible) */}
                <div className="mb-6">
                  <AgentPipeline agents={agents} />
                </div>

                {/* Section Navigation */}
                <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-none">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer
                        ${
                          activeSection === item.id
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : "text-text-muted hover:text-text-secondary hover:bg-bg-glass border border-transparent"
                        }
                      `}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Content Grid */}
                <div className="space-y-6">
                  {/* Video Player + Timeline */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div
                      className={`${activeSection === "player" ? "block" : "hidden lg:block"} lg:col-span-2`}
                    >
                      {videoUrl && (
                        <VideoPlayer
                          url={videoUrl}
                          currentTime={currentTime}
                          onTimeUpdate={handleTimeUpdate}
                          onDuration={setDuration}
                          highlights={result.highlights.map((h) => ({
                            startTime: h.startTime,
                            endTime: h.endTime,
                            title: h.title,
                          }))}
                        />
                      )}
                    </div>
                    <div
                      className={`${activeSection === "player" ? "block" : "hidden lg:block"} lg:col-span-1`}
                    >
                      <Timeline
                        scenes={result.scenes}
                        duration={duration || result.duration}
                        onSceneClick={handleSeek}
                      />
                    </div>
                  </div>

                  {/* Captions */}
                  <div
                    className={
                      activeSection === "captions" ? "block" : "hidden lg:block"
                    }
                  >
                    <CaptionTabs
                      captions={result.captions}
                      backendHealth={backendHealth}
                      verificationScore={result.verificationScore}
                    />
                  </div>

                  {/* Two-column: Accessibility + Highlights */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div
                      className={
                        activeSection === "accessibility"
                          ? "block"
                          : "hidden lg:block"
                      }
                    >
                      <AccessibilityView
                        descriptions={result.accessibilityDescriptions}
                        onTimestampClick={handleSeek}
                        audioSrc={videoUrl}
                      />
                      {/* Raw transcript panel for inspection */}
                      <div className="mt-4">
                        <RawTranscript transcript={result.transcript} />
                      </div>
                    </div>
                    <div
                      className={
                        activeSection === "highlights"
                          ? "block"
                          : "hidden lg:block"
                      }
                    >
                      <HighlightsPanel
                        highlights={result.highlights}
                        onHighlightClick={handleSeek}
                      />
                    </div>
                  </div>

                  {/* Two-column: Emotions + Memes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div
                      className={
                        activeSection === "emotions"
                          ? "block"
                          : "hidden lg:block"
                      }
                    >
                      <EmotionTimeline
                        emotions={result.emotions}
                        duration={duration || result.duration}
                        onEmotionClick={handleSeek}
                      />
                    </div>
                    <div
                      className={
                        activeSection === "memes" ? "block" : "hidden lg:block"
                      }
                    >
                      <MemeGallery memes={result.memes} />
                    </div>
                  </div>

                  {/* Social Export + Story Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div
                      className={
                        activeSection === "social" ? "block" : "hidden lg:block"
                      }
                    >
                      <SocialExport
                        posts={result.socialPosts}
                        storySummary={result.storySummary}
                      />
                    </div>
                    <div
                      className={
                        activeSection === "story"
                          ? "block lg:col-span-2"
                          : "hidden lg:block"
                      }
                    >
                      {/* Story Summary Card */}
                      <div className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <h3 className="text-sm font-semibold text-text-primary">
                            Story Summary
                          </h3>
                        </div>
                        <p className="text-sm text-text-primary leading-relaxed">
                          {result.storySummary}
                        </p>

                        {/* Chapters */}
                        <div className="mt-4 pt-4 border-t border-glass-border">
                          <h4 className="text-xs font-medium text-text-secondary mb-3">
                            Video Chapters
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {result.chapters.map((ch, i) => (
                              <button
                                key={i}
                                onClick={() => handleSeek(ch.time)}
                                className="flex items-center gap-2 bg-bg-glass rounded-lg px-3 py-2 text-left hover:bg-bg-elevated transition-colors cursor-pointer"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <div>
                                  <p className="text-[11px] font-medium text-text-primary">
                                    {ch.title}
                                  </p>
                                  <p className="text-[9px] font-mono text-text-muted">
                                    {Math.floor(ch.time / 60)}:
                                    {Math.floor(ch.time % 60)
                                      .toString()
                                      .padStart(2, "0")}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!videoUrl && !isProcessing && !isComplete && (
            <div className="mt-16 text-center">
              <div className="flex items-center justify-center gap-3 text-text-muted">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs">13 AI Agents</span>
                </div>
                <span className="w-px h-4 bg-glass-border" />
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  <span className="text-xs">Scene Detection</span>
                </div>
                <span className="w-px h-4 bg-glass-border" />
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">4 Caption Styles</span>
                </div>
                <span className="w-px h-4 bg-glass-border" />
                <div className="flex items-center gap-2">
                  <Accessibility className="w-4 h-4" />
                  <span className="text-xs">Accessibility</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-glass-border py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold gradient-text">
              OmniCaption AI
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Built for AMD Developer Hackathon: ACT II — Track 2 · Video
            Captioning
          </p>
        </div>
      </footer>
    </div>
  );
}
