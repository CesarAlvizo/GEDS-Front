import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, 'geds.sqlite');

let dbInstance = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  dbInstance = new DatabaseSync(DB_PATH);
  
  // Habilitar claves foraneas y optimizaciones
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA journal_mode = WAL;');

  initSchema(dbInstance);
  seedInitialData(dbInstance);

  return dbInstance;
}

function initSchema(db) {
  // Asegurar migración de columnas si la tabla ya existía
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

    -- =========================================================================
    -- TRIGGERS DE SEGURIDAD E INTEGRIDAD DE DATOS (PROTECCIÓN A NIVEL DE BD)
    -- =========================================================================

    -- 1. Trigger de validación de precios y costos en productos (BEFORE INSERT / UPDATE)
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

    -- 2. Trigger de validación de cantidad positiva en movimientos (BEFORE INSERT)
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

    -- 3. Trigger para actualización automática del stock de producto tras registrar movimiento (AFTER INSERT)
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
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO usuarios (id, username, password_hash, nombre, rol, activo)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // 1. Super Administrador General
  insertUser.run(1, 'admin', 'admin', 'Administrador General', 'ADMIN', 1);

  // 2. Cliente 1: Farmacia San José
  insertUser.run(2, 'farmacia_sj', 'cliente123', 'Farmacia San José', 'ADMIN', 1);

  // 3. Cliente 2: Ferretería El Roble
  insertUser.run(3, 'ferre_roble', 'cliente123', 'Ferretería El Roble', 'ADMIN', 1);

  // Categorias base
  const insertCat = db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)');
  ['Papelería', 'Limpieza', 'Herramientas', 'Alimentos', 'Electrónica', 'Medicamentos', 'Ferretería'].forEach(cat => insertCat.run(cat));

  // Unidades base
  const insertUnit = db.prepare('INSERT OR IGNORE INTO unidades_medida (nombre) VALUES (?)');
  ['Pieza', 'Caja', 'Paquete', 'Kilogramo', 'Gramo', 'Litro', 'Metro'].forEach(u => insertUnit.run(u));

  // Proveedores
  const provCount = db.prepare('SELECT COUNT(*) as count FROM proveedores').get().count;
  if (provCount === 0) {
    const insertProv = db.prepare('INSERT INTO proveedores (nombre, telefono, correo) VALUES (?, ?, ?)');
    insertProv.run('Distribuidora del Centro', '449 123 4567', 'ventas@dcentro.mx');
    insertProv.run('Insumos Bajío', '449 765 4321', 'contacto@insumosbajio.mx');
    insertProv.run('Ferretera Aguascalientes', '449 555 0182', 'pedidos@ferreags.mx');
  }

  // Clientes
  const clientCount = db.prepare('SELECT COUNT(*) as count FROM clientes').get().count;
  if (clientCount === 0) {
    const insertClient = db.prepare('INSERT INTO clientes (nombre, telefono, correo) VALUES (?, ?, ?)');
    insertClient.run('Mostrador general', '—', '—');
    insertClient.run('Comercial Rivera', '449 222 3344', 'compras@rivera.mx');
  }

  // Verificar si ya existen productos para los clientes prueba
  const prodUser2 = db.prepare('SELECT COUNT(*) as count FROM productos WHERE usuario_id = 2').get().count;
  if (prodUser2 === 0) {
    const insertProd = db.prepare(`
      INSERT INTO productos (usuario_id, codigo, nombre, desc, categoria, unidad, costo, precio, stock, min, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Productos para Farmacia San José (usuario_id: 2)
    const p1 = insertProd.run(2, 'MED-001', 'Paracetamol 500mg', 'Caja con 20 tabletas', 'Medicamentos', 'Caja', 18.5, 35.0, 150, 40, 1);
    const p2 = insertProd.run(2, 'MED-002', 'Amoxicilina 500mg', 'Caja con 12 cápsulas', 'Medicamentos', 'Caja', 45.0, 85.0, 65, 20, 1);
    const p3 = insertProd.run(2, 'MED-003', 'Alcohol Etílico 70% 500ml', 'Antiséptico en botella', 'Limpieza', 'Pieza', 22.0, 42.0, 12, 25, 1); // Stock bajo
    const p4 = insertProd.run(2, 'MED-004', 'Cubrebocas Tricapa', 'Caja con 50 piezas', 'Limpieza', 'Caja', 35.0, 65.0, 80, 30, 1);
    const p5 = insertProd.run(2, 'MED-005', 'Ibuprofeno 400mg', 'Caja con 10 cápsulas', 'Medicamentos', 'Caja', 28.0, 52.0, 95, 30, 1);

    // Movimientos para Farmacia San José
    const insertMov = db.prepare(`
      INSERT INTO movimientos (usuario_id, fecha, pid, tipo, cant, motivo, obs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMov.run(2, '2026-11-20', Number(p1.lastInsertRowid), 'E', 200, 'Recepción de pedido', 'Lote FAR-2026-A');
    insertMov.run(2, '2026-11-21', Number(p1.lastInsertRowid), 'S', 50, 'Venta a mostrador', 'Ticket #1021');
    insertMov.run(2, '2026-11-21', Number(p2.lastInsertRowid), 'E', 80, 'Recepción de pedido', 'Distribuidora Médica');
    insertMov.run(2, '2026-11-22', Number(p2.lastInsertRowid), 'S', 15, 'Venta a mostrador', 'Ticket #1045');
    insertMov.run(2, '2026-11-22', Number(p3.lastInsertRowid), 'E', 30, 'Compra local', 'Reposición');
    insertMov.run(2, '2026-11-23', Number(p3.lastInsertRowid), 'S', 18, 'Venta corporativa', 'Clínica dental');
  }

  const prodUser3 = db.prepare('SELECT COUNT(*) as count FROM productos WHERE usuario_id = 3').get().count;
  if (prodUser3 === 0) {
    const insertProd = db.prepare(`
      INSERT INTO productos (usuario_id, codigo, nombre, desc, categoria, unidad, costo, precio, stock, min, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Productos para Ferretería El Roble (usuario_id: 3)
    const f1 = insertProd.run(3, 'FER-010', 'Taladro Percutor 650W', 'Mandril de 1/2 pulgada', 'Herramientas', 'Pieza', 650.0, 999.0, 14, 5, 1);
    const f2 = insertProd.run(3, 'FER-011', 'Juego de Destornilladores', 'Kit de 6 piezas cromo vanadio', 'Herramientas', 'Pieza', 110.0, 189.0, 4, 10, 1); // Stock bajo
    const f3 = insertProd.run(3, 'FER-012', 'Tornillo para Madera 2"', 'Caja de 100 piezas', 'Ferretería', 'Caja', 40.0, 75.0, 220, 50, 1);
    const f4 = insertProd.run(3, 'FER-013', 'Disco de Corte Metal 4-1/2"', 'Extra fino 1mm', 'Herramientas', 'Pieza', 15.0, 32.0, 350, 80, 1);
    const f5 = insertProd.run(3, 'FER-014', 'Pintura Blanca Vinílica 19L', 'Cubeta acabado mate', 'Limpieza', 'Pieza', 780.0, 1250.0, 18, 8, 1);

    const insertMov = db.prepare(`
      INSERT INTO movimientos (usuario_id, fecha, pid, tipo, cant, motivo, obs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMov.run(3, '2026-11-18', Number(f1.lastInsertRowid), 'E', 20, 'Compra a mayorista', 'Factura FER-882');
    insertMov.run(3, '2026-11-19', Number(f1.lastInsertRowid), 'S', 6, 'Venta a contratista', 'Obra Las Américas');
    insertMov.run(3, '2026-11-20', Number(f3.lastInsertRowid), 'E', 300, 'Recepción directa', 'Insumos Industriales');
    insertMov.run(3, '2026-11-21', Number(f3.lastInsertRowid), 'S', 80, 'Venta por mayoreo', 'Carpintería Moderna');
    insertMov.run(3, '2026-11-22', Number(f4.lastInsertRowid), 'E', 400, 'Pedido quincenal', 'Aceros del Bajío');
    insertMov.run(3, '2026-11-23', Number(f4.lastInsertRowid), 'S', 50, 'Venta al público', 'Mostrador');
  }
}

