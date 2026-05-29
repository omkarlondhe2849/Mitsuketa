/**
 * mitsuketa.js — API helper that automatically attaches
 * the JWT Bearer token to every request from localStorage.
 */

const getToken = () => localStorage.getItem('mitsuketa_token');

const authHeaders = (extra = {}) => {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...extra }
    : { ...extra };
};

export const api = {
  /** POST multipart/form-data with auth token */
  postForm: async (url, formData) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),   // Content-Type set automatically for FormData
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Request failed');
    }
    return res.json();
  },

  /** GET with auth token */
  get: async (url) => {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Request failed');
    }
    return res.json();
  },

  /** DELETE with auth token */
  delete: async (url) => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Request failed');
    }
    return res.json();
  },

  // ── Specific API calls ──────────────────────────────────────

  identify: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.postForm('/api/identify', fd);
  },

  register: (file, title, type) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('media_type', type);
    return api.postForm('/api/register', fd);
  },

  getLibrary:  ()   => api.get('/api/library'),
  deleteMedia: (id) => api.delete(`/api/library/${id}`),
  getStats:    ()   => api.get('/api/stats'),
  health:      ()   => api.get('/api/health'),
};
