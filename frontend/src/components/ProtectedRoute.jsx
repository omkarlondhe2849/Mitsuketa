import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps any route that needs authentication.
 *
 * Props:
 *   requiredRole  — "admin" | "moderator" | "viewer" (optional)
 *                   If omitted, any authenticated user is allowed.
 *   children      — the page component to render
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading, fetchUser } = useAuth();
  const location = useLocation();

  // Silently refresh user data on navigation to catch role changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, [location.pathname, isAuthenticated, fetchUser]);

  // Still verifying token — show nothing to avoid flash
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  // Not authenticated → send to login, preserve intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  const roleHierarchy = { viewer: 1, moderator: 2, admin: 3 };
  if (requiredRole && roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
          textAlign: 'center',
          padding: 32,
        }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--danger-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldX size={36} color="var(--danger)" />
        </div>
        <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 360 }}>
          You need <strong>{requiredRole}</strong> permissions to view this page.
          Your current role is <strong>{user.role}</strong>.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Contact an administrator to request elevated access.
        </p>
      </motion.div>
    );
  }

  return children;
}
