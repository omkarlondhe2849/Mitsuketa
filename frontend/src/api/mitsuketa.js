export const api = {
  // Utility for forms
  postForm: async (url, formData) => {
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Network response was not ok');
    }
    return res.json();
  },

  get: async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  },

  delete: async (url) => {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  },

  // Specific API calls
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

  getLibrary: () => api.get('/api/library'),
  deleteMedia: (id) => api.delete(`/api/library/${id}`),
  getStats: () => api.get('/api/stats'),
  health: () => api.get('/api/health'),
};
