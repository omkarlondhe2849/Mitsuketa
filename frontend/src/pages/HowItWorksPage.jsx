import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileAudio, Settings, Database, CheckCircle, Fingerprint, Activity, Layers, Network, ChevronDown } from 'lucide-react';

// ── Presentation Content ──
const steps = [
  {
    id: 1,
    title: "1. Media Ingestion & Pre-processing",
    icon: <FileAudio size={28} />,
    color: "#6366F1", // Indigo
    text: "The pipeline begins when raw media is uploaded. Mitsuketa extracts the audio track using FFmpeg and standardizes it to a mono channel at a 22,050 Hz sample rate. For video, it extracts keyframes at a rate of 1 frame per second. This normalization ensures that regardless of the input format, the subsequent fingerprinting algorithms receive consistent data.",
    deepDive: "Normalization is critical. If we didn't force a consistent sample rate (22.05 kHz) or frame rate (1 fps), the resulting hashes would vary wildly based on the container format or encoding settings of the uploaded file."
  },
  {
    id: 2,
    title: "2. Audio Fingerprinting (FFT & Constellation)",
    icon: <Activity size={28} />,
    color: "#F59E0B", // Amber
    text: "The audio signal is sliced into overlapping windows. A Fast Fourier Transform (FFT) is applied to each window to generate a spectrogram (frequency over time). We then identify 'peaks'—the loudest frequencies in a local neighborhood—to create a Constellation Map.",
    deepDive: "Why Constellation Maps? Background noise rarely affects the most prominent frequency peaks. By storing only the peaks (time and frequency coordinates), the fingerprint becomes highly resistant to compression and ambient noise."
  },
  {
    id: 3,
    title: "3. Video Fingerprinting (DCT & pHash)",
    icon: <Layers size={28} />,
    color: "#EC4899", // Pink
    text: "Extracted video frames are converted to grayscale and resized to a 32x32 pixel block to discard high-frequency details. A Discrete Cosine Transform (DCT) is then applied. We extract the top-left 8x8 matrix (low frequencies) and compute a median value. Pixels above the median become 1, and below become 0, forming a 64-bit Perceptual Hash (pHash).",
    deepDive: "Unlike cryptographic hashes (SHA-256) where a 1-pixel change alters the entire hash, pHash is continuous. If a video is compressed, cropped, or slightly color-shifted, the resulting 64-bit hash remains largely identical."
  },
  {
    id: 4,
    title: "4. Indexing (Combinatorial Hashing)",
    icon: <Database size={28} />,
    color: "#10B981", // Emerald
    text: "For audio, individual constellation peaks aren't unique enough. We pair each 'anchor' peak with 'target' peaks in a defined time-frequency target zone. This creates a combinatorial hash (Anchor Freq + Target Freq + Delta Time). These hashes are stored securely in our PostgreSQL database.",
    deepDive: "A 3-minute song can generate over 10,000 combinatorial hashes. This redundancy means even if a 10-second snippet is recorded on a phone in a noisy room, enough matching pairs will survive to identify the track."
  },
  {
    id: 5,
    title: "5. Search Optimization (BK-Trees)",
    icon: <Network size={28} />,
    color: "#8B5CF6", // Purple
    text: "To find a matching video frame, we compare the query pHash against millions of database hashes. Instead of checking every record O(N), we use a Burkhard-Keller (BK) Tree. It structures data based on the Hamming Distance (number of differing bits) between hashes. This reduces search time to O(log N).",
    deepDive: "Hamming Distance calculates bitwise differences (e.g., 1011 XOR 1001 = 0010 -> Distance 1). The BK-Tree prunes entire branches that mathematically cannot contain a match within our tolerance threshold (e.g., distance <= 10), enabling sub-second query times."
  }
];

// ── Animated Diagram Components ──

