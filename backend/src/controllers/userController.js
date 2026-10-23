import { ensureUser, getUserSettings, saveUserSettings, registerUser as registerUserService, loginUser } from '../services/userService.js';

export async function registerUser(req, res) {
  const { nombre, apellido, correo, password } = req.body || {};
  try {
    const created = await registerUserService({ nombre, apellido, correo, password });
    if (!created) {
      return res.status(500).json({ message: 'User creation failed' });
    }
    res.status(201).json({ id: created.US_usuario, correo: created.US_correo, nombre: created.US_nombre });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export function getSettings(req, res) {
  const identifier = req.params.username || 'demo-user';
  const settings = getUserSettings(identifier);
  if (!settings) return res.status(404).json({ message: 'Settings not found' });
  res.json(settings);
}

export function updateSettings(req, res) {
  const identifier = req.params.username || 'demo-user';
  const updated = saveUserSettings(identifier, req.body);
  res.json(updated);
}

export async function login(req, res) {
  const { correo, password } = req.body || {};
  const user = await loginUser({ correo, password });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json(user);
}
