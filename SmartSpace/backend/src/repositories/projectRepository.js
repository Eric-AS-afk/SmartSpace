import db from '../db.js';
import { getUserIdByIdentifier } from './userRepository.js';

function parseSnapshot(raw) {
  if (!raw) {
    return {};
  }

  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

export function listProjects(username) {
  const userId = getUserIdByIdentifier(username);
  if (!userId) return [];
  return db.prepare('SELECT * FROM PROYECTOS WHERE US_usuario = ? ORDER BY PR_proyecto DESC').all(userId);
}

export function createProject(username, payload) {
  const userId = getUserIdByIdentifier(username);
  if (!userId) return null;
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO PROYECTOS (US_usuario, PR_nombre, PR_descripcion, PR_fecha_creacion, PR_fecha_modificacion, PR_estado, PR_snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(userId, payload.name, payload.description || '', now, now, payload.state || 'active', JSON.stringify(payload.snapshot || {}));

  return getProjectById(result.lastInsertRowid, username);
}

export function getProjectById(projectId, username) {
  const userId = username ? getUserIdByIdentifier(username) : null;
  if (username && !userId) return null;
  const project = userId
    ? db.prepare('SELECT * FROM PROYECTOS WHERE PR_proyecto = ? AND US_usuario = ?').get(projectId, userId)
    : db.prepare('SELECT * FROM PROYECTOS WHERE PR_proyecto = ?').get(projectId);

  if (!project) {
    return null;
  }

  return {
    ...project,
    snapshot: parseSnapshot(project.PR_snapshot)
  };
}

export function updateProject(projectId, payload, username) {
  const now = new Date().toISOString();
  const userId = username ? getUserIdByIdentifier(username) : null;
  if (username && !userId) return null;
  db.prepare(`
    UPDATE PROYECTOS
    SET PR_nombre = ?, PR_descripcion = ?, PR_fecha_modificacion = ?, PR_estado = ?, PR_snapshot = ?
    WHERE PR_proyecto = ? ${userId ? 'AND US_usuario = ?' : ''}
  `).run(...(userId
    ? [payload.name, payload.description || '', now, payload.state || 'active', JSON.stringify(payload.snapshot || {}), projectId, userId]
    : [payload.name, payload.description || '', now, payload.state || 'active', JSON.stringify(payload.snapshot || {}), projectId]));

  return getProjectById(projectId, username);
}

export function deleteProject(projectId, username) {
  const userId = username ? getUserIdByIdentifier(username) : null;
  if (username && !userId) return;

  const projectFilter = userId
    ? 'SELECT PR_proyecto FROM PROYECTOS WHERE PR_proyecto = ? AND US_usuario = ?'
    : 'SELECT PR_proyecto FROM PROYECTOS WHERE PR_proyecto = ?';
  const projectParams = userId ? [projectId, userId] : [projectId];
  const ownedProject = `(${projectFilter})`;

  db.prepare(`DELETE FROM HISTORIAL WHERE DI_dibujo IN (SELECT DI_dibujo FROM DIBUJOS WHERE PR_proyecto IN ${ownedProject})`).run(...projectParams);
  db.prepare(`DELETE FROM DIBUJOS WHERE PR_proyecto IN ${ownedProject}`).run(...projectParams);
  db.prepare(`DELETE FROM EXPORTACIONES WHERE PR_proyecto IN ${ownedProject}`).run(...projectParams);
  db.prepare(`DELETE FROM PROYECTOS WHERE PR_proyecto IN ${ownedProject}`).run(...projectParams);
}
