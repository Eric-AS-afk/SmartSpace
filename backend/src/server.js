import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { registerUser, getSettings, updateSettings, login } from './controllers/userController.js';
import { createProject, deleteProject, getProject, listProjects, updateProject } from './controllers/projectController.js';
import { addDrawingHistory, createDrawing, deleteDrawing, listDrawings, listDrawingHistory, saveDrawing, updateDrawing } from './controllers/drawingController.js';
import { shutdown } from './controllers/systemController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/users', registerUser);
app.get('/api/users/:username/settings', getSettings);
app.put('/api/users/:username/settings', updateSettings);
app.post('/api/auth/register', registerUser);
app.post('/api/auth/login', login);

app.get('/api/users/:username/projects', listProjects);
app.post('/api/users/:username/projects', createProject);
app.get('/api/projects/:id', getProject);
app.put('/api/projects/:id', updateProject);
app.delete('/api/projects/:id', deleteProject);

app.get('/api/projects/:projectId/drawings', listDrawings);
app.post('/api/projects/:projectId/drawings', createDrawing);
app.put('/api/projects/:projectId/drawings/workspace', saveDrawing);
app.put('/api/drawings/:id', updateDrawing);
app.delete('/api/drawings/:id', deleteDrawing);
app.get('/api/drawings/:id/history', listDrawingHistory);
app.post('/api/drawings/:id/history', addDrawingHistory);

app.post('/api/system/shutdown', shutdown);

// Sirve el build de producción del frontend (`npm run build` en la raíz del
// proyecto, no en backend/) desde este mismo proceso y puerto. Así solo hace
// falta un servicio para toda la app: un dispositivo en la red visita
// http://<ip-de-la-pi>:3001 y obtiene tanto la interfaz como la API, sin
// necesidad de correr `vite preview` ni un segundo proceso/puerto aparte.
const frontendDist = path.resolve(__dirname, '../../dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // Cualquier ruta que no sea /api o /health devuelve index.html, para que
  // las rutas del lado del cliente (react-router) funcionen al recargar la
  // página o al entrar directamente a una URL como /proyectos.
  app.get(/^(?!\/api|\/health).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  console.log('No se encontró dist/ — ejecuta "npm run build" en la raíz del proyecto para servir el frontend desde aquí. Sirviendo solo la API por ahora.');
}

app.listen(PORT, HOST, () => {
  console.log(`Backend escuchando en http://${HOST}:${PORT}`);
});
