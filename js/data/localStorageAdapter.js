import { CONFIG } from '../config.js';
import {
  INITIAL_CATEGORIES,
  INITIAL_UNITS,
  INITIAL_PROVIDERS,
  INITIAL_CLIENTS,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  generateInitialMovements
} from './initialData.js';

class LocalStorageAdapter {
  constructor() {
    this.keys = CONFIG.STORAGE_KEYS;
    this.ensureInitialized();
  }

  ensureInitialized() {
    if (!localStorage.getItem(this.keys.INITIALIZED)) {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    localStorage.setItem(this.keys.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(this.keys.UNITS, JSON.stringify(INITIAL_UNITS));
    localStorage.setItem(this.keys.PROVIDERS, JSON.stringify(INITIAL_PROVIDERS));
    localStorage.setItem(this.keys.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
    localStorage.setItem(this.keys.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(this.keys.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(this.keys.MOVEMENTS, JSON.stringify(generateInitialMovements()));
    localStorage.setItem(this.keys.INITIALIZED, 'true');
  }
  getSession() {
    const raw = localStorage.getItem(this.keys.SESSION);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setSession(user, token = null) {
    if (user) {
      localStorage.setItem(this.keys.SESSION, JSON.stringify(user));
      if (token) {
        localStorage.setItem(this.keys.TOKEN, token);
      } else if (!localStorage.getItem(this.keys.TOKEN)) {
        localStorage.setItem(this.keys.TOKEN, `token-jwt-${user.id || 1}-${Date.now()}`);
      }
    } else {
      localStorage.removeItem(this.keys.SESSION);
      localStorage.removeItem(this.keys.TOKEN);
    }
  }
  getProducts() {
    const raw = localStorage.getItem(this.keys.PRODUCTS);
    const list = raw ? JSON.parse(raw) : [];
    const session = this.getSession();
    if (!session || session.rol === 'SUPERADMIN' || session.id === 1) {
      return list;
    }
    // Filtrar por el usuario actual
    return list.filter(p => Number(p.usuario_id || 1) === Number(session.id));
  }

  saveProducts(products) {
    // Si estamos guardando la lista completa global
    localStorage.setItem(this.keys.PRODUCTS, JSON.stringify(products));
  }

  getProductById(id) {
    const raw = localStorage.getItem(this.keys.PRODUCTS);
    const products = raw ? JSON.parse(raw) : [];
    return products.find(p => String(p.id) === String(id)) || null;
  }

  saveProduct(productData) {
    const raw = localStorage.getItem(this.keys.PRODUCTS);
    const products = raw ? JSON.parse(raw) : [];
    const session = this.getSession();
    const userId = session?.id || 1;

    if (productData.id) {
      const idx = products.findIndex(p => String(p.id) === String(productData.id));
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...productData };
        this.saveProducts(products);
        return products[idx];
      }
    }
    const newProduct = {
      ...productData,
      usuario_id: userId,
      id: Date.now(),
      activo: true
    };
    products.push(newProduct);
    this.saveProducts(products);
    return newProduct;
  }

  deactivateProduct(id) {
    const products = this.getProducts();
    const product = products.find(p => String(p.id) === String(id));
    if (product) {
      product.activo = false;
      this.saveProducts(products);
      return true;
    }
    return false;
  }
  getMovements() {
    const raw = localStorage.getItem(this.keys.MOVEMENTS);
    const movs = raw ? JSON.parse(raw) : [];
    const session = this.getSession();
    const filtered = (!session || session.rol === 'SUPERADMIN' || session.id === 1)
      ? movs
      : movs.filter(m => Number(m.usuario_id || 1) === Number(session.id));
    return filtered.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  }

  saveMovements(movements) {
    localStorage.setItem(this.keys.MOVEMENTS, JSON.stringify(movements));
  }

  createMovement(movementData) {
    const raw = localStorage.getItem(this.keys.PRODUCTS);
    const allProducts = raw ? JSON.parse(raw) : [];
    const session = this.getSession();
    const userId = session?.id || 1;

    const product = allProducts.find(p => String(p.id) === String(movementData.pid));

    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const cant = Number(movementData.cant);
    if (cant <= 0) {
      throw new Error('La cantidad debe ser mayor a cero');
    }

    if (movementData.tipo === 'S' && cant > product.stock) {
      throw new Error(`Cantidad insuficiente: solo hay ${product.stock} ${product.unidad.toLowerCase()}`);
    }
    if (movementData.tipo === 'E') {
      product.stock += cant;
    } else {
      product.stock -= cant;
    }
    this.saveProducts(allProducts);

    const rawMovs = localStorage.getItem(this.keys.MOVEMENTS);
    const movements = rawMovs ? JSON.parse(rawMovs) : [];
    const newMov = {
      id: Date.now(),
      usuario_id: userId,
      fecha: movementData.fecha,
      pid: product.id,
      tipo: movementData.tipo,
      cant: cant,
      motivo: movementData.motivo || '',
      obs: movementData.obs || ''
    };
    movements.unshift(newMov);
    this.saveMovements(movements);

    return { movement: newMov, updatedProduct: product };
  }
  getCatalog(key) {
    const storageKey = this.keys[key.toUpperCase()] || key;
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  saveCatalog(key, items) {
    const storageKey = this.keys[key.toUpperCase()] || key;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  addCatalogItem(key, item) {
    const items = this.getCatalog(key);
    items.push(item);
    this.saveCatalog(key, items);
    return items;
  }

  removeCatalogItem(key, index) {
    const items = this.getCatalog(key);
    items.splice(index, 1);
    this.saveCatalog(key, items);
    return items;
  }
}

export const storageAdapter = new LocalStorageAdapter();


