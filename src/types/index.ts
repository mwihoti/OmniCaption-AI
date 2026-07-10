export interface Scene {
  id: number;
  startTime: number;
  endTime: number;
  thumbnailFrame: number;
  description: string;
  keyframeUrl?: string;
}

export interface AudioEvent {
  time: number;
  type: 'speech' | 'music' | 'sound_effect' | 'silence' | 'applause' | 'laughter';
  description: string;
  confidence: number;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence: number;
}

export interface VisionAnalysis {
  location: string;
  people: number;
  objects: string[];
  actions: string[];
  composition: string;
  timeOfDay?: string;
  setting?: string;
}

export interface EmotionFrame {
  time: number;
  emotion: string;
  confidence: number;
  explanation: string;
}

export interface Highlight {
  id: number;
  startTime: number;
  endTime: number;
  title: string;
  description: string;
  category: 'sports' | 'meeting' | 'podcast' | 'lecture' | 'funny' | 'emotional' | 'action' | 'demo';
  importance: number; // 0-1
}

export interface CaptionSet {
  formal: string;
  sarcastic: string;
  techHumor: string;
  funny: string;
}

export interface Meme {
  id: number;
  caption: string;
  template?: string;
  timestamp: number;
}

export interface SocialPost {
  platform: 'x' | 'linkedin' | 'instagram' | 'youtube';
  content: string;
  hashtags: string[];
}

export interface AccessibilityDescription {
  timestamp: number;
  visual: string;
  audio: string;
  dialogue: string;
  fullDescription: string;
}

export interface VideoAnalysisResult {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  scenes: Scene[];
  transcript: TranscriptSegment[];
  audioEvents: AudioEvent[];
  visionAnalysis: VisionAnalysis[];
  storySummary: string;
  emotions: EmotionFrame[];
  highlights: Highlight[];
  captions: CaptionSet;
  memes: Meme[];
  socialPosts: SocialPost[];
  accessibilityDescriptions: AccessibilityDescription[];
  chapters: { time: number; title: string }[];
  verificationScore: number;
  processingTimeMs: number;
  status: 'processing' | 'complete' | 'error';
  videoUrl?: string;
}

export interface AgentStatus {
  name: string;
  icon: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  description: string;
}

export type CaptionStyle = 'formal' | 'sarcastic' | 'techHumor' | 'funny';