const IngestionAnimation = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40 }}>
    <div style={{ position: 'relative' }}>
      {/* File Icon */}
      <motion.div 
        animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: 100, height: 130, background: 'linear-gradient(135deg, #E0E7FF, #C7D2FE)', borderRadius: 16, border: '2px solid #818CF8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(99,102,241,0.2)' }}
      >
        <FileAudio size={48} color="#4F46E5" />
        <div style={{ marginTop: 16, fontWeight: 800, color: '#4F46E5', letterSpacing: 2 }}>MEDIA</div>
      </motion.div>
      {/* Scanning Laser */}
      <motion.div 
        animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ position: 'absolute', left: -20, right: -20, height: 4, background: '#10B981', boxShadow: '0 0 20px #10B981, 0 0 40px #10B981', borderRadius: 2, zIndex: 10 }}
      />
    </div>
    
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Processing nodes */}
      {[1, 2, 3].map(i => (
        <motion.div key={i}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
          style={{ width: 16, height: 16, borderRadius: '50%', background: '#6366F1' }}
        />
      ))}
    </div>
  </div>
);

const AudioAnimation = () => {
  // Generate random peaks for the constellation map
  const peaks = Array.from({ length: 40 }).map((_, i) => ({
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
    delay: Math.random() * 2
  }));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0F172A', borderRadius: 40, overflow: 'hidden' }}>
      
      {/* 3D Grid representing Time/Frequency */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '40px 40px', transform: 'perspective(500px) rotateX(60deg) scale(2)', transformOrigin: 'top center' }} />

      {/* Animated Waveform */}
      <motion.svg width="90%" height="30%" viewBox="0 0 400 100" style={{ position: 'absolute', top: '10%', filter: 'drop-shadow(0 0 10px #F59E0B)' }}>
        <motion.path 
          d="M 0 50 Q 50 0 100 50 T 200 50 T 300 50 T 400 50" 
          fill="transparent" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round"
          animate={{ scaleY: [1, 1.5, 0.8, 1] }}
          style={{ originY: 0.5 }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>

      {/* Constellation Peaks */}
      <div style={{ position: 'absolute', bottom: '10%', width: '80%', height: '50%', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
        {peaks.map((peak, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0.4, 1], scale: [0, 1.5, 1, 1.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: peak.delay }}
            style={{ position: 'absolute', left: `${peak.x}%`, top: `${peak.y}%`, width: 6, height: 6, background: '#FCD34D', borderRadius: '50%', boxShadow: '0 0 12px 4px rgba(245, 158, 11, 0.6)' }}
          />
        ))}
      </div>
      
      <div style={{ position: 'absolute', bottom: 20, color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600, letterSpacing: 2 }}>CONSTELLATION MAP</div>
    </div>
  );
};

