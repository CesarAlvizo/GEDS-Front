// server/validators.js - Validaciones estrictas y sanitización contra inyecciones

export class ValidationError extends Error {
  constructor(message, errors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = 400;
  }
}

// Patrones sospechosos de SQL Injection comunes
const SQLI_REGEX = /('|"|;|--|\/\*|\*\/|xp_|union\s+select|insert\s+into|drop\s+table|exec\(|benchmark\(|sleep\()/i;

export const Validators = {
  // Limpia y normaliza texto eliminando caracteres de control nulos
  sanitizeString(val) {
    if (val === null || val === undefined) return '';
    return String(val).replace(/\0/g, '').trim();
  },

  // Valida si un texto contiene patrones de inyección explícita
  hasSqlInjectionPattern(val) {
    if (!val || typeof val !== 'string') return false;
    return SQLI_REGEX.test(val);
  },

  validateLogin(body) {
    const username = this.sanitizeString(body.username);
    const password = this.sanitizeString(body.password);

    if (!username || !password) {
      throw new ValidationError('Usuario y contraseña son requeridos');
    }

    if (username.length > 50) {
      throw new ValidationError('El nombre de usuario no puede exceder 50 caracteres');
    }

    return { username, password };
  },

  validateProduct(body, isUpdate = false) {
    const errors = {};
    const codigo = this.sanitizeString(body.codigo);
    const nombre = this.sanitizeString(body.nombre);
    const desc = this.sanitizeString(body.desc || body.descripcion);
    const categoria = this.sanitizeString(body.categoria);
    const unidad = this.sanitizeString(body.unidad);

    if (!codigo) errors.codigo = 'El código del producto es obligatorio';
    else if (codigo.length > 50) errors.codigo = 'El código no puede exceder 50 caracteres';

    if (!nombre) errors.nombre = 'El nombre del producto es obligatorio';
    else if (nombre.length > 150) errors.nombre = 'El nombre no puede exceder 150 caracteres';

    if (desc && desc.length > 500) errors.desc = 'La descripción no puede exceder 500 caracteres';

    const costo = Number(body.costo);
    if (isNaN(costo) || costo < 0) errors.costo = 'El costo debe ser un número mayor o igual a 0';

    const precio = Number(body.precio);
    if (isNaN(precio) || precio < 0) errors.precio = 'El precio debe ser un número mayor o igual a 0';

    const stock = Number(body.stock);
    if (isNaN(stock) || stock < 0) errors.stock = 'El stock debe ser un número mayor o igual a 0';

    const min = Number(body.min ?? body.stock_minimo);
    if (isNaN(min) || min < 0) errors.min = 'El stock mínimo debe ser un número mayor o igual a 0';

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Datos del producto inválidos', errors);
    }

    return {
      codigo,
      nombre,
      desc,
      categoria: categoria || 'General',
      unidad: unidad || 'Pieza',
      costo,
      precio,
      stock,
      min,
      activo: body.activo !== false
    };
  },

  validateMovement(body) {
    const errors = {};
    const pid = Number(body.pid);
    if (!pid || isNaN(pid) || pid <= 0) {
      errors.pid = 'Identificador de producto inválido';
    }

    const tipo = this.sanitizeString(body.tipo).toUpperCase();
    if (tipo !== 'E' && tipo !== 'S') {
      errors.tipo = "El tipo de movimiento debe ser 'E' (Entrada) o 'S' (Salida)";
    }

    const cant = Number(body.cant);
    if (isNaN(cant) || cant <= 0) {
      errors.cant = 'La cantidad debe ser un número positivo mayor a 0';
    }

    const fecha = this.sanitizeString(body.fecha) || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      errors.fecha = 'El formato de fecha debe ser AAAA-MM-DD';
    }

    const motivo = this.sanitizeString(body.motivo);
    if (motivo.length > 150) {
      errors.motivo = 'El motivo no puede exceder 150 caracteres';
    }

    const obs = this.sanitizeString(body.obs);
    if (obs.length > 300) {
      errors.obs = 'Las observaciones no pueden exceder 300 caracteres';
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Datos de movimiento inválidos', errors);
    }

    return { pid, tipo, cant, fecha, motivo, obs };
  },

  validateId(id) {
    const num = Number(id);
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      throw new ValidationError('ID inválido: debe ser un entero positivo');
    }
    return num;
  },

  validateCatalogName(name) {
    const clean = this.sanitizeString(name).toLowerCase();
    const allowed = ['categories', 'units', 'providers', 'clients'];
    if (!allowed.includes(clean)) {
      throw new ValidationError(`Catálogo '${name}' no permitido.`);
    }
    return clean;
  }
};

