

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;
const DB = {
  categories: ['Papelería', 'Limpieza', 'Herramientas', 'Alimentos', 'Electrónica'],
  units: ['Pieza', 'Caja', 'Paquete', 'Kilogramo', 'Gramo', 'Litro', 'Metro'],
  providers: [
    { n: 'Distribuidora del Centro', t: '449 123 4567', c: 'ventas@dcentro.mx' },
    { n: 'Insumos Bajío', t: '449 765 4321', c: 'contacto@insumosbajio.mx' },
    { n: 'Ferretera Aguascalientes', t: '449 555 0182', c: 'pedidos@ferreags.mx' }
  ],
  clients: [
    { n: 'Mostrador general', t: '—', c: '—' },
    { n: 'Comercial Rivera', t: '449 222 3344', c: 'compras@rivera.mx' }
  ],
  products: [
    { id: 1, codigo: 'PAP-001', nombre: 'Hojas blancas carta', desc: 'Paquete 500 hojas', categoria: 'Papelería', unidad: 'Paquete', costo: 68, precio: 95, stock: 84, min: 30, activo: true },
    { id: 2, codigo: 'LIM-014', nombre: 'Cloro 1 L', desc: 'Blanqueador líquido', categoria: 'Limpieza', unidad: 'Litro', costo: 14, precio: 22, stock: 12, min: 25, activo: true },
    { id: 3, codigo: 'HER-032', nombre: 'Martillo de uña', desc: 'Mango de fibra', categoria: 'Herramientas', unidad: 'Pieza', costo: 120, precio: 180, stock: 18, min: 10, activo: true },
    { id: 4, codigo: 'ALI-007', nombre: 'Arroz blanco', desc: 'Grano largo', categoria: 'Alimentos', unidad: 'Kilogramo', costo: 19, precio: 28, stock: 240, min: 80, activo: true },
    { id: 5, codigo: 'ELE-021', nombre: 'Cable USB-C 1 m', desc: 'Carga rápida', categoria: 'Electrónica', unidad: 'Pieza', costo: 45, precio: 89, stock: 9, min: 15, activo: true },
    { id: 6, codigo: 'PAP-009', nombre: 'Marcadores permanentes', desc: 'Caja con 12', categoria: 'Papelería', unidad: 'Caja', costo: 90, precio: 140, stock: 26, min: 12, activo: true },
    { id: 7, codigo: 'LIM-020', nombre: 'Jabón líquido 5 L', desc: 'Manos, uso general', categoria: 'Limpieza', unidad: 'Litro', costo: 75, precio: 120, stock: 40, min: 20, activo: true },
    { id: 8, codigo: 'HER-045', nombre: 'Cinta métrica', desc: '5 metros', categoria: 'Herramientas', unidad: 'Pieza', costo: 35, precio: 60, stock: 5, min: 8, activo: true }
  ],
  movements: [
    { id: 1, fecha: '2026-10-31', pid: 1, tipo: 'E', cant: 40, motivo: 'Compra a proveedor', obs: '' },
    { id: 2, fecha: '2026-10-31', pid: 2, tipo: 'S', cant: 8, motivo: 'Venta', obs: '' },
    { id: 3, fecha: '2026-10-30', pid: 4, tipo: 'E', cant: 100, motivo: 'Compra a proveedor', obs: '' },
    { id: 4, fecha: '2026-10-30', pid: 5, tipo: 'S', cant: 6, motivo: 'Venta', obs: '' },
    { id: 5, fecha: '2026-10-29', pid: 3, tipo: 'S', cant: 2, motivo: 'Venta', obs: '' },
    { id: 6, fecha: '2026-10-28', pid: 6, tipo: 'E', cant: 12, motivo: 'Compra a proveedor', obs: '' },
    { id: 7, fecha: '2026-10-28', pid: 8, tipo: 'S', cant: 3, motivo: 'Ajuste autorizado', obs: '' },
    { id: 8, fecha: '2026-10-27', pid: 7, tipo: 'E', cant: 20, motivo: 'Compra a proveedor', obs: '' },
    { id: 9, fecha: '2026-10-27', pid: 1, tipo: 'S', cant: 16, motivo: 'Venta', obs: '' },
    { id: 10, fecha: '2026-10-26', pid: 2, tipo: 'E', cant: 10, motivo: 'Compra a proveedor', obs: '' },
    { id: 11, fecha: '2026-10-26', pid: 5, tipo: 'S', cant: 4, motivo: 'Venta', obs: '' },
    { id: 12, fecha: '2026-10-25', pid: 4, tipo: 'S', cant: 30, motivo: 'Venta', obs: '' }
  ]
};
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}
function serveStatic(req, res, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(ROOT_DIR, relativePath));
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Acceso denegado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}
async function handleApi(req, res, parsedUrl) {
  const { pathname, searchParams } = parsedUrl;
  const method = req.method;
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    if (body.username === 'admin' && body.password === 'admin') {
      return sendJson(res, 200, {
        token: 'token-jwt-simulado-geds-' + Date.now(),
        user: { id: 1, username: 'admin', nombre: 'Administrador General', rol: 'ADMIN' }
      });
    }
    return sendJson(res, 401, { message: 'Credenciales inválidas' });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    return sendJson(res, 200, { message: 'Sesión finalizada' });
  }
  if (pathname === '/api/productos') {
    if (method === 'GET') {
      return sendJson(res, 200, DB.products);
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      const newProd = {
        ...body,
        id: Date.now(),
        activo: true
      };
      DB.products.push(newProd);
      return sendJson(res, 201, newProd);
    }
  }
  const prodMatch = pathname.match(/^\/api\/productos\/(\d+)(\/desactivar)?$/);
  if (prodMatch) {
    const id = Number(prodMatch[1]);
    const isDeactivate = Boolean(prodMatch[2]);
    const index = DB.products.findIndex(p => p.id === id);

    if (index === -1) {
      return sendJson(res, 404, { message: 'Producto no encontrado' });
    }

    if (isDeactivate && (method === 'PUT' || method === 'POST')) {
      DB.products[index].activo = false;
      return sendJson(res, 200, DB.products[index]);
    }

    if (method === 'GET') {
      return sendJson(res, 200, DB.products[index]);
    }

    if (method === 'PUT') {
      const body = await parseBody(req);
      DB.products[index] = { ...DB.products[index], ...body, id };
      return sendJson(res, 200, DB.products[index]);
    }
  }
  if (pathname === '/api/movimientos') {
    if (method === 'GET') {
      return sendJson(res, 200, DB.movements);
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      const prod = DB.products.find(p => p.id === Number(body.pid));
      if (!prod) return sendJson(res, 400, { message: 'Producto no encontrado' });

      const cant = Number(body.cant);
      if (cant <= 0) return sendJson(res, 400, { message: 'La cantidad debe ser mayor a 0' });
      if (body.tipo === 'S' && cant > prod.stock) {
        return sendJson(res, 400, { message: `Stock insuficiente. Disponible: ${prod.stock}` });
      }
      prod.stock += (body.tipo === 'E' ? cant : -cant);

      const newMov = {
        id: Date.now(),
        fecha: body.fecha || new Date().toISOString().slice(0, 10),
        pid: prod.id,
        tipo: body.tipo,
        cant,
        motivo: body.motivo || '',
        obs: body.obs || ''
      };
      DB.movements.unshift(newMov);
      return sendJson(res, 201, { movement: newMov, product: prod });
    }
  }
  const catMatch = pathname.match(/^\/api\/catalogos\/([a-zA-Z]+)(\/(\d+))?$/);
  if (catMatch) {
    const catalogName = catMatch[1];
    const itemIndex = catMatch[3] !== undefined ? Number(catMatch[3]) : null;

    if (!DB[catalogName]) {
      return sendJson(res, 404, { message: 'Catálogo no encontrado' });
    }

    if (method === 'GET') {
      return sendJson(res, 200, DB[catalogName]);
    }

    if (method === 'POST') {
      const body = await parseBody(req);
      DB[catalogName].push(body);
      return sendJson(res, 201, DB[catalogName]);
    }

    if (method === 'DELETE' && itemIndex !== null) {
      DB[catalogName].splice(itemIndex, 1);
      return sendJson(res, 200, DB[catalogName]);
    }
  }

  return sendJson(res, 404, { message: 'Ruta API no encontrada' });
}
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, parsedUrl);
    } catch (err) {
      sendJson(res, 500, { message: 'Error interno del servidor', error: err.message });
    }
  } else {
    serveStatic(req, res, pathname);
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` GEDS · Sistema Web de Gestión y Control de Inventario`);
  console.log(` Servidor local activo en: http://localhost:${PORT}`);
  console.log(` API REST disponible en:  http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});