const VideoAnimation = () => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, background: '#FDF2F8', borderRadius: 40 }}>
      
      {/* Transformation Sequence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        
        {/* Original Frame */}
        <motion.div style={{ width: 80, height: 80, background: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=160&h=160&fit=crop")', backgroundSize: 'cover', borderRadius: 12, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
        
        <ChevronDown size={24} color="#EC4899" style={{ transform: 'rotate(-90deg)' }} />

        {/* Grayscale & Pixelated */}
        <motion.div 
          animate={{ filter: ["grayscale(0%) blur(0px)", "grayscale(100%) blur(2px)", "grayscale(100%) blur(2px)"] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ width: 80, height: 80, background: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=160&h=160&fit=crop")', backgroundSize: 'cover', borderRadius: 12, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} 
        />

        <ChevronDown size={24} color="#EC4899" style={{ transform: 'rotate(-90deg)' }} />

        {/* DCT Grid (8x8) */}
        <div style={{ width: 80, height: 80, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1, background: '#FBCFE8', border: '2px solid #EC4899', borderRadius: 8, overflow: 'hidden' }}>
          {[...Array(64)].map((_, i) => (
            <motion.div key={i}
              animate={{ backgroundColor: [ '#F9A8D4', Math.random() > 0.5 ? '#111827' : '#F9FAFB', Math.random() > 0.5 ? '#111827' : '#F9FAFB' ] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          ))}
        </div>
      </div>

      {/* Binary Output */}
      <motion.div 
        animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity }}
        style={{ background: '#111827', color: '#10B981', padding: '16px 24px', borderRadius: 12, fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: 6, boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)' }}
      >
        10110010110...
      </motion.div>
      <div style={{ color: '#EC4899', fontWeight: 700, fontSize: '0.9rem', letterSpacing: 1 }}>64-BIT PERCEPTUAL HASH</div>
    </div>
  );
};

const IndexingAnimation = () => {
  const targetZones = [ { x: 50, y: 30 }, { x: 70, y: 50 }, { x: 60, y: 70 } ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#ECFDF5', borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Background Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#A7F3D0 2px, transparent 2px)', backgroundSize: '30px 30px', opacity: 0.5 }} />

      {/* Anchor Peak */}
      <motion.div 
        initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ position: 'absolute', left: '20%', top: '50%', width: 24, height: 24, background: '#059669', borderRadius: '50%', boxShadow: '0 0 0 8px rgba(5, 150, 105, 0.2)', zIndex: 10 }}
      >
        <div style={{ position: 'absolute', top: -25, left: -20, fontWeight: 800, color: '#059669', fontSize: '0.8rem' }}>ANCHOR</div>
      </motion.div>

      {/* Target Zone Bounding Box */}
      <motion.div 
        initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: '40%' }} transition={{ duration: 1, delay: 0.5 }}
        style={{ position: 'absolute', left: '40%', top: '20%', height: '60%', border: '3px dashed #34D399', borderRadius: 16, background: 'rgba(52, 211, 153, 0.1)' }}
      >
        <div style={{ position: 'absolute', top: -25, right: 10, fontWeight: 800, color: '#059669', fontSize: '0.8rem' }}>TARGET ZONE</div>
      </motion.div>

      {/* Target Peaks and Connections */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 5 }}>
        {targetZones.map((pos, i) => (
          <g key={i}>
            {/* Target Dot */}
            <motion.circle cx={`${pos.x}%`} cy={`${pos.y}%`} r="8" fill="#10B981" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 + i * 0.3 }} />
            {/* Connecting Line */}
            <motion.line x1="20%" y1="50%" x2={`${pos.x}%`} y2={`${pos.y}%`} stroke="#059669" strokeWidth="3" strokeDasharray="6 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 1.5 + i * 0.3, repeat: Infinity, repeatDelay: 2 }} />
            {/* Floating Hash Data */}
            <motion.text x={`${(20 + pos.x)/2}%`} y={`${(50 + pos.y)/2 - 10}%`} fill="#065F46" fontSize="12" fontWeight="bold" initial={{ opacity: 0, y: 10 }} animate={{ opacity: [0, 1, 0], y: -20 }} transition={{ duration: 2, delay: 2 + i * 0.3, repeat: Infinity, repeatDelay: 1 }}>
              [fA, fT, Δt]
            </motion.text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const BKTreeAnimation = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#F5F3FF', borderRadius: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, overflow: 'hidden' }}>
      
      {/* Query Incoming */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity }}
        style={{ position: 'absolute', top: 0, background: '#4C1D95', color: '#fff', padding: '6px 16px', borderRadius: 20, fontWeight: 800, fontSize: '0.9rem', zIndex: 20, boxShadow: '0 10px 20px rgba(76, 29, 149, 0.3)' }}
      >
        Query Hash
      </motion.div>

      {/* Root Node */}
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#7C3AED', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.2rem', zIndex: 10, boxShadow: '0 10px 25px rgba(124, 58, 237, 0.4)' }}>
        ROOT
      </div>

      <svg style={{ position: 'absolute', top: 120, width: '100%', height: '100%', zIndex: 1 }}>
        {/* Static Branches */}
        <line x1="50%" y1="0" x2="20%" y2="80" stroke="#DDD6FE" strokeWidth="4" />
        <line x1="50%" y1="0" x2="50%" y2="80" stroke="#DDD6FE" strokeWidth="4" />
        <line x1="50%" y1="0" x2="80%" y2="80" stroke="#DDD6FE" strokeWidth="4" />

        {/* Level 2 Branches (from middle node) */}
        <line x1="50%" y1="80" x2="35%" y2="160" stroke="#DDD6FE" strokeWidth="4" />
        <line x1="50%" y1="80" x2="65%" y2="160" stroke="#DDD6FE" strokeWidth="4" />

        {/* Animated Search Path (Success Path) */}
        <motion.line x1="50%" y1="0" x2="50%" y2="80" stroke="#7C3AED" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.5, repeat: Infinity, repeatDelay: 2.2 }} />
        <motion.line x1="50%" y1="80" x2="65%" y2="160" stroke="#7C3AED" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 1.3, repeat: Infinity, repeatDelay: 2.2 }} />
      </svg>

      {/* Level 1 Nodes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '80%', marginTop: 20, zIndex: 10 }}>
        {/* Pruned Branch */}
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 3, repeat: Infinity }} style={{ width: 48, height: 48, borderRadius: '50%', background: '#C4B5FD', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6D28D9', fontWeight: 800 }}>d=12</motion.div>
        
        {/* Active Branch */}
        <motion.div animate={{ scale: [1, 1.2, 1], background: ['#8B5CF6', '#7C3AED', '#8B5CF6'] }} transition={{ duration: 3, delay: 0.5, repeat: Infinity }} style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>d=2</motion.div>
        
        {/* Pruned Branch */}
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 3, repeat: Infinity }} style={{ width: 48, height: 48, borderRadius: '50%', background: '#C4B5FD', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6D28D9', fontWeight: 800 }}>d=25</motion.div>
      </div>

      {/* Level 2 Nodes (Match Found) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 60, width: '100%', marginTop: 30, zIndex: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#C4B5FD', border: '3px solid #fff' }} />
        
        <motion.div 
          animate={{ scale: [1, 1.4, 1], boxShadow: ["0 0 0px #10B981", "0 0 30px #10B981", "0 0 0px #10B981"] }} 
          transition={{ duration: 3, delay: 1.3, repeat: Infinity }} 
          style={{ width: 64, height: 64, borderRadius: '50%', background: '#10B981', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}
        >
          <CheckCircle size={32} />
        </motion.div>
      </div>

      {/* Status Overlay */}
      <motion.div 
        animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 3, delay: 1.3, repeat: Infinity }}
        style={{ position: 'absolute', bottom: 30, background: '#10B981', color: '#fff', padding: '10px 24px', borderRadius: 30, fontWeight: 800, letterSpacing: 1, boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)' }}
      >
        MATCH FOUND IN O(log N)
      </motion.div>
    </div>
  );
};

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(1);

  // Intersection observer to track which section is currently in view
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.step-section');
      let currentStep = 1;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        // If the top of the section is somewhat in the middle of the viewport
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
          currentStep = parseInt(section.getAttribute('data-step'));
        }
      });
      setActiveStep(currentStep);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAnimation = (id) => {
    switch (id) {
      case 1: return <IngestionAnimation />;
      case 2: return <AudioAnimation />;
      case 3: return <VideoAnimation />;
      case 4: return <IndexingAnimation />;
      case 5: return <BKTreeAnimation />;
      default: return <IngestionAnimation />;
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: 16 }}>Architecture <span className="text-gradient">Deep Dive</span></h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>An interactive guide for external presentation.</p>
      </div>

      <div style={{ display: 'flex', gap: 60, position: 'relative', alignItems: 'flex-start' }}>
        
        {/* Left Column: Scrolling Content */}
        <div style={{ flex: 1, paddingBottom: '50vh' }}>
          {steps.map((step) => (
            <div 
              key={step.id} 
              className="step-section" 
              data-step={step.id}
              style={{ 
                minHeight: '80vh', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                opacity: activeStep === step.id ? 1 : 0.4,
                transition: 'opacity 0.5s ease',
                padding: '40px 0'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)', color: step.color, marginBottom: 24 }}>
                {step.icon}
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: 24, color: 'var(--text-primary)' }}>{step.title}</h2>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 32 }}>
                {step.text}
              </p>
              
              {/* Deep Dive Box */}
              <div style={{ background: 'var(--bg-glass)', border: `1px solid ${step.color}40`, borderLeft: `4px solid ${step.color}`, padding: '24px', borderRadius: '0 16px 16px 0', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: step.color, marginBottom: 12, fontWeight: 800 }}>Technical Detail</h4>
                <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {step.deepDive}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Sticky Animated Diagram */}
        <div style={{ flex: 1, position: 'sticky', top: 120, height: 'calc(100vh - 200px)' }}>
          <div style={{ 
            width: '100%', height: '100%', 
            background: 'var(--bg-card)', 
            borderRadius: 40, 
            boxShadow: 'var(--shadow-lg)', 
            border: '1px solid var(--border)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              >
                {/* Render the specific animation based on active step */}
                {getAnimation(activeStep)}
              </motion.div>
            </AnimatePresence>

            {/* Indicator overlay */}
            <div style={{ position: 'absolute', bottom: 24, left: 24, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: 20, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Diagram {activeStep} of {steps.length}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
