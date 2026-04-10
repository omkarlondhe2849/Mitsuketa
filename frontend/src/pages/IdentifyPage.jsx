import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, CheckCircle2, XCircle, FileAudio, FileVideo, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/mitsuketa';
import DropZone from '../components/DropZone';

const ConfidenceGauge = ({ score }) => {
  const percent = (score * 100).toFixed(1);
  let color = 'var(--danger)';
  if (score > 0.4) color = 'var(--warning)';
  if (score > 0.7) color = 'var(--success)';

  return (
    <div style={{ margin: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</span>
        <span style={{ fontWeight: 800, color: color, fontFamily: 'var(--font-mono)' }}>{percent}%</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: '4px' }}
        />
      </div>
    </div>
  );
};

const IdentifyPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const mutation = useMutation({
    mutationFn: (file) => api.identify(file),
  });

  const handleIdentify = () => {
    if (selectedFile) {
      mutation.mutate(selectedFile);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sparkles color="var(--accent-secondary)" />
          Identify Unknown Clip
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Upload a song or video snippet to discover its source in the database.</p>
      </div>

      <DropZone
        onFileSelect={setSelectedFile}
        accept="audio/*,video/*"
        label="Drop your mysterious clip here"
        sublabel="Supports MP3, WAV, MP4, MKV (Max 500MB)"
      />

      <AnimatePresence>
        {selectedFile && !mutation.isSuccess && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleIdentify}
              disabled={mutation.isPending}
              style={{ width: '100%', maxWidth: '300px' }}
            >
              {mutation.isPending ? (
                <>
                  <Activity className="lucide-spin" size={18} />
                  Analyzing Audio & Video...
                </>
              ) : (
                'Start Identification'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mutation.isSuccess && mutation.data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '40px',
              padding: '32px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '24px',
              border: `1px solid ${mutation.data.match_found ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: mutation.data.match_found ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {mutation.data.match_found ? <CheckCircle2 size={32} color="var(--success)" /> : <XCircle size={32} color="var(--danger)" />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {mutation.data.match_found ? mutation.data.title : 'No Match Found'}
                </h3>
                <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  {mutation.data.method_used === 'audio' && <FileAudio size={16} />}
                  {mutation.data.method_used === 'video' && <FileVideo size={16} />}
                  {mutation.data.method_used === 'audio+video' && <><FileAudio size={16}/><FileVideo size={16}/></>}
                  {mutation.data.match_found ? `Identified via ${mutation.data.method_used} mapping` : 'Unknown origin'}
                </p>
              </div>
            </div>

            {mutation.data.match_found && (
              <ConfidenceGauge score={mutation.data.confidence} />
            )}

            <div style={{ marginTop: '32px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>Terminal Logic</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {mutation.data.analysis_steps.map((step, idx) => (
                  <div key={idx} style={{ color: step.includes('Failed') ? 'var(--danger)' : 'var(--accent-secondary)' }}>
                    <span style={{ opacity: 0.5 }}>[{idx + 1}]</span> {step}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mutation.isError && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px', textAlign: 'center' }}>
          Network or processing error occurred. Please try again.
        </div>
      )}
    </div>
  );
};

export default IdentifyPage;
