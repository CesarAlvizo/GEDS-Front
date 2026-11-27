import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from '../server/passwords.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'demo', 'geds-demo.sqlite');
mkdirSync(path.dirname(output), { recursive: true });
rmSync(output, { force: true });

const db = new DatabaseSync(output);
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, nombre TEXT NOT NULL, rol TEXT DEFAULT 'ADMIN',
    activo INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE categorias (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL);
  CREATE TABLE unidades_medida (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL);
  CREATE TABLE proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, telefono TEXT, correo TEXT);
  CREATE TABLE clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, telefono TEXT, correo TEXT);
  CREATE TABLE productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER DEFAULT 1, codigo TEXT NOT NULL,
    nombre TEXT NOT NULL, desc TEXT, categoria TEXT NOT NULL, unidad TEXT NOT NULL,
    costo REAL DEFAULT 0, precio REAL DEFAULT 0, stock REAL DEFAULT 0, min REAL DEFAULT 0,
    activo INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );
  CREATE TABLE movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER DEFAULT 1, fecha TEXT NOT NULL,
    pid INTEGER NOT NULL, tipo TEXT CHECK(tipo IN ('E','S')) NOT NULL, cant REAL NOT NULL,
    motivo TEXT DEFAULT '', obs TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pid) REFERENCES productos(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );
`);

const demoPassword = 'DemoGeds2026!';
db.prepare('INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)')
  .run('demo_admin', hashPassword(demoPassword), 'Farmacia de Demostración', 'ADMIN');

const categories = ['Analgésicos', 'Cuidado personal', 'Vitaminas', 'Primeros auxilios'];
const units = ['Pieza', 'Caja', 'Frasco', 'Paquete'];
const providers = [
  ['Distribuidora Salud Ejemplo', '449-000-0101', 'ventas@salud-ejemplo.invalid'],
  ['Suministros Médicos Muestra', '449-000-0102', 'contacto@medicos-muestra.invalid'],
];
const clients = [
  ['Cliente Demostración Uno', '449-000-0201', 'cliente1@example.invalid'],
  ['Cliente Demostración Dos', '449-000-0202', 'cliente2@example.invalid'],
];
for (const name of categories) db.prepare('INSERT INTO categorias (nombre) VALUES (?)').run(name);
for (const name of units) db.prepare('INSERT INTO unidades_medida (nombre) VALUES (?)').run(name);
for (const row of providers) db.prepare('INSERT INTO proveedores (nombre, telefono, correo) VALUES (?, ?, ?)').run(...row);
for (const row of clients) db.prepare('INSERT INTO clientes (nombre, telefono, correo) VALUES (?, ?, ?)').run(...row);

const products = [
  ['DEMO-001', 'Paracetamol 500 mg', 'Tabletas para demostración', 'Analgésicos', 'Caja', 24, 39, 42, 10],
  ['DEMO-002', 'Ibuprofeno 400 mg', 'Tabletas para demostración', 'Analgésicos', 'Caja', 31, 49, 8, 12],
  ['DEMO-003', 'Vitamina C 1 g', 'Suplemento para demostración', 'Vitaminas', 'Frasco', 52, 79, 18, 6],
  ['DEMO-004', 'Alcohol antiséptico', 'Solución para demostración', 'Primeros auxilios', 'Frasco', 28, 45, 5, 8],
  ['DEMO-005', 'Gel antibacterial', 'Producto de muestra', 'Cuidado personal', 'Pieza', 19, 32, 36, 10],
  ['DEMO-006', 'Vendas elásticas', 'Material de muestra', 'Primeros auxilios', 'Paquete', 34, 55, 7, 10],
  ['DEMO-007', 'Multivitamínico', 'Suplemento para demostración', 'Vitaminas', 'Frasco', 68, 99, 23, 8],
  ['DEMO-008', 'Termómetro digital', 'Dispositivo de muestra', 'Cuidado personal', 'Pieza', 85, 129, 14, 4],
];
const addProduct = db.prepare(`INSERT INTO productos
  (usuario_id,codigo,nombre,desc,categoria,unidad,costo,precio,stock,min,activo)
  VALUES (1,?,?,?,?,?,?,?,?,?,1)`);
const addMovement = db.prepare(`INSERT INTO movimientos (usuario_id,fecha,pid,tipo,cant,motivo,obs)
  VALUES (1,?,?,?,?,?,?)`);
for (const [index, product] of products.entries()) {
  const [code, name, description, category, unit, cost, price, stock, min] = product;
  const result = addProduct.run(code, name, description, category, unit, cost, price, 0, min);
  const id = Number(result.lastInsertRowid);
  const inbound = stock + (index % 3) + 4;
  const outbound = inbound - stock;
  const dateIn = new Date(Date.now() - (20 + index * 3) * 86400000).toISOString().slice(0, 10);
  const dateOut = new Date(Date.now() - (index + 1) * 86400000).toISOString().slice(0, 10);
  addMovement.run(dateIn, id, 'E', inbound, 'Compra', 'Registro ficticio de portafolio');
  addMovement.run(dateOut, id, 'S', outbound, 'Venta', 'Registro ficticio de portafolio');
}
db.exec('PRAGMA user_version = 1; PRAGMA journal_mode = DELETE;');
db.close();
console.log(`Base de demostración creada: ${path.relative(root, output)}`);
