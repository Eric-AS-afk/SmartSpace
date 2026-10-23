import { createNewProject, fetchProjectById, fetchProjects, removeProject, updateExistingProject } from '../services/projectService.js';

export function listProjects(req, res) {
  const username = req.params.username || 'demo-user';
  res.json(fetchProjects(username));
}

export function createProject(req, res) {
  const username = req.params.username || 'demo-user';
  const project = createNewProject(username, req.body);
  if (!project) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.status(201).json(project);
}

export function getProject(req, res) {
  const project = fetchProjectById(req.params.id, req.query.username);
  if (!project) {
    return res.status(404).json({ message: 'Proyecto no encontrado' });
  }
  res.json(project);
}

export function updateProject(req, res) {
  const project = updateExistingProject(req.params.id, req.body, req.query.username);
  if (!project) {
    return res.status(404).json({ message: 'Proyecto no encontrado' });
  }
  res.json(project);
}

export function deleteProject(req, res) {
  removeProject(req.params.id, req.query.username);
  res.status(204).send();
}
