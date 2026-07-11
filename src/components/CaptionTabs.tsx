import { useState } from "react";
import { CaptionSet, CaptionStyle } from "../types";
import { MessageSquare, Sparkles, Copy, Check, Scissors, RotateCcw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { shortenCaption } from "../services/api";

interface CaptionTabsProps {
  captions: CaptionSet;
  backendHealth?: {
    groq: boolean;
    gemini: boolean;
    huggingface: boolean;
    fireworks?: boolean;
  } | null;
  verificationScore?: number;
}

const tabs: { id: CaptionStyle; label: string; icon: string; color: string }[] =
  [
    { id: "formal", label: "Formal", icon: "📝", color: "text-primary" },
    { id: "sarcastic", label: "Sarcastic", icon: "😏", color: "text-accent" },
    { id: "techHumor", label: "Tech Humor", icon: "🤓", color: "text-info" },
    { id: "funny", label: "Funny", icon: "😂", color: "text-warm" },
  ];

export default function CaptionTabs({
  captions,
  backendHealth = null,
  verificationScore = 0,
}: CaptionTabsProps) {
  const [activeTab, setActiveTab] = useState<CaptionStyle>("formal");
  const [copied, setCopied] = useState(false);
  const [shortened, setShortened] = useState<Partial<Record<CaptionStyle, string>>>({});
  const [loadingShort, setLoadingShort] = useState<Partial<Record<CaptionStyle, boolean>>>({});

  const displayText = shortened[activeTab] || captions[activeTab];
  const isShortened = activeTab in shortened;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    toast.success("Caption copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShorten = async () => {
    const text = captions[activeTab];
    if (!text || text.startsWith("[")) {
      toast.error("No real caption to shorten");
      return;
    }
    setLoadingShort((prev) => ({ ...prev, [activeTab]: true }));
    try {
      const res = await shortenCaption(text, activeTab);
      if (res.shortened && res.shortened !== text) {
        setShortened((prev) => ({ ...prev, [activeTab]: res.shortened }));
        toast.success("Caption shortened!");
      } else {
        toast.error("Could not shorten further");
      }
    } catch {
      toast.error("Failed to shorten caption");
    } finally {
      setLoadingShort((prev) => ({ ...prev, [activeTab]: false }));
    }
  };

  const handleRestore = () => {
    const next = { ...shortened };
    delete next[activeTab];
    setShortened(next);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-text-primary">
          Generated Captions
        </h3>
        <span className="text-[10px] tag ml-auto">4 styles</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-bg-glass rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer
              ${
                activeTab === tab.id
                  ? "bg-bg-elevated text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Caption content */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Source:</span>
          <span
            className={`text-[11px] ${backendHealth && backendHealth.fireworks ? "text-success" : backendHealth && backendHealth.groq ? "text-accent" : "text-text-muted"}`}
          >
            {backendHealth && backendHealth.fireworks
              ? "Fireworks"
              : backendHealth && backendHealth.groq
                ? "Groq"
                : "Fallback"}
          </span>
          <span className="ml-3 text-[11px] text-text-muted">
            Verified: {Math.round((verificationScore || 0) * 100)}%
          </span>
          {isShortened && (
            <span className="text-[10px] tag bg-primary/10 text-primary">Shortened</span>
          )}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (isShortened ? "-short" : "-full")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <div className="bg-bg-glass rounded-xl p-4 min-h-[100px]">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles
                className={`w-4 h-4 ${tabs.find((t) => t.id === activeTab)?.color} shrink-0 mt-0.5`}
              />
              <p className="text-sm text-text-primary leading-relaxed">
                {displayText}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="tag text-[10px]">
                {displayText.split(" ").length} words
              </span>
              <span className="tag text-[10px]">
                {displayText.length} chars
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isShortened ? (
                <button
                  onClick={handleRestore}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Show full
                </button>
              ) : (
                <button
                  onClick={handleShorten}
                  disabled={loadingShort[activeTab]}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 disabled:opacity-50 cursor-pointer"
                >
                  {loadingShort[activeTab] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Scissors className="w-3.5 h-3.5" />
                  )}
                  {loadingShort[activeTab] ? "Shortening..." : "Shorten"}
                </button>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
