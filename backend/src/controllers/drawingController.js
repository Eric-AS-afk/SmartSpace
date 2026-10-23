import { appendHistory, createNewDrawing, editDrawing, fetchDrawings, fetchHistory, removeDrawing, saveWorkspaceDrawing } from '../services/drawingService.js';

export function listDrawings(req, res) {
  res.json(fetchDrawings(req.params.projectId, req.query.username));
}

export function createDrawing(req, res) {
  const drawing = createNewDrawing(req.params.projectId, req.body, req.query.username);
  if (!drawing) return res.status(404).json({ message: 'Proyecto no encontrado o no pertenece al usuario' });
  res.status(201).json(drawing);
}

export function saveDrawing(req, res) {
  const drawing = saveWorkspaceDrawing(req.params.projectId, req.body, req.query.username);
  if (!drawing) return res.status(404).json({ message: 'Proyecto no encontrado o no pertenece al usuario' });
  res.json(drawing);
}

export function updateDrawing(req, res) {
  const drawing = editDrawing(req.params.id, req.body, req.query.username);
  if (!drawing) return res.status(404).json({ message: 'Dibujo no encontrado o no pertenece al usuario' });
  res.json(drawing);
}

export function deleteDrawing(req, res) {
  removeDrawing(req.params.id, req.query.username);
  res.status(204).send();
}

export function listDrawingHistory(req, res) {
  res.json(fetchHistory(req.params.id));
}

export function addDrawingHistory(req, res) {
  const entry = appendHistory(req.params.id, req.body.action, req.body.detail);
  res.status(201).json(entry);
}
