import { getDatabase } from './db.js';
import { verifyPassword } from './passwords.js';

export const UserModel = {
  findByCredentials(username, password) {
    const db = getDatabase();
    const user = db.prepare(`
      SELECT id, username, nombre, rol, activo, password_hash
      FROM usuarios
      WHERE username = ? AND activo = 1
      LIMIT 1
    `).get(String(username));
    if (!user || !verifyPassword(password, user.password_hash)) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
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
  },

};

export const ProductModel = {
  getAll(filters = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM productos WHERE 1=1';
    const params = [];

    if (filters.usuario_id) {
      sql += ' AND usuario_id = ?';
      params.push(Number(filters.usuario_id));
    }

    if (filters.category) {
      sql += ' AND categoria = ?';
      params.push(String(filters.category));
    }

    if (filters.onlyLowStock) {
      sql += ' AND stock <= min';
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

    if (filters.usuario_id) {
      sql += ' AND usuario_id = ?';
      params.push(Number(filters.usuario_id));
    }

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
  // Lista blanca de catálogos.
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
    
    const num = Number(indexOrId);
    let targetId = null;

    if (!meta.isComplex) {
      const rawRows = db.prepare(`SELECT id FROM ${meta.table} ORDER BY id ASC`).all();
      if (rawRows[num]) {
        targetId = rawRows[num].id;
      }
    } else {
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

export const StoredProcedures = {
  // El trigger sincroniza el stock.
  sp_registrar_movimiento_inventario(movementData) {
    const db = getDatabase();
    
    db.exec('BEGIN TRANSACTION;');
    try {
      const prodStmt = db.prepare('SELECT id, stock, unidad, activo FROM productos WHERE id = ?');
      const prod = prodStmt.get(Number(movementData.pid));

      if (!prod) {
        throw new Error('Procedimiento Almacenado: Producto no encontrado');
      }

      if (!prod.activo) {
        throw new Error('Procedimiento Almacenado: No se pueden registrar movimientos en un producto inactivo');
      }

      const cant = Number(movementData.cant);
      if (cant <= 0) {
        throw new Error('Procedimiento Almacenado: La cantidad debe ser estrictamente mayor a 0');
      }

      if (movementData.tipo === 'S' && prod.stock < cant) {
        throw new Error(`Procedimiento Almacenado: Stock insuficiente. Disponible: ${prod.stock} ${prod.unidad}`);
      }

      const insertStmt = db.prepare(`
        INSERT INTO movimientos (usuario_id, fecha, pid, tipo, cant, motivo, obs)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const res = insertStmt.run(
        Number(movementData.usuario_id || 1),
        String(movementData.fecha),
        Number(movementData.pid),
        String(movementData.tipo),
        cant,
        String(movementData.motivo || '').trim(),
        String(movementData.obs || '').trim()
      );

      const newMov = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(res.lastInsertRowid);
      const updatedProd = db.prepare('SELECT * FROM productos WHERE id = ?').get(prod.id);

      db.exec('COMMIT;');
      return { movement: newMov, product: { ...updatedProd, activo: Boolean(updatedProd.activo) } };
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
  },

  sp_crear_producto_seguro(productData) {
    const db = getDatabase();
    db.exec('BEGIN TRANSACTION;');
    try {
      const uId = Number(productData.usuario_id || 1);
      const checkCode = db.prepare('SELECT id FROM productos WHERE codigo = ? AND usuario_id = ?').get(String(productData.codigo).trim(), uId);
      if (checkCode) {
        throw new Error(`Procedimiento Almacenado: El código ${productData.codigo} ya existe en tu almacén`);
      }

      const stmt = db.prepare(`
        INSERT INTO productos (usuario_id, codigo, nombre, desc, categoria, unidad, costo, precio, stock, min, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        uId,
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

      const created = db.prepare('SELECT * FROM productos WHERE id = ?').get(res.lastInsertRowid);
      db.exec('COMMIT;');
      return { ...created, activo: Boolean(created.activo) };
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
  }
};

