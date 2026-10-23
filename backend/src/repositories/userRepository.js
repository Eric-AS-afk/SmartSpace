import db from '../db.js';

export function getOrCreateUser(identifier) {
  // identifier expected to be an email or unique string
  const existing = db.prepare('SELECT US_usuario FROM USUARIO WHERE US_correo = ?').get(identifier);

  if (existing) {
    return existing.US_usuario;
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO USUARIO (US_nombre, US_apellido, US_correo, US_password, US_rol, US_fecha_registro) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run('Demo', '', identifier, '', 'user', now);
  // Query back the inserted user's id to be robust against differing schemas
  const created = db.prepare('SELECT US_usuario FROM USUARIO WHERE US_correo = ?').get(identifier);
  const userId = created?.US_usuario;

  if (userId) {
    db.prepare('INSERT INTO CONFIGURACION (US_usuario, CO_idioma, CO_tema, CO_sensibilidad, CO_mostrar_cuadricula, CO_escala_default, CO_tamano_cuadricula, CO_unidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(userId, 'es', 'oscuro', 65, 1, 0.02, 24, 'mm');
  }

  return userId;
}

export function getUserIdByIdentifier(identifier) {
  const row = db.prepare('SELECT US_usuario FROM USUARIO WHERE US_correo = ? OR US_usuario = ?').get(identifier, identifier);
  return row ? row.US_usuario : null;
}

export function getUserConfig(identifierOrId) {
  const userId = typeof identifierOrId === 'number' ? identifierOrId : getUserIdByIdentifier(identifierOrId);
  if (!userId) return null;
  return db.prepare('SELECT * FROM CONFIGURACION WHERE US_usuario = ?').get(userId);
}

export function upsertUserConfig(identifierOrId, payload) {
  const userId = typeof identifierOrId === 'number' ? identifierOrId : getOrCreateUser(identifierOrId);
  const existing = db.prepare('SELECT * FROM CONFIGURACION WHERE US_usuario = ?').get(userId);

  const values = {
    CO_idioma: payload.language || payload.CO_idioma || 'es',
    CO_tema: payload.darkMode === false ? 'claro' : (payload.darkMode === true ? 'oscuro' : (payload.theme || payload.CO_tema || 'oscuro')),
    CO_sensibilidad: payload.boardSensitivity ?? payload.CO_sensibilidad ?? 65,
    CO_mostrar_cuadricula: payload.showGrid === false ? 0 : (payload.CO_mostrar_cuadricula ?? 1),
    CO_escala_default: payload.defaultScaleNumeric ?? ({ '1:20': 0.05, '1:25': 0.04, '1:50': 0.02, '1:75': 0.013333, '1:100': 0.01 }[payload.defaultScale] ?? payload.CO_escala_default ?? 0.02),
    CO_tamano_cuadricula: payload.gridSize ?? payload.CO_tamano_cuadricula ?? 24,
    CO_unidad: payload.unit || payload.CO_unidad || 'mm'
  };

  if (existing) {
    db.prepare(`
      UPDATE CONFIGURACION
      SET CO_idioma = ?, CO_tema = ?, CO_sensibilidad = ?, CO_mostrar_cuadricula = ?, CO_escala_default = ?, CO_tamano_cuadricula = ?, CO_unidad = ?
      WHERE US_usuario = ?
    `).run(values.CO_idioma, values.CO_tema, values.CO_sensibilidad, values.CO_mostrar_cuadricula, values.CO_escala_default, values.CO_tamano_cuadricula, values.CO_unidad, userId);
    return getUserConfig(userId);
  }

  db.prepare(`
    INSERT INTO CONFIGURACION (US_usuario, CO_idioma, CO_tema, CO_sensibilidad, CO_mostrar_cuadricula, CO_escala_default, CO_tamano_cuadricula, CO_unidad)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, values.CO_idioma, values.CO_tema, values.CO_sensibilidad, values.CO_mostrar_cuadricula, values.CO_escala_default, values.CO_tamano_cuadricula, values.CO_unidad);

  return getUserConfig(userId);
}

export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM USUARIO WHERE US_correo = ?').get(email);
}

export function createUserWithPassword({ nombre = '', apellido = '', correo, passwordHash = '', rol = 'user' }) {
  const now = new Date().toISOString();
  try {
    const result = db.prepare(`INSERT INTO USUARIO (US_nombre, US_apellido, US_correo, US_password, US_rol, US_fecha_registro) VALUES (?, ?, ?, ?, ?, ?)`).run(nombre, apellido, correo, passwordHash, rol, now);
    const created = db.prepare('SELECT US_usuario FROM USUARIO WHERE US_correo = ?').get(correo);
    const userId = created?.US_usuario;

    if (!userId) {
      console.error('createUserWithPassword: inserted but could not find created user for', correo);
      throw new Error('User creation failed (no id)');
    }

    try {
        db.prepare('INSERT INTO CONFIGURACION (US_usuario, CO_idioma, CO_tema, CO_sensibilidad, CO_mostrar_cuadricula, CO_escala_default, CO_tamano_cuadricula, CO_unidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(userId, 'es', 'oscuro', 65, 1, 0.02, 24, 'mm');
    } catch (err) {
      // Non-fatal: log and continue
      console.error('createUserWithPassword: failed to insert default CONFIGURACION', err.message);
    }

    const userRow = db.prepare('SELECT * FROM USUARIO WHERE US_usuario = ?').get(userId);
    return userRow;
  } catch (err) {
    console.error('createUserWithPassword error:', err && err.message ? err.message : err);
    throw err;
  }
}

export function verifyUserPassword(email, passwordHash) {
  const row = findUserByEmail(email);
  if (!row) return false;
  return row.US_password === passwordHash;
}
