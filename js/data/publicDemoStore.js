// Datos ficticios exclusivos de GitHub Pages.
const STORAGE_PREFIX = 'geds_portfolio_demo_v2_';

const seedProducts = [
  { id: 1, codigo: 'DEMO-001', nombre: 'Paracetamol 500 mg', desc: 'Tabletas · presentación de ejemplo', categoria: 'Analgésicos', unidad: 'Caja', costo: 18.5, precio: 32, stock: 34, min: 12, activo: 1 },
  { id: 2, codigo: 'DEMO-002', nombre: 'Ibuprofeno 400 mg', desc: 'Tabletas · presentación de ejemplo', categoria: 'Analgésicos', unidad: 'Caja', costo: 22, precio: 39, stock: 8, min: 10, activo: 1 },
  { id: 3, codigo: 'DEMO-003', nombre: 'Suero oral 500 ml', desc: 'Sabor neutro · artículo ficticio', categoria: 'Gastrointestinal', unidad: 'Frasco', costo: 13, precio: 24, stock: 7, min: 8, activo: 1 },
  { id: 4, codigo: 'DEMO-004', nombre: 'Vitamina C 1 g', desc: 'Tabletas efervescentes · ejemplo', categoria: 'Vitaminas', unidad: 'Tubo', costo: 31, precio: 52, stock: 5, min: 6, activo: 1 },
  { id: 5, codigo: 'DEMO-005', nombre: 'Loratadina 10 mg', desc: 'Tabletas · presentación de ejemplo', categoria: 'Alergia', unidad: 'Caja', costo: 19, precio: 35, stock: 7, min: 8, activo: 1 },
  { id: 6, codigo: 'DEMO-006', nombre: 'Gasas estériles', desc: 'Paquete de muestra ficticio', categoria: 'Curación', unidad: 'Paquete', costo: 16, precio: 29, stock: 5, min: 7, activo: 1 },
  { id: 7, codigo: 'DEMO-007', nombre: 'Alcohol antiséptico 250 ml', desc: 'Artículo ficticio para demostración', categoria: 'Curación', unidad: 'Frasco', costo: 14, precio: 25, stock: 5, min: 6, activo: 1 },
  { id: 8, codigo: 'DEMO-008', nombre: 'Jabón neutro', desc: 'Cuidado personal · ejemplo', categoria: 'Higiene', unidad: 'Pieza', costo: 12, precio: 22, stock: 8, min: 10, activo: 1 },
  { id: 9, codigo: 'DEMO-009', nombre: 'Termómetro digital', desc: 'Equipo de muestra no comercial', categoria: 'Dispositivos', unidad: 'Pieza', costo: 65, precio: 99, stock: 2, min: 3, activo: 1 },
  { id: 10, codigo: 'DEMO-010', nombre: 'Crema humectante 100 ml', desc: 'Cuidado personal · ejemplo', categoria: 'Higiene', unidad: 'Tubo', costo: 28, precio: 46, stock: 0, min: 5, activo: 0 }
].map(product => ({ ...product, usuario_id: 1, created_at: '2026-01-01 09:00:00', updated_at: '2026-01-01 09:00:00' }));

const seedCatalogs = {
  categories: ['Analgésicos', 'Gastrointestinal', 'Vitaminas', 'Alergia', 'Curación', 'Higiene', 'Dispositivos'],
  units: ['Caja', 'Frasco', 'Tubo', 'Paquete', 'Pieza'],
  providers: [
    { id: 1, n: 'Distribuidora de Ejemplo', t: '000 000 0000', c: 'contacto@ejemplo.invalid' },
    { id: 2, n: 'Suministros Demo', t: '000 000 0000', c: 'ventas@demo.invalid' }
  ],
  clients: [
    { id: 1, n: 'Cliente de muestra A', t: '000 000 0000', c: 'cliente-a@ejemplo.invalid' },
    { id: 2, n: 'Cliente de muestra B', t: '000 000 0000', c: 'cliente-b@ejemplo.invalid' }
  ]
};

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function seedMovements() {
  let id = 1;
  const rows = [];
  const products = seedProducts.filter(product => product.activo);
  const recentEntryPattern = [1, 4, 2, 5, 1, 3, 3];
  const recentExitPattern = [3, 1, 4, 1, 4, 2, 4];
  const buildPattern = (counts, startIndex = 0) => counts.flatMap((count, daysAgo) =>
    Array.from({ length: count }, (_, order) => {
      const index = startIndex + order + counts.slice(0, daysAgo).reduce((sum, value) => sum + value, 0);
      return { pid: products[index % products.length].id, daysAgo, quantity: 1 + (index % 2) };
    })
  );
  const entries = buildPattern(recentEntryPattern);
  const exits = buildPattern(recentExitPattern);
  for (let index = 0; index < 11; index++) {
    entries.push({ pid: products[(19 + index) % products.length].id, daysAgo: 7 + ((index * 7) % 19), quantity: 1 + (index % 2) });
  }
  for (let index = 0; index < 26; index++) {
    exits.push({ pid: products[(19 + index) % products.length].id, daysAgo: 7 + ((index * 7) % 19), quantity: 1 + (index % 2) });
  }

  for (const product of products) {
    const incoming = entries.filter(move => move.pid === product.id).reduce((sum, move) => sum + move.quantity, 0);
    const outgoing = exits.filter(move => move.pid === product.id).reduce((sum, move) => sum + move.quantity, 0);
    const opening = Number(product.stock) - incoming + outgoing;
    if (opening > 0) rows.push({ id: id++, usuario_id: 1, fecha: dateDaysAgo(45 + product.id), pid: product.id, tipo: 'E', cant: opening, motivo: 'Inventario inicial de demostración', obs: 'Dato ficticio de portafolio' });
  }
  entries.forEach(move => rows.push({ id: id++, usuario_id: 1, fecha: dateDaysAgo(move.daysAgo), pid: move.pid, tipo: 'E', cant: move.quantity, motivo: 'Recepción de proveedor de muestra', obs: 'Dato ficticio de portafolio' }));
  exits.forEach(move => rows.push({ id: id++, usuario_id: 1, fecha: dateDaysAgo(move.daysAgo), pid: move.pid, tipo: 'S', cant: move.quantity, motivo: 'Venta de muestra', obs: 'Dato ficticio de portafolio' }));
  return rows.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
}

