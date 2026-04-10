import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Library } from 'lucide-react';
import Header from './components/Header';
import IdentifyPage from './pages/IdentifyPage';
import RegisterPage from './pages/RegisterPage';
import LibraryPage from './pages/LibraryPage';

function App() {
  const [activeTab, setActiveTab] = useState('identify');

  const tabs = [
    { id: 'identify', label: 'Identify', icon: <Search size={18} /> },
    { id: 'register', label: 'Register Media', icon: <Plus size={18} /> },
    { id: 'library', label: 'Library', icon: <Library size={18} /> }
  ];

  return (
    <div className="app-container">
      <Header />
      
      <main className="main-content">
        {/* Modern Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(20,20,35,0.5)', padding: '6px', borderRadius: '16px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.08)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                border: 'none',
                background: 'transparent',
                color: activeTab === tab.id ? '#fff' : '#94A3B8',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                zIndex: 1,
                fontFamily: 'var(--font-main)'
              }}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabBadge"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--accent-gradient)',
                    borderRadius: '12px',
                    zIndex: -1,
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content with animations */}
        <div style={{ position: 'relative' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'identify' && (
              <motion.div
                key="identify"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <IdentifyPage />
              </motion.div>
            )}
            {activeTab === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <RegisterPage />
              </motion.div>
            )}
            {activeTab === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <LibraryPage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
