import axios from 'axios';

// Relative by default: '/api' resolves to wherever the page itself was
// loaded from. In production the backend serves the built frontend itself
// (see backend/src/server.js), so it's the same origin. In dev (`npm run
// dev`), vite.config.js proxies '/api' to the backend on :3001 for the same
// reason — so this works correctly whether opened on the Pi itself or from
// another device on the LAN by the Pi's IP. VITE_API_URL is still available
// as a manual override if you ever need to point the frontend at a backend
// on a different host.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

const encodeIdentifier = (identifier) => encodeURIComponent(identifier);

export const getUserSettings = (username = 'demo-user') => api.get(`/users/${encodeIdentifier(username)}/settings`);
export const saveUserSettings = (username = 'demo-user', payload) => api.put(`/users/${encodeIdentifier(username)}/settings`, payload);
export const getProjects = (username = 'demo-user') => api.get(`/users/${encodeIdentifier(username)}/projects`);
export const createProject = (username = 'demo-user', payload) => api.post(`/users/${encodeIdentifier(username)}/projects`, payload);
export const updateProject = (projectId, payload, username = 'demo-user') => api.put(`/projects/${projectId}?username=${encodeURIComponent(username)}`, payload);
export const deleteProject = (projectId, username = 'demo-user') => api.delete(`/projects/${projectId}?username=${encodeURIComponent(username)}`);
export const getDrawings = (projectId, username = 'demo-user') => api.get(`/projects/${projectId}/drawings?username=${encodeURIComponent(username)}`);
export const createDrawing = (projectId, payload, username = 'demo-user') => api.post(`/projects/${projectId}/drawings?username=${encodeURIComponent(username)}`, payload);
export const saveDrawing = (projectId, payload, username = 'demo-user') => api.put(`/projects/${projectId}/drawings/workspace?username=${encodeURIComponent(username)}`, payload);
export const updateDrawing = (drawingId, payload, username = 'demo-user') => api.put(`/drawings/${drawingId}?username=${encodeURIComponent(username)}`, payload);
export const deleteDrawing = (drawingId, username = 'demo-user') => api.delete(`/drawings/${drawingId}?username=${encodeURIComponent(username)}`);
export const authRegister = (payload) => api.post('/auth/register', payload);
export const authLogin = (payload) => api.post('/auth/login', payload);
export const shutdownSystem = () => api.post('/system/shutdown');

export default api;