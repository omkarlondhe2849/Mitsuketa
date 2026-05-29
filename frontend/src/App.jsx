import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Library } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import IdentifyPage from './pages/IdentifyPage';
import RegisterPage from './pages/RegisterPage';
import LibraryPage from './pages/LibraryPage';
import AdminPanel from './pages/AdminPanel';
import LandingPage from './pages/LandingPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AnimatedBackground from './components/AnimatedBackground';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// ── Page transition config ─────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -16 },
};
const pageTransition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] };

// ── Main app (tabs + protected area) ──────────────────────────
function MainApp() {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('identify');

  // Build tabs based on role
  const tabs = [
    { id: 'identify', label: 'Identify', icon: <Search size={16} /> },
    ...(hasRole('moderator', 'admin')
      ? [{ id: 'register', label: 'Register Media', icon: <Plus size={16} /> }]
      : []),
    { id: 'library', label: 'Library', icon: <Library size={16} /> },
  ];

  const pages = {
    identify: <IdentifyPage />,
    register: <RegisterPage />,
    library:  <LibraryPage />,
  };

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        {/* Tab Navigation */}
        <div className="tab-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              id={`tab-${tab.id}`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabBg"
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'var(--accent-gradient)',
                    borderRadius: 'var(--radius-md)',
                    zIndex: -1,
                    boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                  }}
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.55 }}
                />
              )}
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="page-wrapper"
          >
            {pages[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Admin layout wrapper ────────────────────────────────────────
function AdminLayout() {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <AdminPanel />
      </main>
    </div>
  );
}

// ── Public layout wrapper ────────────────────────────────────────
function PublicLayout({ children }) {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content" style={{ padding: 0 }}>
        {children}
      </main>
    </div>
  );
}

// ── Route-level page transitions ────────────────────────────────
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* Public routes */}
        <Route path="/" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><PublicLayout><LandingPage /></PublicLayout></motion.div>} />
        <Route path="/how-it-works" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><PublicLayout><HowItWorksPage /></PublicLayout></motion.div>} />
        <Route path="/login"  element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><LoginPage /></motion.div>} />
        <Route path="/signup" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><SignupPage /></motion.div>} />

        {/* Protected: any authenticated user */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        } />

        {/* Protected: admin only */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

// ── Root ────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AnimatedBackground />
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
