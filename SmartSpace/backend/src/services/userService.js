import bcrypt from 'bcryptjs';
import {
  getOrCreateUser,
  getUserConfig,
  upsertUserConfig,
  findUserByEmail,
  createUserWithPassword
} from '../repositories/userRepository.js';

const scaleLabels = [
  [0.05, '1:20'],
  [0.04, '1:25'],
  [0.02, '1:50'],
  [0.013333, '1:75'],
  [0.01, '1:100']
];

function scaleLabel(value) {
  const match = scaleLabels.find(([numeric]) => Math.abs(numeric - Number(value)) < 0.0001);
  return match?.[1] || '1:50';
}

export function ensureUser(username) {
  return getOrCreateUser(username);
}

export function getUserSettings(username) {
  const settings = getUserConfig(username);
  if (!settings) return null;
  return {
    darkMode: settings.CO_tema !== 'claro',
    language: settings.CO_idioma || 'es',
    boardSensitivity: settings.CO_sensibilidad ?? 65,
    gridSize: settings.CO_tamano_cuadricula ?? 24,
    defaultScale: scaleLabel(settings.CO_escala_default),
    unit: settings.CO_unidad || 'mm'
  };
}

export function saveUserSettings(username, payload) {
  const settings = upsertUserConfig(username, payload);
  return {
    darkMode: settings.CO_tema !== 'claro',
    language: settings.CO_idioma || 'es',
    boardSensitivity: settings.CO_sensibilidad ?? 65,
    gridSize: settings.CO_tamano_cuadricula ?? 24,
    defaultScale: scaleLabel(settings.CO_escala_default),
    unit: settings.CO_unidad || 'mm'
  };
}

export async function registerUser({ nombre = '', apellido = '', correo, password }) {
  const existing = findUserByEmail(correo);
  if (existing) {
    throw new Error('User already exists');
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password || '', salt);

  const created = createUserWithPassword({ nombre, apellido, correo, passwordHash: hash, rol: 'user' });
  return created;
}

export async function loginUser({ correo, password }) {
  const user = findUserByEmail(correo);
  if (!user) return null;

  const ok = bcrypt.compareSync(password || '', user.US_password || '');
  if (!ok) return null;

  // return minimal user info
  return { id: user.US_usuario, correo: user.US_correo, nombre: user.US_nombre };
}
