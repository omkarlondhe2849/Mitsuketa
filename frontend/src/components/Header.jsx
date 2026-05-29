import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, LogOut, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/mitsuketa';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 10000,
    enabled: isAuthenticated,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeClass = role => {
    if (role === 'admin') return 'role-badge role-admin';
    if (role === 'moderator') return 'role-badge role-moderator';
    return 'role-badge role-viewer';
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: '20px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      {/* Logo */}
      <Link to={isAuthenticated ? "/dashboard" : "/"} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          position: 'relative', width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          borderRadius: 12,
          boxShadow: '0 4px 14px rgba(99,102,241,0.30)',
        }}>
          <Activity color="#fff" size={24} />
        </div>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
            Mitsuketa
          </h1>
          <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Find the Source
          </span>
        </div>
      </Link>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        
        {/* Always show How It Works */}
        <Link to="/how-it-works" style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 'var(--radius-full)',
              background: location.pathname === '/how-it-works' ? 'var(--accent-light)' : 'transparent',
              border: `1px solid ${location.pathname === '/how-it-works' ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
              color: location.pathname === '/how-it-works' ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            How it Works
          </motion.div>
        </Link>

        <div style={{ width: 1, height: 32, background: 'var(--border)' }} />

        {isAuthenticated ? (
          <>
            {/* Stats pills */}
            {stats && (
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Media', value: stats.total_media || 0 },
                  { label: 'Audio FPs', value: (stats.total_audio_fingerprints || 0).toLocaleString() },
                  { label: 'Video FPs', value: (stats.total_video_fingerprints || 0).toLocaleString() },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Admin link */}
            {user?.role === 'admin' && (
              <>
                <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
                <Link
                  to="/admin"
                  style={{ textDecoration: 'none' }}
                >
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 'var(--radius-full)',
                      background: location.pathname === '/admin' ? 'var(--accent-light)' : 'transparent',
                      border: `1px solid ${location.pathname === '/admin' ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                      color: location.pathname === '/admin' ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Shield size={14} />
                    Admin
                  </motion.div>
                </Link>
              </>
            )}

            {/* User chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px 6px 10px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.8rem', fontWeight: 800,
                flexShrink: 0,
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--text-primary)' }}>
                  {user?.username}
                </div>
                <span className={roleBadgeClass(user?.role)} style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Logout */}
            <motion.button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{ gap: 6, color: 'var(--danger)' }}
              title="Sign out"
            >
              <LogOut size={16} />
              Sign out
            </motion.button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
