import { motion } from 'framer-motion';
import { AgentStatus } from '../types';
import {
  Film, SlidersHorizontal, Volume2, Mic, Eye, BookOpen, Heart,
  Accessibility, Star, MessageSquare, SmilePlus, Share2, ShieldCheck,
  CheckCircle2, Circle, Loader2, AlertCircle, ChevronDown
} from 'lucide-react';
import { useState } from 'react';

interface AgentPipelineProps {
  agents: AgentStatus[];
}

const agentIcons: Record<string, React.ReactNode> = {
  'Video Processing Agent': <Film className="w-3.5 h-3.5" />,
  'Scene Detection Agent': <SlidersHorizontal className="w-3.5 h-3.5" />,
  'Audio Intelligence Agent': <Volume2 className="w-3.5 h-3.5" />,
  'Speech Recognition Agent': <Mic className="w-3.5 h-3.5" />,
  'Vision Understanding Agent': <Eye className="w-3.5 h-3.5" />,
  'Story Builder Agent': <BookOpen className="w-3.5 h-3.5" />,
  'Emotion Analysis Agent': <Heart className="w-3.5 h-3.5" />,
  'Accessibility Agent': <Accessibility className="w-3.5 h-3.5" />,
  'Highlight Detection Agent': <Star className="w-3.5 h-3.5" />,
  'Caption Generation Agent': <MessageSquare className="w-3.5 h-3.5" />,
  'Meme Generator': <SmilePlus className="w-3.5 h-3.5" />,
  'Social Media Generator': <Share2 className="w-3.5 h-3.5" />,
  'Verification Agent': <ShieldCheck className="w-3.5 h-3.5" />,
};

const statusConfig = {
  pending: { icon: <Circle className="w-3.5 h-3.5" />, color: 'text-text-muted', bg: 'bg-bg-glass' },
  processing: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: 'text-primary', bg: 'bg-primary/10' },
  complete: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-success', bg: 'bg-success/10' },
  error: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-error', bg: 'bg-error/10' },
};

export default function AgentPipeline({ agents }: AgentPipelineProps) {
  const [expanded, setExpanded] = useState(false);
  const completeCount = agents.filter(a => a.status === 'complete').length;

  return (
    <div className="glass-card p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 mb-3 cursor-pointer"
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">AI Agent Pipeline</h3>
          <span className="tag text-[10px]">{completeCount}/{agents.length} complete</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Pipeline flow visualization */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
        {agents.map((agent, i) => {
          const cfg = statusConfig[agent.status];
          return (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.color} transition-all`} title={agent.name}>
                {agentIcons[agent.name] || <Circle className="w-3 h-3" />}
              </div>
              {i < agents.length - 1 && (
                <div className={`w-3 h-px ${agent.status === 'complete' ? 'bg-success/50' : 'bg-glass-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded agent list */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-1 max-h-[400px] overflow-y-auto pr-1"
        >
          {agents.map((agent, i) => {
            const cfg = statusConfig[agent.status];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-glass transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{agent.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted">{agent.description}</p>
                </div>
                {agent.status === 'processing' && (
                  <div className="w-16 h-1.5 bg-bg-glass rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.progress * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}