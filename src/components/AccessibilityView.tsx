import { AccessibilityDescription } from '../types';
import { Accessibility, Eye, Ear, MessageSquare, BookOpen } from 'lucide-react';

interface AccessibilityViewProps {
  descriptions: AccessibilityDescription[];
  onTimestampClick: (time: number) => void;
}

export default function AccessibilityView({ descriptions, onTimestampClick }: AccessibilityViewProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Accessibility className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-text-primary">Accessibility Descriptions</h3>
        <span className="text-[10px] tag ml-auto">For blind & low-vision users</span>
      </div>

      <p className="text-xs text-text-muted mb-4">
        Rich scene-by-scene descriptions combining visual, audio, and dialogue into a complete narrative.
      </p>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {descriptions.map((desc, i) => (
          <div key={i} className="bg-bg-glass rounded-xl p-4">
            {/* Time stamp */}
            <button
              onClick={() => onTimestampClick(desc.timestamp)}
              className="text-[10px] font-mono text-accent hover:text-accent-hover mb-2 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              {formatTime(desc.timestamp)}
            </button>

            {/* Full rich description */}
            <p className="text-xs text-text-primary leading-relaxed mb-3 italic">
              "{desc.fullDescription}"
            </p>

            {/* Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-bg-elevated rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Eye className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-medium text-text-secondary">Visual</span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">{desc.visual}</p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Ear className="w-3 h-3 text-accent" />
                  <span className="text-[10px] font-medium text-text-secondary">Audio</span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">{desc.audio}</p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="w-3 h-3 text-info" />
                  <span className="text-[10px] font-medium text-text-secondary">Dialogue</span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">"{desc.dialogue}"</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}