import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthController, ProductController, MovementController, CatalogController, UserController } from './controllers.js';
import { ValidationError } from './validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;

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
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // Protección contra payloads gigantes
        req.destroy();
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new ValidationError('Formato JSON inválido en la solicitud'));
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.end(JSON.stringify(data));
}

// Middleware de verificación de seguridad para endpoints privados
function checkAuth(req, res, pathname) {
  // Rutas públicas que no requieren token
  const publicPaths = ['/api/auth/login', '/api/auth/logout'];
  if (publicPaths.includes(pathname)) return true;

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJson(res, 401, { message: 'Acceso no autorizado: Token Bearer faltante o inválido' });
    return false;
  }

  const token = authHeader.slice(7).trim();
  if (!token || token.length < 5) {
    sendJson(res, 401, { message: 'Token de sesión inválido o expirado' });
    return false;
  }

  // Extraer ID de usuario si el token tiene formato: token-jwt-<id>-<timestamp>
  const tokenMatch = token.match(/^token-jwt-(\d+)-/);
  if (tokenMatch) {
    req.user = { id: Number(tokenMatch[1]) };
  } else {
    req.user = { id: 1 };
  }

  return true;
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

  // Rutas de Autenticación
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    return await AuthController.login(req, res, body, sendJson);
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    return await AuthController.logout(req, res, sendJson);
  }

  // Verificar autenticación mediante Token Bearer en todas las operaciones privadas
  if (!checkAuth(req, res, pathname)) {
    return;
  }

  // Rutas de Productos
  if (pathname === '/api/productos') {
    if (method === 'GET') {
      return await ProductController.getAll(req, res, searchParams, sendJson);
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      return await ProductController.create(req, res, body, sendJson);
    }
  }

  const prodMatch = pathname.match(/^\/api\/productos\/([a-zA-Z0-9_\-]+)(\/desactivar)?$/);
  if (prodMatch) {
    const idParam = prodMatch[1];
    const isDeactivate = Boolean(prodMatch[2]);

    if (isDeactivate && (method === 'PUT' || method === 'POST')) {
      return await ProductController.deactivate(req, res, idParam, sendJson);
    }

    if (method === 'GET') {
      return await ProductController.getById(req, res, idParam, sendJson);
    }

    if (method === 'PUT') {
      const body = await parseBody(req);
      return await ProductController.update(req, res, idParam, body, sendJson);
    }
  }

  // Rutas de Movimientos
  if (pathname === '/api/movimientos') {
    if (method === 'GET') {
      return await MovementController.getAll(req, res, searchParams, sendJson);
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      return await MovementController.create(req, res, body, sendJson);
    }
  }

  // Rutas de Catálogos
  const catMatch = pathname.match(/^\/api\/catalogos\/([a-zA-Z0-9_\-]+)(\/([a-zA-Z0-9_\-]+))?$/);
  if (catMatch) {
    const catalogName = catMatch[1];
    const itemIndex = catMatch[3] !== undefined ? catMatch[3] : null;

    if (method === 'GET') {
      return await CatalogController.getAll(req, res, catalogName, sendJson);
    }

    if (method === 'POST') {
      const body = await parseBody(req);
      return await CatalogController.addItem(req, res, catalogName, body, sendJson);
    }

    if (method === 'DELETE' && itemIndex !== null) {
      return await CatalogController.removeItem(req, res, catalogName, itemIndex, sendJson);
    }
  }

  // Rutas de Usuarios / Clientes Administradores
  if (pathname === '/api/usuarios') {
    if (method === 'GET') {
      return await UserController.getAll(req, res, sendJson);
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      return await UserController.create(req, res, body, sendJson);
    }
  }

  const userMatch = pathname.match(/^\/api\/usuarios\/(\d+)$/);
  if (userMatch && method === 'DELETE') {
    const id = userMatch[1];
    return await UserController.delete(req, res, id, sendJson);
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
      if (err instanceof ValidationError) {
        sendJson(res, err.statusCode || 400, { message: err.message, errors: err.errors });
      } else {
        console.error('Error no controlado en la API:', err);
        sendJson(res, 500, { message: 'Error interno del servidor', error: err.message });
      }
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
  console.log(` Base de datos SQLite protegida con consultas preparadas activa`);
  console.log(`====================================================`);
});
