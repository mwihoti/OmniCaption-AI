import { EmotionFrame } from '../types';
import { Heart } from 'lucide-react';

interface EmotionTimelineProps {
  emotions: EmotionFrame[];
  duration: number;
  onEmotionClick: (time: number) => void;
}

const emotionColors: Record<string, string> = {
  neutral: 'oklch(0.60 0.05 265)',
  excited: 'oklch(0.70 0.18 200)',
  confident: 'oklch(0.65 0.15 160)',
  proud: 'oklch(0.70 0.18 85)',
  curious: 'oklch(0.65 0.15 240)',
  happy: 'oklch(0.70 0.18 110)',
  concerned: 'oklch(0.60 0.15 30)',
  thoughtful: 'oklch(0.55 0.10 280)',
  optimistic: 'oklch(0.68 0.16 200)',
  celebratory: 'oklch(0.75 0.20 85)',
};

export default function EmotionTimeline({ emotions, duration, onEmotionClick }: EmotionTimelineProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-4 h-4 text-warm" />
        <h3 className="text-sm font-semibold text-text-primary">Emotion Timeline</h3>
        <span className="text-[10px] tag ml-auto">{emotions.length} data points</span>
      </div>

      {/* Emotion visualization bar */}
      <div className="h-8 rounded-lg overflow-hidden bg-bg-glass flex mb-4">
        {emotions.map((em, i) => {
          const width = i < emotions.length - 1
            ? ((emotions[i + 1].time - em.time) / duration) * 100
            : ((duration - em.time) / duration) * 100;
          return (
            <div
              key={i}
              className="flex items-center justify-center cursor-pointer relative group transition-opacity hover:opacity-80"
              style={{
                width: `${width}%`,
                background: emotionColors[em.emotion] || emotionColors.neutral,
                opacity: 0.5 + em.confidence * 0.4,
              }}
              onClick={() => onEmotionClick(em.time)}
              title={`${em.emotion} (${Math.round(em.confidence * 100)}%) at ${formatTime(em.time)}`}
            >
              <span className="text-[8px] font-medium text-white/70 truncate px-1 leading-none">
                {em.emotion}
              </span>
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-base text-[10px] text-text-primary px-2 py-1 rounded-lg border border-glass-border whitespace-nowrap z-10 pointer-events-none">
                <div className="font-medium mb-0.5 capitalize">{em.emotion}</div>
                <div className="text-text-muted">{Math.round(em.confidence * 100)}% confidence</div>
                <div className="text-text-muted">{em.explanation}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emotion list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {emotions.map((em, i) => (
          <button
            key={i}
            onClick={() => onEmotionClick(em.time)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-bg-glass transition-colors text-left cursor-pointer"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: emotionColors[em.emotion] || emotionColors.neutral }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary capitalize">{em.emotion}</span>
                <div className="flex-1 h-1 bg-bg-glass rounded-full max-w-[60px]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${em.confidence * 100}%`,
                      background: emotionColors[em.emotion] || emotionColors.neutral,
                    }}
                  />
                </div>
                <span className="text-[10px] text-text-muted">{Math.round(em.confidence * 100)}%</span>
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">{em.explanation}</p>
            </div>
            <span className="text-[10px] font-mono text-text-muted shrink-0">{formatTime(em.time)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}