import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Activity, Target, Zap, ChevronRight, Fingerprint, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }
};

const textFadeVariants = {
  hidden: { opacity: 0, filter: 'blur(10px)', y: 20 },
  show: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -100]);

  const teamMembers = [
    { name: "Ojas Gawande", seat: "202301040102", initials: "OG", color: "#6366F1" },
    { name: "Jai Sangle", seat: "202301040174", initials: "JS", color: "#8B5CF6" },
    { name: "Omkar Londhe", seat: "202301040027", initials: "OL", color: "#10B981" },
    { name: "Shlok Jaiswal", seat: "202301040182", initials: "SJ", color: "#F59E0B" }
  ];

  return (
    <div style={{ overflowX: 'hidden' }}>
      
      {/* ── Hero Section ── */}
      <motion.section 
        variants={containerVariants} initial="hidden" animate="show"
        style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 20px', position: 'relative' }}
      >
        <motion.div variants={itemVariants} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 90, height: 90, borderRadius: '24px',
          background: 'var(--accent-gradient)',
          boxShadow: '0 12px 32px rgba(99,102,241,0.4)',
          marginBottom: 32,
          transform: 'rotate(-10deg)'
        }}
        whileHover={{ rotate: 10, scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          <Activity color="#fff" size={48} />
        </motion.div>

        <motion.h1 variants={textFadeVariants} style={{ fontSize: '4.5rem', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.1, marginBottom: 24, maxWidth: 900 }}>
          Find the source of any media, <span className="text-gradient">Instantly.</span>
        </motion.h1>

        <motion.p variants={textFadeVariants} style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', maxWidth: 700, margin: '0 auto 48px', lineHeight: 1.6 }}>
          A Project Report on <strong>Mitsuketa</strong>. Powered by advanced perceptual hashing, BK-Trees, and acoustic fingerprinting. 
        </motion.p>

        <motion.div variants={itemVariants} style={{ display: 'flex', gap: 16 }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1.1rem' }}>
              Go to Dashboard <ChevronRight size={18} />
            </Link>
          ) : (
            <Link to="/signup" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1.1rem' }}>
              Get Started <ChevronRight size={18} />
            </Link>
          )}
          <Link to="/how-it-works" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1.1rem', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)' }}>
            How it Works <Zap size={18} />
          </Link>
        </motion.div>
      </motion.section>


      {/* ── Features ── */}
      <section style={{ padding: '80px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div 
          initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}
        >
          {[
            { icon: <Target />, title: "Audio & Video Hashing", desc: "Extracts constellation maps from audio and perceptual hashes (pHash) from video frames." },
            { icon: <Search />, title: "Sub-second Search", desc: "BK-Trees optimize the Hamming distance calculations, reducing O(N) search to O(log N)." },
            { icon: <Fingerprint />, title: "Robust Fingerprints", desc: "Resilient against compression, background noise, resolution changes, and minor cropping." }
          ].map((feat, i) => (
            <motion.div key={i} className="glass-panel" whileHover={{ y: -10, scale: 1.02 }} style={{ padding: 40, borderRadius: 24, transition: 'all 0.3s ease' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                {feat.icon}
              </div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: 12 }}>{feat.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Team & Guide ── */}
      <section style={{ padding: '100px 20px', background: 'var(--accent-light)', borderRadius: '40px 40px 0 0', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Submitted By</h2>
            <div style={{ width: 60, height: 4, background: 'var(--accent)', margin: '0 auto', borderRadius: 2 }} />
          </motion.div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32, marginBottom: 100 }}>
            {teamMembers.map((member, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ y: -15, rotate: i % 2 === 0 ? 2 : -2 }}
                className="card"
                style={{ width: 260, padding: '40px 24px', textAlign: 'center', borderRadius: 32, background: '#fff', border: `2px solid transparent`, position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: member.color }} />
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', background: `${member.color}15`, color: member.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, margin: '0 auto 24px'
                }}>
                  {member.initials}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>{member.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Seat No: {member.seat}</p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto', padding: 48, background: '#fff', borderRadius: 32, boxShadow: 'var(--shadow-lg)' }}
          >
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontWeight: 700 }}>Guided By</h2>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--accent-dark)' }}>Dr. Navnath Kale</h1>
          </motion.div>

        </div>
      </section>

    </div>
  );
}
