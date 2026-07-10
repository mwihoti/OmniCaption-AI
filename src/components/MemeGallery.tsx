import { Meme } from '../types';
import { SmilePlus, Copy, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface MemeGalleryProps {
  memes: Meme[];
}

export default function MemeGallery({ memes }: MemeGalleryProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (meme: Meme) => {
    navigator.clipboard.writeText(meme.caption);
    setCopiedId(meme.id);
    toast.success('Meme caption copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <SmilePlus className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Meme Generator</h3>
        <span className="text-[10px] tag ml-auto">AI-generated from video</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {memes.map((meme) => (
          <div
            key={meme.id}
            className="bg-bg-glass rounded-xl p-4 border border-glass-border hover:border-accent/30 transition-all group"
          >
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-text-primary leading-relaxed">
                "{meme.caption}"
              </p>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-glass-border">
              <span className="text-[10px] text-text-muted font-mono">
                @ {Math.floor(meme.timestamp)}s
              </span>
              <button
                onClick={() => handleCopy(meme)}
                className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors cursor-pointer"
              >
                {copiedId === meme.id ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedId === meme.id ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}