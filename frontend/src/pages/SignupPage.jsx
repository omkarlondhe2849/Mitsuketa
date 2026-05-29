import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [form, setForm]       = useState({ username: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  // Password strength indicator
  const pwStrength = (() => {
    const pw = form.password;
    if (!pw) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['transparent', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
    return { score, label: labels[score], color: colors[score] };
  })();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password || !form.confirm) {
      setError('Please fill in all fields');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Registration failed');
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F1F5F9 0%, #EEF2FF 50%, #F0FDFA 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
            marginBottom: 16,
          }}>
            <Activity color="#fff" size={28} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            <span className="text-gradient">Mitsuketa</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
            Find the Source
          </p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '20px 0' }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--success-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CheckCircle2 size={32} color="var(--success)" />
                </div>
                <h2 style={{ marginBottom: 8 }}>Account Created!</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  You've been assigned <strong>viewer</strong> access.<br />
                  Redirecting to login…
                </p>
              </motion.div>
            ) : (
              <motion.div key="form">
                <h2 style={{ fontSize: '1.3rem', marginBottom: 6 }}>Create account</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 28 }}>
                  You'll start with <strong>viewer</strong> access. An admin can promote your role.
                </p>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="alert alert-error"
                      style={{ marginBottom: 20 }}
                    >
                      <AlertCircle size={16} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="su-username">Username</label>
                    <input id="su-username" className="input-field" name="username"
                      type="text" placeholder="min 3 chars, letters/numbers/-/_"
                      value={form.username} onChange={handleChange} autoFocus />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="su-email">Email</label>
                    <input id="su-email" className="input-field" name="email"
                      type="email" placeholder="you@example.com"
                      value={form.email} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="su-password">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input id="su-password" className="input-field" name="password"
                        type={showPw ? 'text' : 'password'} placeholder="min 8 characters"
                        value={form.password} onChange={handleChange}
                        style={{ paddingRight: 48 }} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Password strength bar */}
                    {form.password && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                          {[1,2,3,4].map(i => (
                            <div key={i} style={{
                              flex: 1, height: 3, borderRadius: 2,
                              background: i <= pwStrength.score ? pwStrength.color : 'var(--border)',
                              transition: 'background 0.3s',
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: pwStrength.color, fontWeight: 600 }}>
                          {pwStrength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="su-confirm">Confirm Password</label>
                    <input id="su-confirm" name="confirm"
                      type="password" placeholder="Repeat password"
                      value={form.confirm} onChange={handleChange}
                      className={`input-field${form.confirm && form.confirm !== form.password ? ' error' : ''}`}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    style={{ marginTop: 4, padding: '13px 0', fontSize: '0.95rem' }}
                  >
                    {loading ? <span className="spinner" /> : <UserPlus size={18} />}
                    {loading ? 'Creating account…' : 'Create Account'}
                  </motion.button>
                </form>

                <div className="divider" />
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
