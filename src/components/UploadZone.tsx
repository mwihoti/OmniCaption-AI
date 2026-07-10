import { useCallback, useState } from 'react';
import { Upload, Video, FileUp, Link, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadZoneProps {
  onVideoSelected: (url: string, file?: File) => void;
  onStartProcessing: () => void;
  isProcessing?: boolean;
}

export default function UploadZone({ onVideoSelected, onStartProcessing, isProcessing }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      onVideoSelected(url, file);
      setHasVideo(true);
    }
  }, [onVideoSelected]);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onVideoSelected(urlInput.trim(), null);
      setHasVideo(true);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onVideoSelected(url, file);
      setHasVideo(true);
    }
  };

  return (
    <section id="upload" className="max-w-3xl mx-auto">
      {!hasVideo ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Upload Your <span className="gradient-text">Video</span>
            </h2>
            <p className="text-text-secondary text-sm sm:text-base max-w-xl mx-auto">
              Drop any video — YouTube clip, meeting recording, sports highlight, or classroom lecture. Our 13 AI agents will analyze it from every angle.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative glass-card p-12 sm:p-16 cursor-pointer transition-all duration-200
              ${dragActive
                ? 'border-primary/50 bg-primary/5 shadow-glow-md scale-[1.01]'
                : 'hover:border-glass-border-hover hover:shadow-glow-sm'
              }
            `}
          >
            <input
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Upload a video file"
            />
            <div className="flex flex-col items-center gap-4">
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200
                ${dragActive ? 'bg-primary/20 scale-110' : 'bg-bg-elevated'}
              `}>
                <Upload className={`w-7 h-7 transition-colors ${dragActive ? 'text-primary' : 'text-text-muted'}`} />
              </div>
              <div>
                <p className="text-base font-medium text-text-primary mb-1">
                  {dragActive ? 'Drop it here!' : 'Drag & drop your video here'}
                </p>
                <p className="text-sm text-text-muted">or click to browse files</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted mt-2">
                <span>MP4, MOV, AVI</span>
                <span className="w-1 h-1 rounded-full bg-text-muted/40" />
                <span>Up to 2 minutes</span>
                <span className="w-1 h-1 rounded-full bg-text-muted/40" />
                <span>Any content</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-2 mx-auto cursor-pointer"
            >
              <Link className="w-4 h-4" />
              {showUrlInput ? 'Hide URL input' : 'Or paste a video URL'}
            </button>

            {showUrlInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 flex gap-2 max-w-md mx-auto"
              >
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="flex-1 bg-bg-elevated border border-glass-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
                <button onClick={handleUrlSubmit} className="btn-primary text-sm whitespace-nowrap cursor-pointer">
                  Load URL
                </button>
              </motion.div>
            )}
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5" />
              <span>13 AI Agents</span>
            </div>
            <div className="flex items-center gap-2">
              <FileUp className="w-3.5 h-3.5" />
              <span>4 Caption Styles</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Accessibility Ready</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Video loaded</p>
              <p className="text-xs text-text-muted">Ready for 13-agent analysis pipeline</p>
            </div>
          </div>
          <button onClick={onStartProcessing} className="btn-primary text-sm cursor-pointer">
            Start Analysis
          </button>
        </motion.div>
      )}
    </section>
  );
}