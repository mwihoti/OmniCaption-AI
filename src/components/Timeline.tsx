import { Scene } from '../types';
import { Scissors, ChevronRight } from 'lucide-react';

interface TimelineProps {
  scenes: Scene[];
  duration: number;
  onSceneClick: (time: number) => void;
}

export default function Timeline({ scenes, duration, onSceneClick }: TimelineProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Scissors className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-text-primary">Scene Timeline</h3>
        <span className="text-xs text-text-muted ml-auto">{scenes.length} scenes detected</span>
      </div>

      <div className="relative">
        {/* Scene bar visualization */}
        <div className="h-3 rounded-full overflow-hidden bg-bg-glass flex mb-4">
          {scenes.map((scene) => {
            const width = ((scene.endTime - scene.startTime) / duration) * 100;
            const hue = (scene.id * 30) % 360;
            return (
              <div
                key={scene.id}
                className="h-full transition-opacity hover:opacity-80 cursor-pointer relative group"
                style={{ width: `${width}%`, background: `oklch(0.65 0.15 ${200 + scene.id * 10})` }}
                onClick={() => onSceneClick(scene.startTime)}
                title={`Scene ${scene.id}: ${scene.description.slice(0, 40)}...`}
              >
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-base text-[10px] text-text-primary px-2 py-0.5 rounded whitespace-nowrap border border-glass-border">
                  Scene {scene.id}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scene list */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onSceneClick(scene.startTime)}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg-glass transition-colors text-left group cursor-pointer"
            >
              <div
                className="w-1.5 h-full min-h-[2.5rem] rounded-full mt-0.5 shrink-0"
                style={{ background: `oklch(0.65 0.15 ${200 + scene.id * 10})` }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{scene.description}</p>
                <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                  {formatTime(scene.startTime)} – {formatTime(scene.endTime)}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}