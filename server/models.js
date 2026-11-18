// server/models.js - Modelos con consultas preparadas y parámetros vinculados (Protección SQL Injection)
import { getDatabase } from './db.js';

export const UserModel = {
  findByCredentials(username, password) {
    const db = getDatabase();
    // Consulta preparada con parámetros vinculados obligatorios: previene SQL Injection
    const stmt = db.prepare(`
      SELECT id, username, nombre, rol, activo
      FROM usuarios
      WHERE username = ? AND password_hash = ? AND activo = 1
    `);
    const user = stmt.get(String(username), String(password));
    return user || null;
  },

  findById(id) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, username, nombre, rol, activo
      FROM usuarios
      WHERE id = ?
    `);
    const user = stmt.get(Number(id));
    return user || null;
  }
};

export const ProductModel = {
  getAll(filters = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM productos WHERE 1=1';
    const params = [];

    if (filters.category) {
      sql += ' AND categoria = ?';
      params.push(String(filters.category));
    }

    if (filters.onlyLowStock) {
      sql += ' AND stock <= min';
    }

    if (filters.activeOnly !== false) {
      // Por defecto lista todos o filtrado
    }

    sql += ' ORDER BY id DESC';

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(r => ({ ...r, activo: Boolean(r.activo) }));
  },

  getById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM productos WHERE id = ?');
    const row = stmt.get(Number(id));
    if (!row) return null;
    return { ...row, activo: Boolean(row.activo) };
  },

  getByCodigo(codigo) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM productos WHERE codigo = ?');
    const row = stmt.get(String(codigo).trim());
    if (!row) return null;
    return { ...row, activo: Boolean(row.activo) };
  },

  create(productData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO productos (codigo, nombre, desc, categoria, unidad, costo, precio, stock, min, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      String(productData.codigo).trim(),
      String(productData.nombre).trim(),
      String(productData.desc || '').trim(),
      String(productData.categoria).trim(),
      String(productData.unidad).trim(),
      Number(productData.costo) || 0,
      Number(productData.precio) || 0,
      Number(productData.stock) || 0,
      Number(productData.min) || 0,
      productData.activo === false ? 0 : 1
    );
    return this.getById(result.lastInsertRowid);
  },

  update(id, productData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE productos
      SET codigo = ?, nombre = ?, desc = ?, categoria = ?, unidad = ?, costo = ?, precio = ?, stock = ?, min = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      String(productData.codigo).trim(),
      String(productData.nombre).trim(),
      String(productData.desc || '').trim(),
      String(productData.categoria).trim(),
      String(productData.unidad).trim(),
      Number(productData.costo) || 0,
      Number(productData.precio) || 0,
      Number(productData.stock) || 0,
      Number(productData.min) || 0,
      productData.activo === false ? 0 : 1,
      Number(id)
    );
    return this.getById(id);
  },

  deactivate(id) {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE productos SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(Number(id));
    return this.getById(id);
  },

  updateStock(id, newStock) {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE productos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(Number(newStock), Number(id));
  }
};

export const MovementModel = {
  getAll(filters = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM movimientos WHERE 1=1';
    const params = [];

    if (filters.fromDate) {
      sql += ' AND fecha >= ?';
      params.push(String(filters.fromDate));
    }
    if (filters.toDate) {
      sql += ' AND fecha <= ?';
      params.push(String(filters.toDate));
    }
    if (filters.pid) {
      sql += ' AND pid = ?';
      params.push(Number(filters.pid));
    }
    if (filters.tipo) {
      sql += ' AND tipo = ?';
      params.push(String(filters.tipo));
    }

    sql += ' ORDER BY fecha DESC, id DESC';

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  create(movementData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO movimientos (fecha, pid, tipo, cant, motivo, obs)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      String(movementData.fecha),
      Number(movementData.pid),
      String(movementData.tipo),
      Number(movementData.cant),
      String(movementData.motivo || '').trim(),
      String(movementData.obs || '').trim()
    );
    const getStmt = db.prepare('SELECT * FROM movimientos WHERE id = ?');
    return getStmt.get(result.lastInsertRowid);
  }
};

export const CatalogModel = {
  // Manejo de catalogos mapeados de forma segura (whitelist)
  VALID_CATALOGS: {
    categories: { table: 'categorias', isComplex: false },
    units: { table: 'unidades_medida', isComplex: false },
    providers: { table: 'proveedores', isComplex: true },
    clients: { table: 'clientes', isComplex: true }
  },

  getAll(catalogName) {
    const meta = this.VALID_CATALOGS[catalogName];
    if (!meta) return null;

    const db = getDatabase();
    // meta.table viene de lista blanca estricta (no ingresada directamente por el usuario)
    const stmt = db.prepare(`SELECT * FROM ${meta.table} ORDER BY id ASC`);
    const rows = stmt.all();

    if (!meta.isComplex) {
      return rows.map(r => r.nombre);
    }
    return rows.map(r => ({ id: r.id, n: r.nombre, t: r.telefono, c: r.correo }));
  },

  addItem(catalogName, data) {
    const meta = this.VALID_CATALOGS[catalogName];
    if (!meta) return null;

    const db = getDatabase();
    if (!meta.isComplex) {
      const stmt = db.prepare(`INSERT OR IGNORE INTO ${meta.table} (nombre) VALUES (?)`);
      stmt.run(String(data).trim());
    } else {
      const stmt = db.prepare(`INSERT INTO ${meta.table} (nombre, telefono, correo) VALUES (?, ?, ?)`);
      stmt.run(
        String(data.n || data.nombre || '').trim(),
        String(data.t || data.telefono || '—').trim(),
        String(data.c || data.correo || '—').trim()
      );
    }
    return this.getAll(catalogName);
  },

  removeItem(catalogName, indexOrId) {
    const meta = this.VALID_CATALOGS[catalogName];
    if (!meta) return null;

    const db = getDatabase();
    const items = this.getAll(catalogName);
    
    // Si indexOrId es el index posicional o el ID
    const num = Number(indexOrId);
    let targetId = null;

    if (!meta.isComplex) {
      // En lista simple de strings, indexOrId suele ser el índice en el array
      const rawRows = db.prepare(`SELECT id FROM ${meta.table} ORDER BY id ASC`).all();
      if (rawRows[num]) {
        targetId = rawRows[num].id;
      }
    } else {
      // En objetos, verificar si coincide con index o id
      const rawRows = db.prepare(`SELECT id FROM ${meta.table} ORDER BY id ASC`).all();
      if (rawRows[num]) {
        targetId = rawRows[num].id;
      } else {
        targetId = num;
      }
    }

    if (targetId !== null) {
      const stmt = db.prepare(`DELETE FROM ${meta.table} WHERE id = ?`);
      stmt.run(targetId);
    }

    return this.getAll(catalogName);
  }
};

