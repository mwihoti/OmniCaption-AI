import { SocialPost } from '../types';
import { Share2, Copy, Check } from 'lucide-react';
import { SiX, SiInstagram, SiYoutube } from 'react-icons/si';
import { FaLinkedin } from 'react-icons/fa';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface SocialExportProps {
  posts: SocialPost[];
  storySummary: string;
}

const platformConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  x: { icon: <SiX className="w-4 h-4" />, label: 'X / Twitter', color: 'text-white', bg: 'bg-black/40' },
  linkedin: { icon: <FaLinkedin className="w-4 h-4" />, label: 'LinkedIn', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  instagram: { icon: <SiInstagram className="w-4 h-4" />, label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-400/10' },
  youtube: { icon: <SiYoutube className="w-4 h-4" />, label: 'YouTube', color: 'text-red-400', bg: 'bg-red-400/10' },
};

export default function SocialExport({ posts, storySummary }: SocialExportProps) {
  const [copying, setCopying] = useState<string | null>(null);

  const handleCopy = (content: string, platform: string) => {
    navigator.clipboard.writeText(content);
    setCopying(platform);
    toast.success(`${platformConfig[platform]?.label || 'Post'} copied!`);
    setTimeout(() => setCopying(null), 2000);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-text-primary">Social Media Export</h3>
        <span className="text-[10px] tag ml-auto">{posts.length} platforms</span>
      </div>

      <p className="text-xs text-text-muted mb-4">
        Repurpose your video into platform-optimized content. One upload, multiple channels.
      </p>

      <div className="space-y-3">
        {posts.map((post) => {
          const cfg = platformConfig[post.platform];
          return (
            <div
              key={post.platform}
              className="bg-bg-glass rounded-xl p-4 border border-glass-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <span className="text-xs font-medium text-text-primary">{cfg.label}</span>
              </div>
              <p className="text-xs text-text-primary leading-relaxed mb-3">{post.content}</p>
              {post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.hashtags.map((tag) => (
                    <span key={tag} className="text-[10px] text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => handleCopy(post.content, post.platform)}
                className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-primary transition-colors cursor-pointer"
              >
                {copying === post.platform ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copying === post.platform ? 'Copied!' : 'Copy post'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Story Summary */}
      <div className="mt-4 pt-4 border-t border-glass-border">
        <h4 className="text-xs font-medium text-text-secondary mb-2">Story Summary</h4>
        <p className="text-xs text-text-muted leading-relaxed">{storySummary}</p>
      </div>
    </div>
  );
}