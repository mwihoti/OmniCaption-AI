import { useState } from 'react';
import { CaptionSet, CaptionStyle } from '../types';
import { MessageSquare, Sparkles, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface CaptionTabsProps {
  captions: CaptionSet;
}

const tabs: { id: CaptionStyle; label: string; icon: string; color: string }[] = [
  { id: 'formal', label: 'Formal', icon: '📝', color: 'text-primary' },
  { id: 'sarcastic', label: 'Sarcastic', icon: '😏', color: 'text-accent' },
  { id: 'techHumor', label: 'Tech Humor', icon: '🤓', color: 'text-info' },
  { id: 'funny', label: 'Funny', icon: '😂', color: 'text-warm' },
];

export default function CaptionTabs({ captions }: CaptionTabsProps) {
  const [activeTab, setActiveTab] = useState<CaptionStyle>('formal');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(captions[activeTab]);
    setCopied(true);
    toast.success('Caption copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-text-primary">Generated Captions</h3>
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
              ${activeTab === tab.id
                ? 'bg-bg-elevated text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
              }
            `}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Caption content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <div className="bg-bg-glass rounded-xl p-4 min-h-[100px]">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className={`w-4 h-4 ${tabs.find(t => t.id === activeTab)?.color} shrink-0 mt-0.5`} />
              <p className="text-sm text-text-primary leading-relaxed">{captions[activeTab]}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="tag text-[10px]">
                {captions[activeTab].split(' ').length} words
              </span>
              <span className="tag text-[10px]">
                {captions[activeTab].length} chars
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}