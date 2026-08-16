import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  captions?: string;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  onDuration?: (duration: number) => void;
  highlights?: { startTime: number; endTime: number; title: string }[];
}

export default function VideoPlayer({ url, captions, currentTime, onTimeUpdate, onDuration, highlights }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCaptions, setShowCaptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
      onTimeUpdate?.(video.currentTime);
    };

    const handleDuration = () => {
      setDuration(video.duration);
      onDuration?.(video.duration);
    };

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleError = () => {
      const err = video.error;
      setError(err ? `Video failed to load (code ${err.code})` : 'Video failed to load');
      setPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    video.addEventListener('error', handleError);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [onTimeUpdate, onDuration]);

  // Reset the error when a new source is loaded.
  useEffect(() => {
    setError(null);
  }, [url]);

  // Seek only when the parent requests a jump (timeline/highlight click).
  // Small deltas are the video's own timeupdate echoed back through props —
  // seeking on those stalls playback in a feedback loop.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentTime === undefined) return;
    if (Math.abs(video.currentTime - currentTime) > 1) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch((err) => {
        console.error('Video play failed:', err);
        setError(err instanceof Error ? err.message : 'Playback failed');
      });
    } else {
      video.pause();
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const time = pct * duration;
    videoRef.current.currentTime = time;
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Video Container */}
      <div className="relative bg-black aspect-video group">
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          playsInline
          muted={muted}
        />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-xs text-white/80 px-4 text-center">{error}</p>
          </div>
        )}

        {/* Play/Pause overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {!playing && (
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all">
              <Play className="w-7 h-7 text-white ml-0.5" />
            </div>
          )}
        </div>

        {/* Highlight markers on video */}
        {duration > 0 && highlights && highlights.map((h, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-0.5 bg-accent/70 hover:bg-accent transition-colors cursor-pointer group/marker"
            style={{ left: `${(h.startTime / duration) * 100}%` }}
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = h.startTime;
            }}
            title={h.title}
          >
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/marker:opacity-100 transition-opacity bg-bg-base text-[10px] text-accent whitespace-nowrap px-2 py-0.5 rounded-full border border-accent/30">
              {h.title}
            </div>
          </div>
        ))}

        {/* Captions overlay */}
        {showCaptions && captions && (
          <div className="absolute bottom-16 left-0 right-0 px-4 text-center">
            <p className="inline-block bg-black/70 text-white text-sm px-4 py-2 rounded-lg backdrop-blur-sm max-w-lg mx-auto">
              {captions}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-3 flex items-center gap-4 bg-bg-elevated">
        <button
          onClick={togglePlay}
          className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 bg-bg-glass rounded-full cursor-pointer relative group"
          onClick={handleProgressBarClick}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-100 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-glow-sm" />
          </div>
        </div>

        <span className="text-xs text-text-muted font-mono min-w-[70px] text-right">
          {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
        </span>

        <button
          onClick={() => setShowCaptions(!showCaptions)}
          className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
            showCaptions ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
          aria-label="Toggle captions"
        >
          CC
        </button>

        <button
          onClick={() => setMuted(!muted)}
          className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Fullscreen"
          onClick={() => videoRef.current?.requestFullscreen()}
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}