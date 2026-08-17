import { motion } from 'framer-motion';
import {
  Sparkles,
  Accessibility,
  HeartPulse,
  Star,
  Laugh,
  Share2,
  Film,
  ShieldCheck,
  ArrowRight,
  Upload,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Sparkles className="w-4 h-4 text-primary" />,
    title: '4 Caption Styles',
    text: 'Formal, sarcastic, tech humor, and funny — same facts, different tones.',
  },
  {
    icon: <Accessibility className="w-4 h-4 text-accent" />,
    title: 'Accessibility First',
    text: 'Rich scene-by-scene descriptions for blind and low-vision users.',
  },
  {
    icon: <HeartPulse className="w-4 h-4 text-warm" />,
    title: 'Emotion Timeline',
    text: 'Track the emotional arc of the video from faces, voice, and pacing.',
  },
  {
    icon: <Star className="w-4 h-4 text-warning" />,
    title: 'Smart Highlights',
    text: 'Key moments detected automatically — goals, decisions, insights.',
  },
  {
    icon: <Laugh className="w-4 h-4 text-info" />,
    title: 'Meme Generator',
    text: 'AI meme captions grounded in what actually happens on screen.',
  },
  {
    icon: <Share2 className="w-4 h-4 text-success" />,
    title: 'Social Export',
    text: 'Ready-to-post content for X, LinkedIn, Instagram, and YouTube.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Upload',
    text: 'Drop any video — a meeting, lecture, match, or clip.',
  },
  {
    n: '02',
    title: 'Analyze',
    text: '13 specialized AI agents extract scenes, speech, emotion, and story.',
  },
  {
    n: '03',
    title: 'Verify',
    text: 'A verification agent self-reviews for hallucinations and accuracy.',
  },
  {
    n: '04',
    title: 'Export',
    text: 'Captions, accessibility narration, highlights, memes, and posts.',
  },
];

export default function HomeHero() {
  const scrollToUpload = () => {
    document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="mb-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-14"
      >
        <span className="tag text-[10px] uppercase tracking-widest text-primary border-primary/30 bg-primary/5 mb-5 inline-block">
          Multi-Agent Video Intelligence
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
          An AI that <span className="gradient-text">watches, understands,</span>
          <br className="hidden sm:block" /> and narrates any video
        </h1>
        <p className="text-text-secondary text-sm sm:text-base max-w-xl mx-auto mb-8">
          OmniCaption goes beyond transcription. Thirteen specialized agents work
          together to explain what happened, how it felt, why it matters — and
          how to share it with everyone.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={scrollToUpload}
            className="flex items-center gap-2 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer shadow-glow-sm"
          >
            <Upload className="w-4 h-4" />
            Analyze a Video
          </button>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors px-6 py-3 rounded-xl text-sm font-medium"
          >
            How it works
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-10 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-primary" /> 13 AI agents
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" /> 4 caption styles
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-success" /> Self-verifying
          </span>
          <span className="flex items-center gap-1.5">
            <Accessibility className="w-3.5 h-3.5 text-warm" /> Built for accessibility
          </span>
        </div>
      </motion.div>

      {/* Feature grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14"
      >
        {FEATURES.map((f) => (
          <div key={f.title} className="glass-card p-5">
            <div className="w-8 h-8 rounded-lg bg-bg-glass flex items-center justify-center mb-3">
              {f.icon}
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              {f.title}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">{f.text}</p>
          </div>
        ))}
      </motion.div>

      {/* How it works */}
      <motion.div
        id="how-it-works"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="scroll-mt-24"
      >
        <h2 className="text-center text-lg font-bold text-text-primary mb-6">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="glass-card p-5 relative overflow-hidden">
              <span className="absolute -top-2 right-3 text-4xl font-bold text-text-muted/10 select-none">
                {s.n}
              </span>
              <h3 className="text-sm font-semibold gradient-text mb-1">
                {s.title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
