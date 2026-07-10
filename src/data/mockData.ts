import type { VideoAnalysisResult, AgentStatus } from '../types';

export const mockAgentStatuses: AgentStatus[] = [
  { name: 'Video Processing Agent', icon: 'Film', status: 'complete', progress: 1, description: 'Extracting frames, audio, and metadata' },
  { name: 'Scene Detection Agent', icon: 'SlidersHorizontal', status: 'complete', progress: 1, description: 'Detecting scene transitions and keyframes' },
  { name: 'Audio Intelligence Agent', icon: 'Volume2', status: 'complete', progress: 1, description: 'Analyzing speech, music, and environmental sounds' },
  { name: 'Speech Recognition Agent', icon: 'Mic', status: 'complete', progress: 1, description: 'Transcribing spoken dialogue with timestamps' },
  { name: 'Vision Understanding Agent', icon: 'Eye', status: 'complete', progress: 1, description: 'Analyzing frames with VLM (Gemma/Qwen3-VL)' },
  { name: 'Story Builder Agent', icon: 'BookOpen', status: 'complete', progress: 1, description: 'Reconstructing narrative from all inputs' },
  { name: 'Emotion Analysis Agent', icon: 'Heart', status: 'complete', progress: 1, description: 'Estimating emotions from faces, voice, and pacing' },
  { name: 'Accessibility Agent', icon: 'Accessibility', status: 'complete', progress: 1, description: 'Generating rich accessibility descriptions' },
  { name: 'Highlight Detection Agent', icon: 'Star', status: 'complete', progress: 1, description: 'Identifying key moments and highlights' },
  { name: 'Caption Generation Agent', icon: 'MessageSquare', status: 'complete', progress: 1, description: 'Generating 4 caption styles from factual story' },
  { name: 'Meme Generator', icon: 'SmilePlus', status: 'complete', progress: 1, description: 'Creating internet-ready memes grounded in video events' },
  { name: 'Social Media Generator', icon: 'Share2', status: 'complete', progress: 1, description: 'Repurposing content for X, LinkedIn, Instagram, YouTube' },
  { name: 'Verification Agent', icon: 'ShieldCheck', status: 'complete', progress: 1, description: 'Reviewing outputs for accuracy and consistency' },
];

