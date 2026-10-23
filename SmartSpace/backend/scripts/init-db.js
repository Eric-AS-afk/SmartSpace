// Crea (o migra) la base de datos SQLite sin necesidad de levantar el
// servidor completo. Útil para preparar la base de datos antes del primer
// arranque, o para verificar su estado en cualquier momento.
//
// Uso:
//   cd backend
//   node scripts/init-db.js
//   (o: npm run db:init)
//
// Importar db.js ya ejecuta, como efecto secundario, las sentencias
// CREATE TABLE IF NOT EXISTS / ALTER TABLE / CREATE INDEX que definen el
// esquema (ver src/db.js). Ese archivo es la única fuente de verdad del
// esquema — este script no la duplica, solo la reutiliza y reporta el
// resultado. El servidor (src/server.js) ejecuta exactamente el mismo
// código cada vez que arranca, así que correr este script a mano es
// opcional: sirve para preparar la base de datos por adelantado o para
// confirmar su estado, no para un paso obligatorio antes de `npm start`.

import db from '../src/db.js';

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all();

console.log(`Base de datos lista en: ${db.name}`);
console.log('');
console.log('Tablas:');

for (const { name } of tables) {
  const { count } = db.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get();
  console.log(`  - ${name} (${count} fila${count === 1 ? '' : 's'})`);
}

console.log('');
console.log('Esquema al día.');

db.close();
