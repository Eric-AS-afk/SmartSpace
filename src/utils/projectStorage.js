const PROJECTS_KEY = 'thadb.projects';
const ACTIVE_PROJECT_KEY = 'thadb.activeProjectId';
const DRAFT_PREFIX = 'thadb.draft.';

const draftKey = (userEmail, projectId) => `${DRAFT_PREFIX}${encodeURIComponent(userEmail || 'guest')}.${projectId}`;

export function loadProjectDraft(userEmail, projectId) {
  if (typeof window === 'undefined' || !userEmail || !projectId) return null;
  try {
    const raw = window.localStorage.getItem(draftKey(userEmail, projectId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProjectDraft(userEmail, projectId, snapshot) {
  if (typeof window === 'undefined' || !userEmail || !projectId || !snapshot) return;
  window.localStorage.setItem(draftKey(userEmail, projectId), JSON.stringify({
    snapshot,
    updatedAt: new Date().toISOString()
  }));
}

export function removeProjectDraft(userEmail, projectId) {
  if (typeof window === 'undefined' || !userEmail || !projectId) return;
  window.localStorage.removeItem(draftKey(userEmail, projectId));
}

// Lee la biblioteca de proyectos guardada en LocalStorage.
export function loadStoredProjects() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawProjects = window.localStorage.getItem(PROJECTS_KEY);
    const parsedProjects = rawProjects ? JSON.parse(rawProjects) : [];

    return Array.isArray(parsedProjects) ? parsedProjects : [];
  } catch {
    return [];
  }
}

// Guarda la biblioteca de proyectos en LocalStorage.
export function saveStoredProjects(projects) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// Obtiene el proyecto activo desde LocalStorage.
export function loadStoredActiveProjectId() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
}

// Guarda el identificador del proyecto activo.
export function saveStoredActiveProjectId(projectId) {
  if (typeof window === 'undefined') {
    return;
  }

  if (projectId) {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    return;
  }

  window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
}

// Construye un proyecto simulado con metadatos mínimos para la primera etapa.
export function createProjectRecord({ name, description, snapshot = {}, sourceProjectId = null }) {
  const now = new Date().toISOString();

  return {
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    description,
    createdAt: now,
    updatedAt: now,
    sourceProjectId,
    snapshot
  };
}

// Normaliza el nombre base de un archivo para exportación.
export function toFileName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}