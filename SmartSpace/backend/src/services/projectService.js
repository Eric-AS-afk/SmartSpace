import { createProject, deleteProject, getProjectById, listProjects, updateProject } from '../repositories/projectRepository.js';

function normalizeSnapshot(project) {
  // getProjectById() already parses PR_snapshot into `snapshot`; prefer that
  // and only fall back to parsing the raw column ourselves (e.g. for the
  // plain rows returned by listProjects()).
  let snapshot = project.snapshot ?? project.PR_snapshot ?? {};
  if (typeof snapshot === 'string') {
    try {
      snapshot = JSON.parse(snapshot);
    } catch {
      snapshot = {};
    }
  }
  return snapshot;
}

function normalize(project) {
  if (!project) return null;
  return {
    id: project.PR_proyecto ?? project.id,
    name: project.PR_nombre ?? project.nombre ?? project.name,
    description: project.PR_descripcion ?? project.descripcion ?? project.description,
    createdAt: project.PR_fecha_creacion ?? project.createdAt,
    updatedAt: project.PR_fecha_modificacion ?? project.updatedAt,
    state: project.PR_estado ?? project.state,
    snapshot: normalizeSnapshot(project)
  };
}

export function fetchProjects(username) {
  return listProjects(username).map(normalize);
}

export function createNewProject(username, payload) {
  return normalize(createProject(username, payload));
}

export function fetchProjectById(projectId, username) {
  return normalize(getProjectById(projectId, username));
}

export function updateExistingProject(projectId, payload, username) {
  return normalize(updateProject(projectId, payload, username));
}

export function removeProject(projectId, username) {
  deleteProject(projectId, username);
}
