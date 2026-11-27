import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './passwords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, 'geds.sqlite');
const PRIVATE_DATA_PATH = path.resolve(__dirname, 'private', 'pharmacy-data.json');
const SINGLE_STORE_VERSION = 1;

loadLocalEnvironment();

let dbInstance = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  dbInstance = new DatabaseSync(DB_PATH);
  try {
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA secure_delete = ON;');
    initSchema(dbInstance);
    seedInitialData(dbInstance);
  } catch (error) {
    dbInstance.close();
    dbInstance = null;
    throw error;
  }

  return dbInstance;
}

function loadLocalEnvironment() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#') || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function initSchema(db) {
  try {
    const prodCols = db.prepare('PRAGMA table_info(productos)').all();
    if (!prodCols.some(c => c.name === 'usuario_id')) {
      db.exec('ALTER TABLE productos ADD COLUMN usuario_id INTEGER DEFAULT 1;');
    }
  } catch (e) {}

  try {
    const movCols = db.prepare('PRAGMA table_info(movimientos)').all();
    if (!movCols.some(c => c.name === 'usuario_id')) {
      db.exec('ALTER TABLE movimientos ADD COLUMN usuario_id INTEGER DEFAULT 1;');
    }
  } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT DEFAULT 'ADMIN',
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS unidades_medida (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      correo TEXT
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      correo TEXT
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER DEFAULT 1,
      codigo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      desc TEXT,
      categoria TEXT NOT NULL,
      unidad TEXT NOT NULL,
      costo REAL DEFAULT 0.0,
      precio REAL DEFAULT 0.0,
      stock REAL DEFAULT 0.0,
      min REAL DEFAULT 0.0,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER DEFAULT 1,
      fecha TEXT NOT NULL,
      pid INTEGER NOT NULL,
      tipo TEXT CHECK(tipo IN ('E', 'S')) NOT NULL,
      cant REAL NOT NULL,
      motivo TEXT DEFAULT '',
      obs TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pid) REFERENCES productos(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TRIGGER IF NOT EXISTS trg_valida_producto_precio_insert
    BEFORE INSERT ON productos
    BEGIN
      SELECT CASE
        WHEN NEW.costo < 0 OR NEW.precio < 0 OR NEW.stock < 0 OR NEW.min < 0 THEN
          RAISE(ABORT, 'Seguridad BD: Valores numéricos en productos no pueden ser negativos.')
        WHEN LENGTH(TRIM(NEW.codigo)) < 2 THEN
          RAISE(ABORT, 'Seguridad BD: El código del producto debe contener al menos 2 caracteres.')
        WHEN LENGTH(TRIM(NEW.nombre)) < 2 THEN
          RAISE(ABORT, 'Seguridad BD: El nombre del producto no puede estar vacío.')
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_valida_producto_precio_update
    BEFORE UPDATE ON productos
    BEGIN
      SELECT CASE
        WHEN NEW.costo < 0 OR NEW.precio < 0 OR NEW.stock < 0 OR NEW.min < 0 THEN
          RAISE(ABORT, 'Seguridad BD: Valores numéricos en productos no pueden ser negativos.')
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_valida_movimiento_insert
    BEFORE INSERT ON movimientos
    BEGIN
      SELECT CASE
        WHEN NEW.cant <= 0 THEN
          RAISE(ABORT, 'Seguridad BD: La cantidad del movimiento debe ser estrictamente mayor a 0.')
        WHEN NEW.tipo = 'S' AND (SELECT stock FROM productos WHERE id = NEW.pid) < NEW.cant THEN
          RAISE(ABORT, 'Seguridad BD: Violación de stock insuficiente para salida de inventario.')
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_actualiza_stock_movimiento
    AFTER INSERT ON movimientos
    BEGIN
      UPDATE productos
      SET stock = CASE
        WHEN NEW.tipo = 'E' THEN stock + NEW.cant
        WHEN NEW.tipo = 'S' THEN stock - NEW.cant
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.pid;
    END;
  `);
}

function seedInitialData(db) {
  const version = Number(db.prepare('PRAGMA user_version').get().user_version || 0);
  if (version >= SINGLE_STORE_VERSION) {
    delete process.env.FARMA_INITIAL_PASSWORD;
    return;
  }

  const username = String(process.env.FARMA_USERNAME || '').trim();
  const pharmacyName = String(process.env.FARMA_NAME || '').trim();
  const initialPassword = process.env.FARMA_INITIAL_PASSWORD;
  if (!username || !pharmacyName || !initialPassword) {
    throw new Error('Configura FARMA_USERNAME, FARMA_NAME y FARMA_INITIAL_PASSWORD antes de inicializar la base local. Usa .env.example como guía.');
  }
  if (!existsSync(PRIVATE_DATA_PATH)) {
    throw new Error('Falta el catálogo privado server/private/pharmacy-data.json.');
  }
  const data = JSON.parse(readFileSync(PRIVATE_DATA_PATH, 'utf8'));

  let transactionOpen = false;
  try {
    db.exec('BEGIN IMMEDIATE');
    transactionOpen = true;
    db.exec(`
      DELETE FROM movimientos;
      DELETE FROM productos;
      DELETE FROM clientes;
      DELETE FROM proveedores;
      DELETE FROM categorias;
      DELETE FROM unidades_medida;
      DELETE FROM usuarios;
      DELETE FROM sqlite_sequence WHERE name IN ('usuarios', 'productos', 'movimientos', 'categorias', 'unidades_medida', 'clientes', 'proveedores');
    `);

    db.prepare(`
      INSERT INTO usuarios (id, username, password_hash, nombre, rol, activo)
      VALUES (1, ?, ?, ?, 'ADMIN', 1)
    `).run(username, hashPassword(initialPassword), pharmacyName);

    const insertCategory = db.prepare('INSERT INTO categorias (nombre) VALUES (?)');
    for (const category of data.categories) insertCategory.run(category);

    const insertUnit = db.prepare('INSERT INTO unidades_medida (nombre) VALUES (?)');
    for (const unit of data.units) insertUnit.run(unit);

    const insertProvider = db.prepare('INSERT INTO proveedores (nombre, telefono, correo) VALUES (?, ?, ?)');
    for (const provider of data.providers) insertProvider.run(provider.nombre, provider.telefono || '', provider.correo || '');

    const insertClient = db.prepare('INSERT INTO clientes (nombre, telefono, correo) VALUES (?, ?, ?)');
    for (const client of data.clients) insertClient.run(client.nombre, client.telefono || '', client.correo || '');

    const insertProduct = db.prepare(`
      INSERT INTO productos (usuario_id, codigo, nombre, desc, categoria, unidad, costo, precio, stock, min, activo)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1)
    `);
    const insertMovement = db.prepare(`
      INSERT INTO movimientos (usuario_id, fecha, pid, tipo, cant, motivo, obs)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `);
    const dateAtOffset = days => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString().slice(0, 10);
    };

    data.products.forEach((product, index) => {
      const result = insertProduct.run(
        product.codigo, product.nombre, product.desc, product.categoria, product.unidad,
        product.costo, product.precio, product.min
      );
      const productId = Number(result.lastInsertRowid);
      const stock = Number(product.stock);
      const exitQuantity = Math.max(1, Math.floor(stock * 0.08));
      insertMovement.run(dateAtOffset(45 + (index % 20)), productId, 'E', stock + exitQuantity, 'Inventario inicial', 'Carga inicial de existencias');
      insertMovement.run(dateAtOffset(2 + (index % 12)), productId, 'S', exitQuantity, 'Venta mostrador', 'Movimiento de demostración');
    });

    db.exec(`PRAGMA user_version = ${SINGLE_STORE_VERSION}`);
    db.exec('COMMIT');
    transactionOpen = false;
    delete process.env.FARMA_INITIAL_PASSWORD;
  } catch (error) {
    if (transactionOpen) db.exec('ROLLBACK');
    throw error;
  }
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.exec('VACUUM');
}
