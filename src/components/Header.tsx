import { Cpu, Menu, X } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { useState } from 'react';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-x-0 border-t-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center glow-cyan">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text tracking-tight">OmniCaption AI</h1>
            <p className="text-[10px] text-text-muted -mt-0.5">Video Intelligence Agent</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#upload" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Upload</a>
          <a href="#pipeline" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Pipeline</a>
          <a href="#results" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Results</a>
          <a href="#export" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Export</a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <SiGithub className="w-5 h-5" />
          </a>
          <span className="tag text-[10px] uppercase tracking-widest text-primary border-primary/30 bg-primary/5">
            AMD Hackathon
          </span>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden glass-card rounded-none border-x-0 border-b-0 border-t border-glass-border">
          <nav className="px-4 py-3 flex flex-col gap-2">
            <a href="#upload" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary hover:text-text-primary transition-colors py-2">Upload</a>
            <a href="#pipeline" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary hover:text-text-primary transition-colors py-2">Pipeline</a>
            <a href="#results" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary hover:text-text-primary transition-colors py-2">Results</a>
            <a href="#export" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary hover:text-text-primary transition-colors py-2">Export</a>
          </nav>
        </div>
      )}
    </header>
  );
}