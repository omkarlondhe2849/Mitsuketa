import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Disc, Film, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/mitsuketa';
import DropZone from '../components/DropZone';

const RegisterPage = () => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('unknown');

  const mutation = useMutation({
    mutationFn: () => api.register(selectedFile, title, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
    }
  });

  const handleRegister = () => {
    if (selectedFile && title) {
      mutation.mutate();
    }
  };

  // Auto-fill title from filename
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (file && !title) {
      const name = file.name.split('.').slice(0, -1).join('.');
      setTitle(name.replace(/[-_]/g, ' '));
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database color="var(--accent-primary)" />
          Register Media
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Index new songs or video clips into the fingerprint database.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Form Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Media Title</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g., Bohemian Rhapsody - Queen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Media Type</label>
            <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="song">🎵 Song</option>
              <option value="movie">🎬 Movie / Video Clip</option>
              <option value="unknown">❓ Unknown</option>
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleRegister}
            disabled={!selectedFile || !title || mutation.isPending}
            style={{ marginTop: '12px' }}
          >
            {mutation.isPending ? 'Processing...' : 'Index Media to Database'}
          </button>
        </div>

        {/* Drop Zone */}
        <div>
          <DropZone
            onFileSelect={handleFileSelect}
            accept="audio/*,video/*"
            label="Drop Reference File"
            sublabel="High quality source files recommended"
          />
        </div>
      </div>

      <AnimatePresence>
        {mutation.isSuccess && mutation.data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '40px',
              padding: '32px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '24px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: 'var(--success)', borderRadius: '50%', padding: '12px' }}>
                <Check color="#fff" size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>Successfully Registered</h3>
                <p style={{ color: 'var(--text-main)', marginTop: '4px' }}>"{mutation.data.title}" indexed into database.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '32px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{mutation.data.audio_fingerprints}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audio Hashes</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{mutation.data.video_fingerprints}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Video Frames</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegisterPage;