export const mockResult: VideoAnalysisResult = {
  id: 'omni-001',
  title: 'Software Demo & Team Meeting',
  duration: 142,
  thumbnailUrl: '',
  status: 'complete',
  processingTimeMs: 8472,
  verificationScore: 0.94,
  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',

  scenes: [
    { id: 1, startTime: 0, endTime: 12, thumbnailFrame: 5, description: 'Team gathering around a conference table with laptops and notebooks' },
    { id: 2, startTime: 12, endTime: 31, thumbnailFrame: 18, description: 'Lead engineer standing in front of a large monitor presenting code' },
    { id: 3, startTime: 31, endTime: 55, thumbnailFrame: 40, description: 'Live demonstration of new software features on projector screen' },
    { id: 4, startTime: 55, endTime: 78, thumbnailFrame: 65, description: 'Team members asking questions, pointing at the screen' },
    { id: 5, startTime: 78, endTime: 102, thumbnailFrame: 90, description: 'QA engineer raises a concern about edge cases' },
    { id: 6, startTime: 102, endTime: 130, thumbnailFrame: 115, description: 'Discussion and collaborative problem-solving session' },
    { id: 7, startTime: 130, endTime: 142, thumbnailFrame: 136, description: 'Team applauding at the conclusion of the demo' },
  ],

  transcript: [
    { startTime: 2, endTime: 6, text: "Alright everyone, let's get started. Today we're demoing the new analytics dashboard.", speaker: "Sarah", confidence: 0.97 },
    { startTime: 7, endTime: 11, text: "We've been working on this for the past three sprints and I'm really excited to show you what we've built.", speaker: "Sarah", confidence: 0.95 },
    { startTime: 14, endTime: 18, text: "So the main architecture uses a microservices approach with real-time data streaming.", speaker: "James", confidence: 0.96 },
    { startTime: 19, endTime: 24, text: "We're processing about 50,000 events per second with a p99 latency of under 10 milliseconds.", speaker: "James", confidence: 0.94 },
    { startTime: 32, endTime: 37, text: "Let me show you the live dashboard. This is our new real-time analytics view.", speaker: "James", confidence: 0.98 },
    { startTime: 38, endTime: 44, text: "As you can see, we're tracking user engagement, error rates, and conversion funnels in real time.", speaker: "James", confidence: 0.96 },
    { startTime: 56, endTime: 60, text: "How does this handle the data consistency across multiple regions?", speaker: "Priya", confidence: 0.93 },
    { startTime: 61, endTime: 67, text: "Great question! We're using CRDTs for conflict resolution, so each region operates independently.", speaker: "James", confidence: 0.95 },
    { startTime: 80, endTime: 86, text: "I'm a bit concerned about the edge case where the cache invalidates during a write-heavy workload.", speaker: "Mike", confidence: 0.92 },
    { startTime: 87, endTime: 93, text: "That's a valid concern. We've actually implemented a write-through cache with a backpressure mechanism.", speaker: "Sarah", confidence: 0.94 },
    { startTime: 104, endTime: 110, text: "What if we batch the writes and use a circuit breaker pattern?", speaker: "James", confidence: 0.91 },
    { startTime: 111, endTime: 117, text: "I like that idea. Let's pair on it after this and spike out a prototype.", speaker: "Sarah", confidence: 0.93 },
    { startTime: 132, endTime: 137, text: "Amazing work everyone! This is exactly the kind of innovation we need.", speaker: "Sarah", confidence: 0.96 },
    { startTime: 138, endTime: 142, text: "Let's give James a round of applause for the demo!", speaker: "Sarah", confidence: 0.95 },
  ],

  audioEvents: [
    { time: 0, type: 'speech', description: 'Meeting begins with greetings', confidence: 0.95 },
    { time: 6, type: 'music', description: 'Soft ambient background music', confidence: 0.7 },
    { time: 31, type: 'silence', description: 'Brief pause for screen transition', confidence: 0.88 },
    { time: 55, type: 'speech', description: 'Question from team member', confidence: 0.94 },
    { time: 78, type: 'laughter', description: 'Friendly laughter at a comment', confidence: 0.91 },
    { time: 130, type: 'applause', description: 'Applause at the end of demo', confidence: 0.96 },
    { time: 140, type: 'speech', description: 'Closing remarks', confidence: 0.93 },
  ],

  visionAnalysis: [
    {
      location: 'Modern office conference room',
      people: 6,
      objects: ['laptop', 'projector', 'whiteboard', 'coffee mugs', 'smartphone', 'notebooks', 'pens'],
      actions: ['sitting at table', 'gesturing while speaking', 'taking notes', 'looking at screen'],
      composition: 'Wide angle shot of a conference table with team members seated around it',
      timeOfDay: 'Afternoon',
      setting: 'Office',
    },
    {
      location: 'Presentation area in front of conference room',
      people: 1,
      objects: ['large monitor', 'keyboard', 'presentation remote', 'standing desk'],
      actions: ['pointing at screen', 'speaking to audience', 'navigating presentation'],
      composition: 'Medium shot of presenter standing beside a wall-mounted monitor',
      timeOfDay: 'Afternoon',
      setting: 'Office',
    },
    {
      location: 'Projector screen showing analytics dashboard',
      people: 0,
      objects: ['projector screen', 'data charts', 'graphs', 'numbers', 'UI elements'],
      actions: ['data visualization updating in real time'],
      composition: 'Close-up of projected dashboard with colorful charts and metrics',
      timeOfDay: 'N/A',
      setting: 'Office',
    },
  ],

  storySummary: "A software engineering team gathers in a conference room for a demo of their new real-time analytics dashboard. Lead engineer James presents the architecture — a microservices system processing 50,000 events per second with sub-10ms latency. He demonstrates the live dashboard, showing real-time user engagement, error rates, and conversion funnel tracking. Team member Priya asks about cross-region data consistency, and James explains their CRDT-based approach. QA engineer Mike raises a concern about cache invalidation under heavy write loads, leading to a productive discussion about write-through caching and circuit breaker patterns. The team collaborates on solutions, agreeing to prototype a batched write approach. The demo concludes with applause and recognition of the team's innovative work.",

  emotions: [
    { time: 0, emotion: 'neutral', confidence: 0.85, explanation: 'Meeting starting, professional atmosphere' },
    { time: 10, emotion: 'excited', confidence: 0.78, explanation: 'Sarah expresses enthusiasm about the project' },
    { time: 20, emotion: 'confident', confidence: 0.82, explanation: 'James presenting architecture with assurance' },
    { time: 35, emotion: 'proud', confidence: 0.76, explanation: 'James showing off the live dashboard they built' },
    { time: 58, emotion: 'curious', confidence: 0.80, explanation: 'Priya asking a thoughtful question' },
    { time: 75, emotion: 'happy', confidence: 0.84, explanation: 'Team engaged and collaborative' },
    { time: 82, emotion: 'concerned', confidence: 0.72, explanation: 'Mike raising a valid concern about edge cases' },
    { time: 95, emotion: 'thoughtful', confidence: 0.77, explanation: 'Team processing the cache invalidation discussion' },
    { time: 110, emotion: 'optimistic', confidence: 0.81, explanation: 'Collaborative problem-solving energy' },
    { time: 135, emotion: 'celebratory', confidence: 0.90, explanation: 'Applause and recognition at demo conclusion' },
  ],

  highlights: [
    { id: 1, startTime: 14, endTime: 24, title: 'Architecture Reveal', description: 'James explains the microservices architecture processing 50K events/sec', category: 'demo', importance: 0.85 },
    { id: 2, startTime: 32, endTime: 44, title: 'Live Dashboard Demo', description: 'First look at the real-time analytics dashboard in action', category: 'demo', importance: 0.92 },
    { id: 3, startTime: 56, endTime: 67, title: 'CRDT Discussion', description: 'Priya asks about data consistency and James explains CRDT-based conflict resolution', category: 'meeting', importance: 0.78 },
    { id: 4, startTime: 80, endTime: 93, title: 'Edge Case Challenge', description: 'Mike raises cache invalidation concern — team discusses write-through caching', category: 'meeting', importance: 0.88 },
    { id: 5, startTime: 104, endTime: 117, title: 'Collaborative Solution', description: 'Team brainstorms circuit breaker pattern and pairs on a plan', category: 'meeting', importance: 0.82 },
    { id: 6, startTime: 132, endTime: 142, title: 'Team Celebration', description: 'Applause and recognition for James and the team', category: 'emotional', importance: 0.91 },
  ],

  captions: {
    formal: "The engineering team presented a comprehensive demo of their new real-time analytics dashboard, showcasing a microservices architecture capable of processing 50,000 events per second with sub-10 millisecond latency. Team members engaged in a productive discussion regarding data consistency across regions and cache invalidation strategies, concluding with a collaborative plan to implement a circuit breaker pattern. The presentation was met with enthusiastic applause.",
    sarcastic: "Oh look, another meeting that could have been an email — except this one actually had a working demo. James stood up there and casually mentioned processing 50K events per second like it was no big deal. Priya asked about data consistency (showing off), Mike brought up edge cases (classic QA), and somehow they left with an actual plan. Would recommend, 10/10 meeting experience.",
    techHumor: "James: 'We process 50K events/sec with p99 < 10ms.' Me, who struggles to process one notification without dropping my phone: 'Impressive.' Team discovers that CRDTs solve everything except deciding where to order lunch. QA engineer achieves final boss status by finding edge case #8472. Cache invalidation: still one of the two hard things in CS, but we're getting there. git push —celebrate",
    funny: "A team of engineers successfully held a meeting without anyone saying 'synergy' or 'circle back.' James showed off a dashboard that's way cooler than anything in The Matrix. Priya asked a question so smart it made everyone look at their notes. Mike, the QA hero, found a bug just by thinking really hard. They finished early AND had applause. This is fake, right?",
  },

  memes: [
    { id: 1, caption: "When you say you process 50K events/sec and everyone's impressed but you just googled the number this morning", timestamp: 20 },
    { id: 2, caption: "QA engineer: 'But what if...' — the entire dev team: 😰", timestamp: 80 },
    { id: 3, caption: "PM watching the demo work on the first try: 'Is this production or are we being punk'd?'", timestamp: 35 },
    { id: 4, caption: "When someone mentions CRDTs and you nod along hoping no one asks you to explain it", timestamp: 61 },
    { id: 5, caption: "The meeting that actually accomplished something — a rare sighting in the wild", timestamp: 140 },
  ],

  socialPosts: [
    {
      platform: 'x',
      content: "Just wrapped an incredible team demo! Our new real-time analytics dashboard processes 50K events/sec at p99 <10ms latency. Microservices + CRDTs = scalable, consistent data across regions. Shoutout to the engineering team for pushing boundaries! 🚀 #Tech #Innovation",
      hashtags: ['Tech', 'Innovation', 'RealTimeAnalytics', 'SoftwareEngineering'],
    },
    {
      platform: 'linkedin',
      content: "Today our engineering team demonstrated something we've been building for months: a real-time analytics dashboard that handles 50,000 events per second with remarkable consistency across regions. What made me proudest wasn't just the technology—it was the way the team came together to solve complex challenges around data consistency and cache invalidation. Great engineering happens when people ask hard questions and collaborate on answers.",
      hashtags: ['Engineering', 'Leadership', 'RealTimeData', 'TeamWork', 'TechInnovation'],
    },
    {
      platform: 'instagram',
      content: "Behind the scenes of today's big demo! 🚀 Our team crushed it — real-time analytics, microservices architecture, and the kind of collaboration that makes engineering awesome. Swipe ➡️ for dashboard action! #DevLife #TechTeam #DemoDay",
      hashtags: ['DevLife', 'TechTeam', 'DemoDay', 'SoftwareEngineering'],
    },
    {
      platform: 'youtube',
      content: "Watch our engineering team demo a new real-time analytics dashboard built on a microservices architecture. See how we process 50K events/sec, handle cross-region data consistency with CRDTs, and tackle cache invalidation challenges — all in a 2-minute team presentation.",
      hashtags: ['RealTimeAnalytics', 'Microservices', 'SoftwareDemo', 'Engineering'],
    },
  ],

  accessibilityDescriptions: [
    {
      timestamp: 0,
      visual: 'A bright, modern conference room with a glass wall. Six people are seated around a wooden table. Laptops and coffee mugs are scattered across the table.',
      audio: 'Soft ambient music plays in the background. A woman\'s voice begins speaking.',
      dialogue: '"Alright everyone, let\'s get started."',
      fullDescription: '[Soft ambient music] A bright conference room with floor-to-ceiling windows. Six team members sit around a polished wooden table with laptops open. [Woman speaking] "Alright everyone, let\'s get started. Today we\'re demoing the new analytics dashboard." Notebooks and coffee mugs dot the table. Natural afternoon light fills the room.',
    },
    {
      timestamp: 14,
      visual: 'A man in a blue shirt stands beside a large wall-mounted monitor. He gestures toward the screen displaying lines of code and architecture diagrams.',
      audio: 'The man speaks clearly and confidently. Keyboard clicks can be heard.',
      dialogue: '"The main architecture uses a microservices approach with real-time data streaming."',
      fullDescription: '[Man speaking confidently] A man in a blue button-up shirt stands at the front of the room beside a large monitor. The screen shows an architecture diagram with connected services. [Keyboard clicks] He gestures toward specific parts of the diagram while explaining. The team watches attentively, some taking notes. "The main architecture uses a microservices approach processing 50,000 events per second."',
    },
    {
      timestamp: 32,
      visual: 'The projector screen now shows a colorful dashboard with charts, graphs, and real-time updating numbers.',
      audio: 'Keyboard typing, then the presenter speaks with excitement in his voice.',
      dialogue: '"Let me show you the live dashboard. This is our new real-time analytics view."',
      fullDescription: '[Screen transition] The projector displays a sophisticated analytics dashboard with multiple data panels. [Keyboard typing] Colorful line charts track user engagement in real time. Error rate metrics flash green. A conversion funnel visualization shows user flow through the application. [Man speaking excitedly] "As you can see, we\'re tracking user engagement, error rates, and conversion funnels." Numbers update live on screen.',
    },
    {
      timestamp: 56,
      visual: 'A woman in a red blazer raises her hand slightly, leaning forward with a curious expression.',
      audio: 'A woman\'s voice asks a question, her tone thoughtful and inquisitive.',
      dialogue: '"How does this handle data consistency across multiple regions?"',
      fullDescription: '[Woman speaking] A woman in a red blazer seated at the table raises her hand slightly and leans forward, her expression focused and curious. Around her, team members turn to look as she asks her question. [Curious tone] "How does this handle data consistency across multiple regions?" The presenter nods, acknowledging the question with a smile.',
    },
    {
      timestamp: 130,
      visual: 'Team members smile and begin applauding. The presenter looks relieved and happy.',
      audio: 'Loud applause fills the room, mixed with cheerful voices.',
      dialogue: '"Amazing work everyone! Let\'s give James a round of applause!"',
      fullDescription: '[Applause] The room fills with the sound of enthusiastic clapping. All team members are smiling and applauding. The presenter, James, shows a relieved and proud expression, nodding gratefully. [Woman speaking warmly] "Amazing work everyone! Let\'s give James a round of applause!" Several team members exchange congratulatory glances. The mood is celebratory and warm.',
    },
  ],

  chapters: [
    { time: 0, title: 'Introduction & Kickoff' },
    { time: 12, title: 'Architecture Overview' },
    { time: 31, title: 'Live Dashboard Demo' },
    { time: 55, title: 'Q&A: Data Consistency' },
    { time: 78, title: 'Edge Case Discussion' },
    { time: 102, title: 'Collaborative Problem Solving' },
    { time: 130, title: 'Conclusion & Applause' },
  ],
};

export const sampleVideoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';