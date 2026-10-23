import { addHistory, createDrawing, deleteDrawing, listDrawings, listHistory, saveDrawing, updateDrawing } from '../repositories/drawingRepository.js';

function normalize(d) {
  if (!d) return null;
  let parsed = {};
  try {
    parsed = d.DI_datos_json ? JSON.parse(d.DI_datos_json) : {};
  } catch {
    parsed = {};
  }

  return {
    id: d.DI_dibujo ?? d.id,
    projectId: d.PR_proyecto,
    name: d.DI_nombre,
    data: parsed,
    width: d.DI_ancho_canvas,
    height: d.DI_alto_canvas,
    date: d.DI_fecha
  };
}

export function fetchDrawings(projectId, username) {
  return listDrawings(projectId, username).map(normalize);
}

export function createNewDrawing(projectId, payload, username) {
  return normalize(createDrawing(projectId, payload, username));
}

export function saveWorkspaceDrawing(projectId, payload, username) {
  return normalize(saveDrawing(projectId, payload, username));
}

export function editDrawing(drawingId, payload, username) {
  return normalize(updateDrawing(drawingId, payload, username));
}

export function removeDrawing(drawingId, username) {
  deleteDrawing(drawingId, username);
}

export function fetchHistory(drawingId) {
  return listHistory(drawingId);
}

export function appendHistory(drawingId, action, detail) {
  return addHistory(drawingId, action, detail);
}
