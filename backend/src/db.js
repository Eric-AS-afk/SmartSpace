import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../proyecto.sqlite3');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS USUARIO (
    US_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    US_nombre TEXT,
    US_apellido TEXT,
    US_correo TEXT UNIQUE,
    US_password TEXT,
    US_rol TEXT,
    US_fecha_registro TEXT
  );

  CREATE TABLE IF NOT EXISTS CONFIGURACION (
    CO_config INTEGER PRIMARY KEY AUTOINCREMENT,
    US_usuario INTEGER NOT NULL,
    CO_idioma TEXT,
    CO_tema TEXT,
    CO_sensibilidad REAL,
    CO_mostrar_cuadricula INTEGER,
    CO_escala_default REAL,
    CO_tamano_cuadricula INTEGER,
    CO_unidad TEXT,
    FOREIGN KEY (US_usuario) REFERENCES USUARIO(US_usuario)
  );

  CREATE TABLE IF NOT EXISTS PROYECTOS (
    PR_proyecto INTEGER PRIMARY KEY AUTOINCREMENT,
    US_usuario INTEGER NOT NULL,
    PR_nombre TEXT NOT NULL,
    PR_descripcion TEXT,
    PR_fecha_creacion TEXT NOT NULL,
    PR_fecha_modificacion TEXT NOT NULL,
    PR_estado TEXT,
    PR_snapshot TEXT,
    FOREIGN KEY (US_usuario) REFERENCES USUARIO(US_usuario)
  );

  CREATE TABLE IF NOT EXISTS DIBUJOS (
    DI_dibujo INTEGER PRIMARY KEY AUTOINCREMENT,
    PR_proyecto INTEGER NOT NULL,
    DI_nombre TEXT,
    DI_datos_json TEXT,
    DI_ancho_canvas TEXT,
    DI_alto_canvas TEXT,
    DI_fecha TEXT,
    FOREIGN KEY (PR_proyecto) REFERENCES PROYECTOS(PR_proyecto)
  );

  CREATE TABLE IF NOT EXISTS HISTORIAL (
    HI_historial INTEGER PRIMARY KEY AUTOINCREMENT,
    DI_dibujo INTEGER NOT NULL,
    HI_accion TEXT,
    HI_datos TEXT,
    HI_fecha TEXT,
    FOREIGN KEY (DI_dibujo) REFERENCES DIBUJOS(DI_dibujo)
  );

  CREATE TABLE IF NOT EXISTS EXPORTACIONES (
    EX_exportacion INTEGER PRIMARY KEY AUTOINCREMENT,
    PR_proyecto INTEGER NOT NULL,
    EX_formato TEXT,
    EX_ruta_archivo TEXT,
    EX_fecha TEXT,
    FOREIGN KEY (PR_proyecto) REFERENCES PROYECTOS(PR_proyecto)
  );
`);

// Lightweight migration: add missing columns to existing tables if the DB file predates this schema.
const tryAlter = (sql) => {
  try {
    db.exec(sql);
  } catch (err) {
    // ignore errors (column may already exist)
  }
};

// USUARIO
tryAlter("ALTER TABLE USUARIO ADD COLUMN US_nombre TEXT;");
tryAlter("ALTER TABLE USUARIO ADD COLUMN US_apellido TEXT;");
tryAlter("ALTER TABLE USUARIO ADD COLUMN US_correo TEXT;");
tryAlter("ALTER TABLE USUARIO ADD COLUMN US_password TEXT;");
tryAlter("ALTER TABLE USUARIO ADD COLUMN US_rol TEXT;");
tryAlter("ALTER TABLE USUARIO ADD COLUMN US_fecha_registro TEXT;");

// CONFIGURACION
tryAlter("ALTER TABLE CONFIGURACION ADD COLUMN CO_idioma TEXT;");
tryAlter("ALTER TABLE CONFIGURACION ADD COLUMN CO_tema TEXT;");
tryAlter("ALTER TABLE CONFIGURACION ADD COLUMN CO_sensibilidad REAL;");
tryAlter("ALTER TABLE CONFIGURACION ADD COLUMN CO_mostrar_cuadricula INTEGER;");
tryAlter("ALTER TABLE CONFIGURACION ADD COLUMN CO_escala_default REAL;");
tryAlter("ALTER TABLE CONFIGURACION ADD COLUMN CO_tamano_cuadricula INTEGER;");
tryAlter("ALTER TABLE CONFIGURACION ADD COLUMN CO_unidad TEXT;");

// PROYECTOS
tryAlter("ALTER TABLE PROYECTOS ADD COLUMN PR_nombre TEXT;");
tryAlter("ALTER TABLE PROYECTOS ADD COLUMN PR_descripcion TEXT;");
tryAlter("ALTER TABLE PROYECTOS ADD COLUMN PR_fecha_creacion TEXT;");
tryAlter("ALTER TABLE PROYECTOS ADD COLUMN PR_fecha_modificacion TEXT;");
tryAlter("ALTER TABLE PROYECTOS ADD COLUMN PR_estado TEXT;");
tryAlter("ALTER TABLE PROYECTOS ADD COLUMN PR_snapshot TEXT;");

// DIBUJOS
tryAlter("ALTER TABLE DIBUJOS ADD COLUMN DI_nombre TEXT;");
tryAlter("ALTER TABLE DIBUJOS ADD COLUMN DI_datos_json TEXT;");
tryAlter("ALTER TABLE DIBUJOS ADD COLUMN DI_ancho_canvas TEXT;");
tryAlter("ALTER TABLE DIBUJOS ADD COLUMN DI_alto_canvas TEXT;");
tryAlter("ALTER TABLE DIBUJOS ADD COLUMN DI_fecha TEXT;");

// HISTORIAL
tryAlter("ALTER TABLE HISTORIAL ADD COLUMN HI_accion TEXT;");
tryAlter("ALTER TABLE HISTORIAL ADD COLUMN HI_datos TEXT;");
tryAlter("ALTER TABLE HISTORIAL ADD COLUMN HI_fecha TEXT;");

// EXPORTACIONES
tryAlter("ALTER TABLE EXPORTACIONES ADD COLUMN EX_formato TEXT;");
tryAlter("ALTER TABLE EXPORTACIONES ADD COLUMN EX_ruta_archivo TEXT;");
tryAlter("ALTER TABLE EXPORTACIONES ADD COLUMN EX_fecha TEXT;");

// Enforce the one-to-one user/configuration relation and speed up ownership lookups.
tryAlter('CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracion_usuario ON CONFIGURACION (US_usuario);');
tryAlter('CREATE INDEX IF NOT EXISTS idx_proyectos_usuario ON PROYECTOS (US_usuario);');
tryAlter('CREATE INDEX IF NOT EXISTS idx_dibujos_proyecto ON DIBUJOS (PR_proyecto);');
tryAlter('CREATE INDEX IF NOT EXISTS idx_historial_dibujo ON HISTORIAL (DI_dibujo);');
tryAlter('CREATE INDEX IF NOT EXISTS idx_exportaciones_proyecto ON EXPORTACIONES (PR_proyecto);');

export default db;
