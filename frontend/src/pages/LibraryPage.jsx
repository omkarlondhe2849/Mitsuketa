import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Library, Trash2, Search, Music, Film, HelpCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/mitsuketa';

const DeleteModal = ({ item, onClose, onConfirm }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
  }}>
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      style={{
        background: 'var(--bg-base)', border: '1px solid var(--glass-border)',
        padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--danger)', marginBottom: '16px' }}>
        <AlertTriangle size={48} />
      </div>
      <h3 style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '8px' }}>Delete Reference Media?</h3>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Are you sure you want to delete <strong>"{item.title}"</strong>? This will remove all its audio and video fingerprints permanently.
      </p>
      <div style={{ display: 'flex', gap: '16px' }}>
        <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          Delete Permanently
        </button>
      </div>
    </motion.div>
  </div>
);

const LibraryPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['library'],
    queryFn: api.getLibrary
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setItemToDelete(null);
    }
  });

  const getMediaIcon = (type) => {
    switch (type) {
      case 'song': return <Music size={20} color="var(--accent-primary)" />;
      case 'movie': return <Film size={20} color="var(--accent-secondary)" />;
      default: return <HelpCircle size={20} color="var(--text-muted)" />;
    }
  };

  const filteredMedia = data?.media?.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="glass-panel" style={{ padding: '40px', minHeight: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Library color="#fff" />
            Media Library
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage all {data?.total || 0} registered media files.</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search media..." 
            className="input-field"
            style={{ paddingLeft: '48px', borderRadius: '50px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>Loading library...</div>
      ) : filteredMedia.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Library size={40} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No media found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Register some songs or videos to see them here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredMedia.map(item => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--glass-border-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px' }}>
                  {getMediaIcon(item.media_type)}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                    {item.title}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  onClick={() => setItemToDelete(item)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <div style={{ flex: 1, background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{item.audio_fp_count}</span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Audio Hashes</span>
                </div>
                <div style={{ flex: 1, background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{item.video_fp_count}</span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Video Hashes</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {itemToDelete && (
          <DeleteModal 
            item={itemToDelete} 
            onClose={() => setItemToDelete(null)} 
            onConfirm={() => deleteMutation.mutate(itemToDelete.id)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LibraryPage;
