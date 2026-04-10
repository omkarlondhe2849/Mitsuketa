import React, { useCallback, useState } from 'react';
import { UploadCloud, FileAudio, FileVideo, X } from 'lucide-react';
import { motion } from 'framer-motion';

const DropZone = ({ onFileSelect, accept, label, sublabel }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
    onFileSelect(null);
  };

  return (
    <div
      onClick={() => document.getElementById('file-upload').click()}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
        background: isDragActive ? 'rgba(124, 58, 237, 0.05)' : 'rgba(0,0,0,0.2)',
        borderRadius: '24px',
        padding: '48px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <input
        id="file-upload"
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      
      {!file ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <UploadCloud style={{ color: isDragActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} size={48} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '16px', color: 'var(--text-main)' }}>{label}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{sublabel}</p>
        </motion.div>
      ) : (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          {file.type.includes('video') ? <FileVideo size={32} color="var(--accent-secondary)" /> : <FileAudio size={32} color="var(--accent-primary)" />}
          <div style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-main)' }}>{file.name}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          <button onClick={removeFile} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', marginLeft: '16px' }}>
            <X size={16} />
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default DropZone;
