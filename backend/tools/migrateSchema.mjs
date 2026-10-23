import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../..', 'proyecto.sqlite3');
const db = new Database(dbPath);
console.log('Connected to', dbPath);

try {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN TRANSACTION;');

  console.log('Creating USUARIO_new...');
  db.exec(`CREATE TABLE IF NOT EXISTS USUARIO_new (
    US_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    US_nombre TEXT,
    US_apellido TEXT,
    US_correo TEXT UNIQUE,
    US_password TEXT,
    US_rol TEXT,
    US_fecha_registro TEXT
  );`);

  console.log('Copying data from USUARIO to USUARIO_new...');
  db.exec(`INSERT INTO USUARIO_new (US_nombre, US_apellido, US_correo, US_password, US_rol, US_fecha_registro)
    SELECT US_nombre, US_apellido, US_correo, US_password, US_rol, US_fecha_registro FROM USUARIO;`);

  console.log('Dropping old USUARIO...');
  db.exec('DROP TABLE IF EXISTS USUARIO;');

  console.log('Renaming USUARIO_new to USUARIO...');
  db.exec('ALTER TABLE USUARIO_new RENAME TO USUARIO;');

  console.log('Recreating CONFIGURACION table...');
  db.exec('DROP TABLE IF EXISTS CONFIGURACION;');
  db.exec(`CREATE TABLE CONFIGURACION (
    CO_config INTEGER PRIMARY KEY AUTOINCREMENT,
    US_usuario INTEGER NOT NULL,
    CO_idioma TEXT,
    CO_tema TEXT,
    CO_sensibilidad REAL,
    CO_mostrar_cuadricula INTEGER,
    CO_escala_default REAL,
    FOREIGN KEY (US_usuario) REFERENCES USUARIO(US_usuario)
  );`);

  console.log('Recreating PROYECTOS table...');
  db.exec('DROP TABLE IF EXISTS PROYECTOS;');
  db.exec(`CREATE TABLE PROYECTOS (
    PR_proyecto INTEGER PRIMARY KEY AUTOINCREMENT,
    US_usuario INTEGER NOT NULL,
    PR_nombre TEXT NOT NULL,
    PR_descripcion TEXT,
    PR_fecha_creacion TEXT NOT NULL,
    PR_fecha_modificacion TEXT NOT NULL,
    PR_estado TEXT,
    PR_snapshot TEXT,
    FOREIGN KEY (US_usuario) REFERENCES USUARIO(US_usuario)
  );`);

  console.log('Recreating DIBUJOS table...');
  db.exec('DROP TABLE IF EXISTS DIBUJOS;');
  db.exec(`CREATE TABLE DIBUJOS (
    DI_dibujo INTEGER PRIMARY KEY AUTOINCREMENT,
    PR_proyecto INTEGER NOT NULL,
    DI_nombre TEXT,
    DI_datos_json TEXT,
    DI_ancho_canvas TEXT,
    DI_alto_canvas TEXT,
    DI_fecha TEXT,
    FOREIGN KEY (PR_proyecto) REFERENCES PROYECTOS(PR_proyecto)
  );`);

  console.log('Recreating HISTORIAL table...');
  db.exec('DROP TABLE IF EXISTS HISTORIAL;');
  db.exec(`CREATE TABLE HISTORIAL (
    HI_historial INTEGER PRIMARY KEY AUTOINCREMENT,
    DI_dibujo INTEGER NOT NULL,
    HI_accion TEXT,
    HI_datos TEXT,
    HI_fecha TEXT,
    FOREIGN KEY (DI_dibujo) REFERENCES DIBUJOS(DI_dibujo)
  );`);

  console.log('Recreating EXPORTACIONES table...');
  db.exec('DROP TABLE IF EXISTS EXPORTACIONES;');
  db.exec(`CREATE TABLE EXPORTACIONES (
    EX_exportacion INTEGER PRIMARY KEY AUTOINCREMENT,
    PR_proyecto INTEGER NOT NULL,
    EX_formato TEXT,
    EX_ruta_archivo TEXT,
    EX_fecha TEXT,
    FOREIGN KEY (PR_proyecto) REFERENCES PROYECTOS(PR_proyecto)
  );`);

  db.exec('COMMIT;');
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('Migration completed successfully.');
} catch (err) {
  console.error('Migration failed:', err.message);
  try { db.exec('ROLLBACK;'); } catch (e) {}
}

// Print new schema info
console.log('Post-migration PRAGMA table_info(USUARIO):');
console.log(db.prepare("PRAGMA table_info('USUARIO')").all());
console.log('USUARIO rows:');
console.log(db.prepare('SELECT * FROM USUARIO').all());
