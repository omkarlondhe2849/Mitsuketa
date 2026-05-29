import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Shield, UserCheck, UserX, ChevronDown,
  Plus, AlertCircle, RefreshCw, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLES = ['viewer', 'moderator', 'admin'];

const roleBadgeClass = role => {
  if (role === 'admin') return 'role-badge role-admin';
  if (role === 'moderator') return 'role-badge role-moderator';
  return 'role-badge role-viewer';
};

function useAdminApi() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchUsers = () =>
    fetch('/api/admin/users', { headers }).then(r => r.json());

  const changeRole = (userId, role) =>
    fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH', headers, body: JSON.stringify({ role }),
    }).then(r => r.json());

  const deactivateUser = userId =>
    fetch(`/api/admin/users/${userId}/deactivate`, { method: 'PATCH', headers }).then(r => r.json());

  const activateUser = userId =>
    fetch(`/api/admin/users/${userId}/activate`, { method: 'PATCH', headers }).then(r => r.json());

  const createUser = payload =>
    fetch('/api/admin/users', {
      method: 'POST', headers, body: JSON.stringify(payload),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.detail); }); return r.json(); });

  return { fetchUsers, changeRole, deactivateUser, activateUser, createUser };
}

// ── Create User Modal ────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }) {
  const { createUser } = useAdminApi();
  const [form, setForm]   = useState({ username: '', email: '', password: '', role: 'viewer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createUser(form);
      onCreated();
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.93, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 16 }}
        className="card"
        style={{ width: '100%', maxWidth: 420, padding: 32 }}
      >
        <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Create New User</h3>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={15}/>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="input-field" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))} placeholder="username" required/>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input-field" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@example.com" required/>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input-field" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="min 8 chars" required minLength={8}/>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="input-field" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}}/> : <Plus size={15}/>}
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────────────
export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const api = useAdminApi();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const loadUsers = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.fetchUsers();
      setUsers(data.users || []);
    } catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const withAction = async (id, fn) => {
    setActionLoading(s => ({...s, [id]: true}));
    try { await fn(); await loadUsers(); }
    catch (e) { setError(e.message || 'Action failed'); }
    finally { setActionLoading(s => ({...s, [id]: false})); }
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    inactive: users.filter(u => !u.is_active).length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', margin: 0 }}>Admin Panel</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>Manage user accounts and permissions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadUsers} style={{ gap: 6 }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} style={{ gap: 6 }}>
            <Plus size={15} /> New User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Users', value: stats.total, icon: <Users size={20}/>, color: 'var(--accent)' },
          { label: 'Admins', value: stats.admins, icon: <Shield size={20}/>, color: '#6366F1' },
          { label: 'Moderators', value: stats.moderators, icon: <UserCheck size={20}/>, color: '#0D9488' },
          { label: 'Inactive', value: stats.inactive, icon: <UserX size={20}/>, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><AlertCircle size={16}/>{error}</div>}

      {/* User Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={18} color="var(--text-muted)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>All Users</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {users.map(u => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ opacity: actionLoading[u.id] ? 0.5 : 1 }}
                    >
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.username}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        {u.id === currentUser?.id && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>You</span>
                        )}
                      </td>
                      <td>
                        {u.id !== currentUser?.id ? (
                          <select
                            value={u.role}
                            onChange={e => withAction(u.id, () => api.changeRole(u.id, e.target.value))}
                            style={{
                              background: 'var(--bg-input)', border: '1px solid var(--border)',
                              borderRadius: 8, padding: '5px 28px 5px 10px', fontSize: '0.82rem',
                              fontWeight: 600, cursor: 'pointer', appearance: 'none',
                              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 3L5 7L8 3' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                            }}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                          </select>
                        ) : (
                          <span className={roleBadgeClass(u.role)}>{u.role}</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem', fontWeight: 700,
                          background: u.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: u.is_active ? 'var(--success)' : 'var(--danger)',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {u.id !== currentUser?.id && (
                          <button
                            className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => withAction(u.id, () =>
                              u.is_active ? api.deactivateUser(u.id) : api.activateUser(u.id)
                            )}
                            disabled={actionLoading[u.id]}
                            style={{ gap: 5, fontSize: '0.78rem' }}
                          >
                            {u.is_active ? <UserX size={13}/> : <UserCheck size={13}/>}
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {users.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                No users found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateUserModal onClose={() => setShowCreate(false)} onCreated={loadUsers} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
