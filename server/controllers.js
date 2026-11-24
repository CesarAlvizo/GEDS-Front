// server/controllers.js - Controladores que orquestan modelos y validaciones
import { UserModel, ProductModel, MovementModel, CatalogModel, StoredProcedures } from './models.js';
import { Validators, ValidationError } from './validators.js';

export const AuthController = {
  async login(req, res, body, sendJson) {
    const validated = Validators.validateLogin(body);
    const user = UserModel.findByCredentials(validated.username, validated.password);

    if (!user) {
      return sendJson(res, 401, { message: 'Credenciales inválidas' });
    }

    // Token simulado con ID de usuario embebido para control multi-inquilino seguro
    const token = `token-jwt-${user.id}-${Date.now()}`;
    return sendJson(res, 200, {
      token,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        rol: user.rol
      }
    });
  },

  async logout(req, res, sendJson) {
    return sendJson(res, 200, { message: 'Sesión finalizada' });
  }
};

export const UserController = {
  async getAll(req, res, sendJson) {
    const users = UserModel.getAll();
    return sendJson(res, 200, users);
  },

  async create(req, res, body, sendJson) {
    const username = Validators.sanitizeString(body.username);
    const password = Validators.sanitizeString(body.password);
    const nombre = Validators.sanitizeString(body.nombre);

    if (!username || username.length < 3) {
      throw new ValidationError('El nombre de usuario debe contener al menos 3 caracteres alfanuméricos.');
    }
    Validators.assertSafeText(username, 'usuario', true);

    if (!password || password.length < 4) {
      throw new ValidationError('La contraseña debe contener al menos 4 caracteres.');
    }
    if (Validators.hasSqlInjectionPattern(password)) {
      throw new ValidationError('Contraseña no permitida');
    }

    if (nombre) {
      Validators.assertSafeText(nombre, 'nombre');
    }

    const newUser = UserModel.create({ username, password, nombre: nombre || username });
    return sendJson(res, 201, newUser);
  },

  async delete(req, res, idParam, sendJson) {
    const id = Validators.validateId(idParam);
    UserModel.delete(id);
    return sendJson(res, 200, { message: 'Usuario cliente eliminado' });
  }
};

export const ProductController = {
  async getAll(req, res, searchParams, sendJson) {
    const category = searchParams.get('category') || '';
    const onlyLowStock = searchParams.get('onlyLowStock') === 'true';
    const usuario_id = req.user?.id || searchParams.get('usuario_id') || '';
    const products = ProductModel.getAll({ category, onlyLowStock, usuario_id });
    return sendJson(res, 200, products);
  },

  async getById(req, res, idParam, sendJson) {
    const id = Validators.validateId(idParam);
    const prod = ProductModel.getById(id);
    if (!prod) {
      return sendJson(res, 404, { message: 'Producto no encontrado' });
    }
    return sendJson(res, 200, prod);
  },

  async create(req, res, body, sendJson) {
    const validated = Validators.validateProduct(body);
    validated.usuario_id = req.user?.id || body.usuario_id || 1;
    const created = StoredProcedures.sp_crear_producto_seguro(validated);
    return sendJson(res, 201, created);
  },

  async update(req, res, idParam, body, sendJson) {
    const id = Validators.validateId(idParam);
    const existing = ProductModel.getById(id);
    if (!existing) {
      return sendJson(res, 404, { message: 'Producto no encontrado' });
    }

    const validated = Validators.validateProduct(body, true);
    // Verificar código duplicado en otro producto
    const codeCheck = ProductModel.getByCodigo(validated.codigo);
    if (codeCheck && codeCheck.id !== id) {
      return sendJson(res, 400, { message: `El código ${validated.codigo} ya está en uso por otro producto` });
    }

    const updated = ProductModel.update(id, validated);
    return sendJson(res, 200, updated);
  },

  async deactivate(req, res, idParam, sendJson) {
    const id = Validators.validateId(idParam);
    const existing = ProductModel.getById(id);
    if (!existing) {
      return sendJson(res, 404, { message: 'Producto no encontrado' });
    }
    const updated = ProductModel.deactivate(id);
    return sendJson(res, 200, updated);
  }
};

export const MovementController = {
  async getAll(req, res, searchParams, sendJson) {
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const pid = searchParams.get('pid') || '';
    const tipo = searchParams.get('tipo') || '';
    const usuario_id = req.user?.id || searchParams.get('usuario_id') || '';

    const movements = MovementModel.getAll({ fromDate, toDate, pid, tipo, usuario_id });
    return sendJson(res, 200, movements);
  },

  async create(req, res, body, sendJson) {
    const validated = Validators.validateMovement(body);
    validated.usuario_id = req.user?.id || body.usuario_id || 1;
    const result = StoredProcedures.sp_registrar_movimiento_inventario(validated);
    return sendJson(res, 201, result);
  }
};

export const CatalogController = {
  async getAll(req, res, catalogParam, sendJson) {
    const catalogName = Validators.validateCatalogName(catalogParam);
    const data = CatalogModel.getAll(catalogName);
    return sendJson(res, 200, data);
  },

  async addItem(req, res, catalogParam, body, sendJson) {
    const catalogName = Validators.validateCatalogName(catalogParam);
    const validatedItem = Validators.validateCatalogItem(catalogName, body);
    const updatedCatalog = CatalogModel.addItem(catalogName, validatedItem);
    return sendJson(res, 201, updatedCatalog);
  },

  async removeItem(req, res, catalogParam, indexOrId, sendJson) {
    const catalogName = Validators.validateCatalogName(catalogParam);
    const updatedCatalog = CatalogModel.removeItem(catalogName, indexOrId);
    return sendJson(res, 200, updatedCatalog);
  }
};

