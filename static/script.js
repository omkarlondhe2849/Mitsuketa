/* ═══════════════════════════════════════════════════════════════════════════
   Mitsuketa – Find the Source | Frontend Logic
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── DOM Elements ──────────────────────────────────────────────────────

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Identify
    const identifyDropZone = document.getElementById('identifyDropZone');
    const identifyFileInput = document.getElementById('identifyFileInput');
    const identifyPreview = document.getElementById('identifyPreview');
    const identifyFileName = document.getElementById('identifyFileName');
    const identifyFileSize = document.getElementById('identifyFileSize');
    const identifyBtn = document.getElementById('identifyBtn');
    const identifyProgress = document.getElementById('identifyProgress');
    const identifyProgressFill = document.getElementById('identifyProgressFill');
    const identifyProgressText = document.getElementById('identifyProgressText');
    const resultsContainer = document.getElementById('resultsContainer');

    // Register
    const registerDropZone = document.getElementById('registerDropZone');
    const registerFileInput = document.getElementById('registerFileInput');
    const registerPreview = document.getElementById('registerPreview');
    const registerFileName = document.getElementById('registerFileName');
    const registerFileSize = document.getElementById('registerFileSize');
    const registerBtn = document.getElementById('registerBtn');
    const registerProgress = document.getElementById('registerProgress');
    const registerProgressFill = document.getElementById('registerProgressFill');
    const registerProgressText = document.getElementById('registerProgressText');
    const registerResult = document.getElementById('registerResult');
    const mediaTitle = document.getElementById('mediaTitle');
    const mediaType = document.getElementById('mediaType');

    // Library
    const libraryGrid = document.getElementById('libraryGrid');

    // Stats
    const statMedia = document.getElementById('statMedia');
    const statAudio = document.getElementById('statAudio');
    const statVideo = document.getElementById('statVideo');

    // State
    let identifyFile = null;
    let registerFile = null;

    // ─── Tab Navigation ────────────────────────────────────────────────────

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`content${capitalize(target)}`).classList.add('active');

            if (target === 'library') loadLibrary();
        });
    });

    // ─── Drop Zone Handling ────────────────────────────────────────────────

    function setupDropZone(zone, fileInput, onFileSelected) {
        zone.addEventListener('click', () => fileInput.click());

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                onFileSelected(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                onFileSelected(fileInput.files[0]);
            }
        });
    }

    // ─── Identify Setup ────────────────────────────────────────────────────

    setupDropZone(identifyDropZone, identifyFileInput, (file) => {
        identifyFile = file;
        identifyFileName.textContent = file.name;
        identifyFileSize.textContent = formatBytes(file.size);
        identifyPreview.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
    });

    identifyBtn.addEventListener('click', async () => {
        if (!identifyFile) return;

        // Reset and show progress
        identifyBtn.disabled = true;
        identifyProgress.classList.remove('hidden');
        resultsContainer.classList.add('hidden');

        // Animate progress
        animateProgress(identifyProgressFill, identifyProgressText, [
            { pct: 10, text: 'Uploading clip...' },
            { pct: 30, text: 'Extracting audio features...' },
            { pct: 55, text: 'Computing fingerprints...' },
            { pct: 75, text: 'Matching against database...' },
            { pct: 90, text: 'Analyzing video frames...' },
        ]);

        try {
            const formData = new FormData();
            formData.append('file', identifyFile);

            const response = await fetch('/api/identify', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Complete progress
            identifyProgressFill.style.width = '100%';
            identifyProgressText.textContent = 'Analysis complete!';

            setTimeout(() => {
                identifyProgress.classList.add('hidden');
                displayResults(data);
                identifyBtn.disabled = false;
            }, 500);

        } catch (error) {
            identifyProgress.classList.add('hidden');
            identifyBtn.disabled = false;
            showToast('Identification failed: ' + error.message, 'error');
        }
    });

    // ─── Register Setup ────────────────────────────────────────────────────

    setupDropZone(registerDropZone, registerFileInput, (file) => {
        registerFile = file;
        registerFileName.textContent = file.name;
        registerFileSize.textContent = formatBytes(file.size);
        registerPreview.classList.remove('hidden');
        registerResult.classList.add('hidden');

        // Auto-fill title from filename
        if (!mediaTitle.value) {
            const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            mediaTitle.value = name;
        }
    });

    registerBtn.addEventListener('click', async () => {
        if (!registerFile) return;
        if (!mediaTitle.value.trim()) {
            showToast('Please enter a title for the media', 'error');
            mediaTitle.focus();
            return;
        }

        registerBtn.disabled = true;
        registerProgress.classList.remove('hidden');
        registerResult.classList.add('hidden');

        animateProgress(registerProgressFill, registerProgressText, [
            { pct: 10, text: 'Uploading media file...' },
            { pct: 30, text: 'Extracting audio fingerprints...' },
            { pct: 60, text: 'Processing video frames...' },
            { pct: 85, text: 'Storing fingerprints in database...' },
        ]);

        try {
            const formData = new FormData();
            formData.append('file', registerFile);
            formData.append('title', mediaTitle.value.trim());
            formData.append('media_type', mediaType.value);

            const response = await fetch('/api/register', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            registerProgressFill.style.width = '100%';
            registerProgressText.textContent = 'Registration complete!';

            setTimeout(() => {
                registerProgress.classList.add('hidden');
                displayRegisterResult(data);
                registerBtn.disabled = false;
                updateStats();

                // Reset form
                registerFile = null;
                registerPreview.classList.add('hidden');
                mediaTitle.value = '';
                registerFileInput.value = '';
            }, 500);

        } catch (error) {
            registerProgress.classList.add('hidden');
            registerBtn.disabled = false;
            showToast('Registration failed: ' + error.message, 'error');
        }
    });

    // ─── Display Results ───────────────────────────────────────────────────

    function displayResults(data) {
        resultsContainer.classList.remove('hidden');

        // 1. Render Main Result Card
        if (data.match_found) {
            const confidence = Math.round(data.confidence * 100);
            const confidenceClass = confidence >= 60 ? 'confidence-high' :
                confidence >= 30 ? 'confidence-medium' : 'confidence-low';
            const md = data.media_details || {};

            resultsContainer.innerHTML = `
                <div class="result-card result-match">
                    <div class="result-header">
                        <div class="result-icon">✅</div>
                        <div>
                            <div class="result-title">${escapeHtml(data.title)}</div>
                            <div class="result-subtitle">Match found using <strong>${data.method_used}</strong> analysis</div>
                        </div>
                    </div>

                    <div class="confidence-gauge">
                        <div class="confidence-label">
                            <span>Confidence</span>
                            <span class="confidence-value">${confidence}%</span>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill ${confidenceClass}" id="confidenceFill"></div>
                        </div>
                    </div>

                    <div class="result-details">
                        <div class="detail-item">
                            <div class="detail-label">Title</div>
                            <div class="detail-value">${escapeHtml(md.title || data.title)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Type</div>
                            <div class="detail-value">${md.media_type === 'song' ? '🎵 Song' : md.media_type === 'movie' ? '🎬 Movie' : '📁 ' + (md.media_type || 'Unknown')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Media ID</div>
                            <div class="detail-value">#${data.media_id}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Duration</div>
                            <div class="detail-value">${md.duration ? md.duration.toFixed(1) + 's' : 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Method Used</div>
                            <div class="detail-value">${data.method_used}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Registered On</div>
                            <div class="detail-value">${md.added_at ? formatDate(md.added_at) : 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Audio Candidates</div>
                            <div class="detail-value">${data.audio_results?.length || 0}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Video Candidates</div>
                            <div class="detail-value">${data.video_results?.length || 0}</div>
                        </div>
                    </div>

                    ${renderCandidates(data.audio_results, data.video_results)}
                </div>
            `;

            // Animate confidence bar
            setTimeout(() => {
                const fill = document.getElementById('confidenceFill');
                if (fill) fill.style.width = confidence + '%';
            }, 100);

        } else {
            resultsContainer.innerHTML = `
                <div class="result-card result-no-match">
                    <div class="result-header">
                        <div class="result-icon">❌</div>
                        <div>
                            <div class="result-title">No Match Found</div>
                            <div class="result-subtitle">The clip doesn't match any registered media</div>
                        </div>
                    </div>
                    <div class="result-details">
                        <div class="detail-item">
                            <div class="detail-label">Audio Candidates</div>
                            <div class="detail-value">${data.audio_results?.length || 0}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Video Candidates</div>
                            <div class="detail-value">${data.video_results?.length || 0}</div>
                        </div>
                    </div>

                    ${renderAnalysisSteps(data.analysis_steps)}

                    <p style="margin-top:16px; color: var(--text-secondary); font-size: 0.85rem;">
                        💡 Make sure the source media is registered in the library first.
                    </p>
                </div>
            `;
        }

        // 2. Render Technical Details
        const techDetails = document.getElementById('techDetails');
        const techSummary = document.getElementById('techSummary');
        const techLog = document.getElementById('techLog');

        if (techDetails && techSummary && techLog) {
            techDetails.classList.remove('hidden');

            // Tech Summary
            techSummary.innerHTML = `
                <div class="tech-stat">
                    <span class="tech-stat-val">${data.total_audio_fps || 0}</span>
                    <span class="tech-stat-label">Audio Hashes</span>
                </div>
                <div class="tech-stat">
                    <span class="tech-stat-val">${data.total_video_fps || 0}</span>
                    <span class="tech-stat-label">Video Hashes</span>
                </div>
                <div class="tech-stat">
                    <span class="tech-stat-val">${data.confidence ? data.confidence.toFixed(4) : '0.0000'}</span>
                    <span class="tech-stat-label">Raw Score</span>
                </div>
            `;

            // Tech Log
            if (data.analysis_steps && data.analysis_steps.length > 0) {
                techLog.innerHTML = data.analysis_steps.map(step => {
                    let badge = '<span class="tech-badge">INFO</span>';
                    if (step.includes('failed') || step.includes('No ')) badge = '<span class="tech-badge tech-badge-error">ERR</span>';
                    if (step.includes('match found') || step.includes('Accepting')) badge = '<span class="tech-badge tech-badge-success">OK</span>';
                    if (step.includes('below threshold') || step.includes('Falling back')) badge = '<span class="tech-badge tech-badge-warn">WARN</span>';

                    return `<div class="tech-log-item">${badge}${escapeHtml(step)}</div>`;
                }).join('');
            } else {
                techLog.innerHTML = '<div class="tech-log-item">No analysis logs available.</div>';
            }
        }
    }

    function renderCandidates(audioResults, videoResults) {
        let html = '';

        if (audioResults && audioResults.length > 1) {
            html += '<div style="margin-top: 20px;">';
            html += '<p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">Other Audio Candidates</p>';
            for (let i = 1; i < Math.min(audioResults.length, 4); i++) {
                const r = audioResults[i];
                html += `<div class="detail-item" style="margin-bottom: 8px;">
                    <div class="detail-value">🔊 ${escapeHtml(r.title)} <span style="color: var(--text-muted); font-size: 0.8rem;">(${Math.round(r.score * 100)}%)</span></div>
                </div>`;
            }
            html += '</div>';
        }

        if (videoResults && videoResults.length > 1) {
            html += '<div style="margin-top: 12px;">';
            html += '<p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">Other Video Candidates</p>';
            for (let i = 1; i < Math.min(videoResults.length, 4); i++) {
                const r = videoResults[i];
                html += `<div class="detail-item" style="margin-bottom: 8px;">
                    <div class="detail-value">🎥 ${escapeHtml(r.title)} <span style="color: var(--text-muted); font-size: 0.8rem;">(${Math.round(r.score * 100)}%)</span></div>
                </div>`;
            }
            html += '</div>';
        }

        return html;
    }

    function renderAnalysisSteps(steps) {
        if (!steps || steps.length === 0) return '';

        let html = '<div class="analysis-steps" style="margin-top: 24px; padding: 16px 20px; background: rgba(0,0,0,0.25); border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.05);">';
        html += '<p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">🔬 Analysis Log</p>';

        steps.forEach((step, i) => {
            const icon = step.includes('failed') || step.includes('No ') ? '⚠️' :
                step.includes('Accepting') || step.includes('match found') ? '✅' :
                    step.includes('Falling back') ? '🔄' :
                        step.includes('Extracting') || step.includes('Computing') ? '⚙️' :
                            step.includes('Matching') ? '🔍' : '📋';
            html += `<div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                <span style="flex-shrink: 0;">${icon}</span>
                <span>${escapeHtml(step)}</span>
            </div>`;
        });

        html += '</div>';
        return html;
    }

    function displayRegisterResult(data) {
        registerResult.classList.remove('hidden');
        registerResult.innerHTML = `
            <h3>✅ Media Registered Successfully</h3>
            <div class="register-stats">
                <div class="register-stat">
                    <div class="register-stat-value">${data.audio_fingerprints.toLocaleString()}</div>
                    <div class="register-stat-label">Audio Fingerprints</div>
                </div>
                <div class="register-stat">
                    <div class="register-stat-value">${data.video_fingerprints.toLocaleString()}</div>
                    <div class="register-stat-label">Video Fingerprints</div>
                </div>
                <div class="register-stat">
                    <div class="register-stat-value">${data.duration}s</div>
                    <div class="register-stat-label">Duration</div>
                </div>
            </div>
            ${data.warnings ? `<p style="margin-top:12px; color: var(--warning); font-size: 0.8rem;">⚠️ ${data.warnings.join(', ')}</p>` : ''}
        `;

        showToast(`"${data.title}" registered successfully!`, 'success');
    }

    // ─── Library ───────────────────────────────────────────────────────────

    async function loadLibrary() {
        try {
            const response = await fetch('/api/library');
            const data = await response.json();

            if (data.media.length === 0) {
                libraryGrid.innerHTML = `
                    <div class="library-empty">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        <p>No media registered yet</p>
                        <p class="text-muted">Start by registering songs or movie clips</p>
                    </div>
                `;
                return;
            }

            libraryGrid.innerHTML = data.media.map(m => `
                <div class="library-item" data-id="${m.id}">
                    <div class="library-item-info">
                        <div class="library-item-icon">${m.media_type === 'song' ? '🎵' : m.media_type === 'movie' ? '🎬' : '📁'}</div>
                        <div>
                            <div class="library-item-title">${escapeHtml(m.title)}</div>
                            <div class="library-item-meta">
                                ${m.media_type} • ${m.duration ? m.duration.toFixed(1) + 's' : 'N/A'} • Added ${formatDate(m.added_at)}
                            </div>
                        </div>
                    </div>
                    <div class="library-item-badges">
                        <span class="badge badge-audio">🔊 ${m.audio_fp_count} audio</span>
                        <span class="badge badge-video">🎥 ${m.video_fp_count} video</span>
                        <button class="btn-delete" onclick="deleteMedia(${m.id}, '${escapeHtml(m.title)}')" title="Delete">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            showToast('Failed to load library: ' + error.message, 'error');
        }
    }

    // Make deleteMedia global
    window.deleteMedia = async function (id, title) {
        if (!confirm(`Delete "${title}" and all its fingerprints?`)) return;

        try {
            const response = await fetch(`/api/library/${id}`, { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                showToast(`"${title}" deleted`, 'success');
                loadLibrary();
                updateStats();
            }
        } catch (error) {
            showToast('Delete failed: ' + error.message, 'error');
        }
    };

    // ─── Stats ─────────────────────────────────────────────────────────────

    async function updateStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();

            animateCount(statMedia, data.total_media);
            animateCount(statAudio, data.total_audio_fingerprints);
            animateCount(statVideo, data.total_video_fingerprints);
        } catch (error) {
            // Silently fail
        }
    }

    // ─── Utilities ─────────────────────────────────────────────────────────

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function animateProgress(fillEl, textEl, stages) {
        stages.forEach((stage, i) => {
            setTimeout(() => {
                fillEl.style.width = stage.pct + '%';
                textEl.textContent = stage.text;
            }, i * 800);
        });
    }

    function animateCount(el, target) {
        const start = parseInt(el.textContent) || 0;
        const diff = target - start;
        const duration = 500;
        const startTime = performance.now();

        function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(start + diff * eased).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // ─── Initialize ────────────────────────────────────────────────────────

    updateStats();

});