class PublicDemoStore {
  constructor() {
    this.ensureSeeded();
  }

  read(key, fallback) {
    try {
      const value = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return value ? JSON.parse(value) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  }

  write(key, value) {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  }

  ensureSeeded() {
    if (!localStorage.getItem(`${STORAGE_PREFIX}products`)) this.write('products', seedProducts);
    if (!localStorage.getItem(`${STORAGE_PREFIX}movements`)) this.write('movements', seedMovements());
    for (const [name, items] of Object.entries(seedCatalogs)) {
      if (!localStorage.getItem(`${STORAGE_PREFIX}${name}`)) this.write(name, items);
    }
  }

  getProducts() { return this.read('products', seedProducts); }
  getProductById(id) { return this.getProducts().find(item => String(item.id) === String(id)) || null; }

  saveProduct(data) {
    const products = this.getProducts();
    if (data.id) {
      const index = products.findIndex(item => String(item.id) === String(data.id));
      if (index < 0) throw new Error('Producto no encontrado');
      products[index] = { ...products[index], ...data, id: Number(data.id) };
      this.write('products', products);
      return products[index];
    }
    const product = { ...data, id: Math.max(0, ...products.map(item => Number(item.id))) + 1, usuario_id: 1, activo: 1 };
    products.push(product);
    this.write('products', products);
    return product;
  }

  deactivateProduct(id) {
    const products = this.getProducts();
    const product = products.find(item => String(item.id) === String(id));
    if (!product) return false;
    product.activo = 0;
    this.write('products', products);
    return true;
  }

  getMovements() { return this.read('movements', seedMovements()); }

  createMovement(data) {
    const product = this.getProductById(data.pid);
    const amount = Number(data.cant);
    if (!product) throw new Error('Producto no encontrado');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('La cantidad debe ser mayor a cero');
    if (data.tipo === 'S' && amount > Number(product.stock)) throw new Error(`Cantidad insuficiente: solo hay ${product.stock} ${product.unidad.toLowerCase()}`);
    product.stock = Number(product.stock) + (data.tipo === 'E' ? amount : -amount);
    this.write('products', this.getProducts().map(item => item.id === product.id ? product : item));
    const movements = this.getMovements();
    const movement = { ...data, id: Math.max(0, ...movements.map(item => Number(item.id))) + 1, usuario_id: 1, pid: Number(data.pid), cant: amount };
    movements.unshift(movement);
    this.write('movements', movements);
    return { movement, updatedProduct: product };
  }

  getCatalog(name) {
    const key = String(name).toLowerCase();
    if (!Object.hasOwn(seedCatalogs, key)) throw new Error('Catálogo desconocido');
    return this.read(key, seedCatalogs[key]);
  }

  addItem(name, item) {
    const list = this.getCatalog(name);
    if (Array.isArray(list) && typeof item === 'string') list.push(item);
    else list.push({ ...item, id: Math.max(0, ...list.map(entry => Number(entry.id) || 0)) + 1 });
    this.write(String(name).toLowerCase(), list);
    return list;
  }

  removeItem(name, indexOrId) {
    const key = String(name).toLowerCase();
    const list = this.getCatalog(key);
    const index = Number.isInteger(Number(indexOrId)) && Number(indexOrId) >= 0 && Number(indexOrId) < list.length
      ? Number(indexOrId)
      : list.findIndex(item => String(item?.id) === String(indexOrId));
    if (index >= 0) list.splice(index, 1);
    this.write(key, list);
    return list;
  }
}

export const demoStore = new PublicDemoStore();
