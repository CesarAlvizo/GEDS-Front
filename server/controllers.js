// server/controllers.js - Controladores que orquestan modelos y validaciones
import { UserModel, ProductModel, MovementModel, CatalogModel } from './models.js';
import { Validators, ValidationError } from './validators.js';

export const AuthController = {
  async login(req, res, body, sendJson) {
    const validated = Validators.validateLogin(body);
    const user = UserModel.findByCredentials(validated.username, validated.password);

    if (!user) {
      return sendJson(res, 401, { message: 'Credenciales inválidas' });
    }

    const token = 'token-jwt-simulado-geds-' + Date.now();
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

export const ProductController = {
  async getAll(req, res, searchParams, sendJson) {
    const category = searchParams.get('category') || '';
    const onlyLowStock = searchParams.get('onlyLowStock') === 'true';
    const products = ProductModel.getAll({ category, onlyLowStock });
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

    const existing = ProductModel.getByCodigo(validated.codigo);
    if (existing) {
      return sendJson(res, 400, { message: `El código ${validated.codigo} ya está registrado` });
    }

    const created = ProductModel.create(validated);
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

    const movements = MovementModel.getAll({ fromDate, toDate, pid, tipo });
    return sendJson(res, 200, movements);
  },

  async create(req, res, body, sendJson) {
    const validated = Validators.validateMovement(body);
    const prod = ProductModel.getById(validated.pid);
    if (!prod) {
      return sendJson(res, 400, { message: 'Producto no encontrado' });
    }

    if (validated.tipo === 'S' && validated.cant > prod.stock) {
      return sendJson(res, 400, {
        message: `Stock insuficiente. Disponible: ${prod.stock} ${prod.unidad.toLowerCase()}`
      });
    }

    const newStock = validated.tipo === 'E'
      ? prod.stock + validated.cant
      : prod.stock - validated.cant;

    ProductModel.updateStock(prod.id, newStock);
    const movement = MovementModel.create(validated);
    const updatedProd = ProductModel.getById(prod.id);

    return sendJson(res, 201, { movement, product: updatedProd });
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
    const updatedCatalog = CatalogModel.addItem(catalogName, body);
    return sendJson(res, 201, updatedCatalog);
  },

  async removeItem(req, res, catalogParam, indexOrId, sendJson) {
    const catalogName = Validators.validateCatalogName(catalogParam);
    const updatedCatalog = CatalogModel.removeItem(catalogName, indexOrId);
    return sendJson(res, 200, updatedCatalog);
  }
};

