import React from 'react';
import type { VideoAnalysisResult } from '../types';

interface RawTranscriptProps {
  transcript: VideoAnalysisResult['transcript'];
}

export default function RawTranscript({ transcript }: RawTranscriptProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!transcript || transcript.length === 0) {
    return (
      <div className="glass-card p-4">
        <h4 className="text-sm font-medium">Raw Transcript</h4>
        <p className="text-xs text-text-muted">No transcript segments available.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Raw Transcript</h4>
        <span className="text-xs text-text-muted">Segments: {transcript.length}</span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {transcript.map((seg, i) => (
          <div key={i} className="bg-bg-elevated p-2 rounded">
            <div className="flex items-baseline justify-between">
              <div className="text-[11px] font-mono text-text-secondary">{formatTime(seg.startTime)}</div>
              <div className="text-[11px] text-text-muted">{(seg as any).speaker || 'Speaker'}</div>
            </div>
            <p className="text-sm text-text-primary mt-1">{seg.text}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
              <span>confidence: {(seg as any).confidence ?? 0.0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
