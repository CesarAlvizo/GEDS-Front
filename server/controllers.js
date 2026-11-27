import { UserModel, ProductModel, MovementModel, CatalogModel, StoredProcedures } from './models.js';
import { Validators, ValidationError } from './validators.js';
import { createSession, expiredSessionCookie, readSessionCookie, revokeSession, sessionCookie } from './sessions.js';

export const AuthController = {
  async login(req, res, body, sendJson) {
    const validated = Validators.validateLogin(body);
    const user = UserModel.findByCredentials(validated.username, validated.password);

    if (!user) {
      return sendJson(res, 401, { message: 'Credenciales inválidas' });
    }

    const token = createSession(user.id);
    return sendJson(res, 200, {
      user: {
        id: user.id,
        rol: user.rol
      }
    }, { 'Set-Cookie': sessionCookie(token, Boolean(req.socket?.encrypted)) });
  },

  async logout(req, res, sendJson) {
    revokeSession(readSessionCookie(req));
    return sendJson(res, 200, { message: 'Sesión finalizada' }, {
      'Set-Cookie': expiredSessionCookie(Boolean(req.socket?.encrypted))
    });
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

