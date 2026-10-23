import db from '../db.js';
import { getUserIdByIdentifier } from './userRepository.js';

function getOwnedProjectId(projectId, username) {
  if (!username) return projectId;
  const userId = getUserIdByIdentifier(username);
  if (!userId) return null;
  const project = db.prepare('SELECT PR_proyecto FROM PROYECTOS WHERE PR_proyecto = ? AND US_usuario = ?').get(projectId, userId);
  return project?.PR_proyecto || null;
}

export function listDrawings(projectId, username) {
  const ownedProjectId = getOwnedProjectId(projectId, username);
  if (!ownedProjectId) return [];
  return db.prepare('SELECT * FROM DIBUJOS WHERE PR_proyecto = ? ORDER BY DI_dibujo DESC').all(ownedProjectId);
}

export function createDrawing(projectId, payload, username) {
  const ownedProjectId = getOwnedProjectId(projectId, username);
  if (!ownedProjectId) return null;
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO DIBUJOS (PR_proyecto, DI_nombre, DI_datos_json, DI_ancho_canvas, DI_alto_canvas, DI_fecha)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    ownedProjectId,
    payload.name || 'Dibujo',
    JSON.stringify(payload.data || payload.contenido || {}),
    payload.width || payload.ancho || null,
    payload.height || payload.alto || null,
    now
  );

  return db.prepare('SELECT * FROM DIBUJOS WHERE DI_dibujo = ?').get(result.lastInsertRowid);
}

export function saveDrawing(projectId, payload, username) {
  const ownedProjectId = getOwnedProjectId(projectId, username);
  if (!ownedProjectId) return null;

  const name = payload.name || 'Dibujo principal';
  const data = JSON.stringify(payload.data || payload.contenido || {});
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT DI_dibujo FROM DIBUJOS WHERE PR_proyecto = ? AND DI_nombre = ?').get(ownedProjectId, name);

  if (existing) {
    db.prepare(`
      UPDATE DIBUJOS
      SET DI_datos_json = ?, DI_ancho_canvas = ?, DI_alto_canvas = ?, DI_fecha = ?
      WHERE DI_dibujo = ?
    `).run(data, payload.width || payload.ancho || null, payload.height || payload.alto || null, now, existing.DI_dibujo);
    return db.prepare('SELECT * FROM DIBUJOS WHERE DI_dibujo = ?').get(existing.DI_dibujo);
  }

  return createDrawing(ownedProjectId, payload, username);
}

export function updateDrawing(drawingId, payload, username) {
  const now = new Date().toISOString();
  const userId = username ? getUserIdByIdentifier(username) : null;
  if (username && !userId) return null;
  const ownership = userId ? 'AND PR_proyecto IN (SELECT PR_proyecto FROM PROYECTOS WHERE US_usuario = ?)' : '';
  db.prepare(`
    UPDATE DIBUJOS
    SET DI_nombre = ?, DI_datos_json = ?, DI_ancho_canvas = ?, DI_alto_canvas = ?, DI_fecha = ?
    WHERE DI_dibujo = ? ${ownership}
  `).run(...(userId
    ? [payload.name || 'Dibujo', JSON.stringify(payload.data || payload.contenido || {}), payload.width || payload.ancho || null, payload.height || payload.alto || null, now, drawingId, userId]
    : [payload.name || 'Dibujo', JSON.stringify(payload.data || payload.contenido || {}), payload.width || payload.ancho || null, payload.height || payload.alto || null, now, drawingId]));

  return db.prepare('SELECT * FROM DIBUJOS WHERE DI_dibujo = ?').get(drawingId);
}

export function deleteDrawing(drawingId, username) {
  const userId = username ? getUserIdByIdentifier(username) : null;
  if (username && !userId) return;
  const ownership = userId ? 'AND DI_dibujo IN (SELECT DI_dibujo FROM DIBUJOS d JOIN PROYECTOS p ON p.PR_proyecto = d.PR_proyecto WHERE p.US_usuario = ?)' : '';
  const params = userId ? [drawingId, userId] : [drawingId];
  db.prepare(`DELETE FROM HISTORIAL WHERE DI_dibujo = ? ${ownership}`).run(...params);
  db.prepare(`DELETE FROM DIBUJOS WHERE DI_dibujo = ? ${ownership}`).run(...params);
}

export function listHistory(drawingId) {
  return db.prepare('SELECT * FROM HISTORIAL WHERE DI_dibujo = ? ORDER BY HI_historial DESC').all(drawingId);
}

export function addHistory(drawingId, action, detail) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO HISTORIAL (DI_dibujo, HI_accion, HI_datos, HI_fecha)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(drawingId, action, detail || '', now);
  return db.prepare('SELECT * FROM HISTORIAL WHERE HI_historial = ?').get(result.lastInsertRowid);
}
