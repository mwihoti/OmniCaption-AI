import { Highlight } from '../types';
import { Star, Trophy, Target, Lightbulb, Heart, Laugh, Presentation, Microscope } from 'lucide-react';

interface HighlightsPanelProps {
  highlights: Highlight[];
  onHighlightClick: (time: number) => void;
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  sports: { icon: <Trophy className="w-3.5 h-3.5" />, color: 'text-accent', bg: 'bg-accent/10' },
  meeting: { icon: <Target className="w-3.5 h-3.5" />, color: 'text-primary', bg: 'bg-primary/10' },
  podcast: { icon: <Microscope className="w-3.5 h-3.5" />, color: 'text-info', bg: 'bg-info/10' },
  lecture: { icon: <Lightbulb className="w-3.5 h-3.5" />, color: 'text-warning', bg: 'bg-warning/10' },
  funny: { icon: <Laugh className="w-3.5 h-3.5" />, color: 'text-warm', bg: 'bg-warm/10' },
  emotional: { icon: <Heart className="w-3.5 h-3.5" />, color: 'text-error', bg: 'bg-error/10' },
  action: { icon: <Trophy className="w-3.5 h-3.5" />, color: 'text-accent', bg: 'bg-accent/10' },
  demo: { icon: <Presentation className="w-3.5 h-3.5" />, color: 'text-success', bg: 'bg-success/10' },
};

export default function HighlightsPanel({ highlights, onHighlightClick }: HighlightsPanelProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const sorted = [...highlights].sort((a, b) => b.importance - a.importance);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Key Highlights</h3>
        <span className="text-[10px] tag ml-auto">{highlights.length} moments</span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {sorted.map((highlight) => {
          const cfg = categoryConfig[highlight.category] || categoryConfig.meeting;
          return (
            <button
              key={highlight.id}
              onClick={() => onHighlightClick(highlight.startTime)}
              className="w-full glass-card !p-3 hover:border-glass-border-hover transition-all text-left group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                {/* Importance indicator */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <span className="text-[9px] font-mono text-text-muted">
                    {Math.round(highlight.importance * 100)}%
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-semibold text-text-primary">{highlight.title}</h4>
                    <span className="tag text-[9px]">{highlight.category}</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">{highlight.description}</p>
                  <p className="text-[10px] font-mono text-accent mt-1.5">
                    {formatTime(highlight.startTime)} – {formatTime(highlight.endTime)}
                  </p>
                </div>

                {/* Importance bar */}
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="w-2 h-16 rounded-full bg-bg-glass overflow-hidden">
                    <div
                      className="w-full bg-accent rounded-full transition-all"
                      style={{ height: `${highlight.importance * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}