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
  const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count;
  if (userCount === 0) {
    // Insertar usuario administrador por defecto
    const insertUser = db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertUser.run('admin', 'admin', 'Administrador General', 'ADMIN', 1);

    // Categorias
    const insertCat = db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)');
    ['Papelería', 'Limpieza', 'Herramientas', 'Alimentos', 'Electrónica'].forEach(cat => insertCat.run(cat));

    // Unidades
    const insertUnit = db.prepare('INSERT OR IGNORE INTO unidades_medida (nombre) VALUES (?)');
    ['Pieza', 'Caja', 'Paquete', 'Kilogramo', 'Gramo', 'Litro', 'Metro'].forEach(u => insertUnit.run(u));

    // Proveedores
    const insertProv = db.prepare('INSERT INTO proveedores (nombre, telefono, correo) VALUES (?, ?, ?)');
    insertProv.run('Distribuidora del Centro', '449 123 4567', 'ventas@dcentro.mx');
    insertProv.run('Insumos Bajío', '449 765 4321', 'contacto@insumosbajio.mx');
    insertProv.run('Ferretera Aguascalientes', '449 555 0182', 'pedidos@ferreags.mx');

    // Clientes
    const insertClient = db.prepare('INSERT INTO clientes (nombre, telefono, correo) VALUES (?, ?, ?)');
    insertClient.run('Mostrador general', '—', '—');
    insertClient.run('Comercial Rivera', '449 222 3344', 'compras@rivera.mx');

    // Productos
    const insertProd = db.prepare(`
      INSERT INTO productos (id, codigo, nombre, desc, categoria, unidad, costo, precio, stock, min, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const initialProducts = [
      [1, 'PAP-001', 'Hojas blancas carta', 'Paquete 500 hojas', 'Papelería', 'Paquete', 68, 95, 84, 30, 1],
      [2, 'LIM-014', 'Cloro 1 L', 'Blanqueador líquido', 'Limpieza', 'Litro', 14, 22, 12, 25, 1],
      [3, 'HER-032', 'Martillo de uña', 'Mango de fibra', 'Herramientas', 'Pieza', 120, 180, 18, 10, 1],
      [4, 'ALI-007', 'Arroz blanco', 'Grano largo', 'Alimentos', 'Kilogramo', 19, 28, 240, 80, 1],
      [5, 'ELE-021', 'Cable USB-C 1 m', 'Carga rápida', 'Electrónica', 'Pieza', 45, 89, 9, 15, 1],
      [6, 'PAP-009', 'Marcadores permanentes', 'Caja con 12', 'Papelería', 'Caja', 90, 140, 26, 12, 1],
      [7, 'LIM-020', 'Jabón líquido 5 L', 'Manos, uso general', 'Limpieza', 'Litro', 75, 120, 40, 20, 1],
      [8, 'HER-045', 'Cinta métrica', '5 metros', 'Herramientas', 'Pieza', 35, 60, 5, 8, 1]
    ];
    for (const p of initialProducts) {
      insertProd.run(...p);
    }

    // Movimientos
    const insertMov = db.prepare(`
      INSERT INTO movimientos (id, fecha, pid, tipo, cant, motivo, obs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const initialMovements = [
      [1, '2026-10-31', 1, 'E', 40, 'Compra a proveedor', ''],
      [2, '2026-10-31', 2, 'S', 8, 'Venta', ''],
      [3, '2026-10-30', 4, 'E', 100, 'Compra a proveedor', ''],
      [4, '2026-10-30', 5, 'S', 6, 'Venta', ''],
      [5, '2026-10-29', 3, 'S', 2, 'Venta', ''],
      [6, '2026-10-28', 6, 'E', 12, 'Compra a proveedor', ''],
      [7, '2026-10-28', 8, 'S', 3, 'Ajuste autorizado', ''],
      [8, '2026-10-27', 7, 'E', 20, 'Compra a proveedor', ''],
      [9, '2026-10-27', 1, 'S', 16, 'Venta', ''],
      [10, '2026-10-26', 2, 'E', 10, 'Compra a proveedor', ''],
      [11, '2026-10-26', 5, 'S', 4, 'Venta', ''],
      [12, '2026-10-25', 4, 'S', 30, 'Venta', '']
    ];
    for (const m of initialMovements) {
      insertMov.run(...m);
    }
  }
}

