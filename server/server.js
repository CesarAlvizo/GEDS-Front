import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthController, ProductController, MovementController, CatalogController } from './controllers.js';
import { UserModel } from './models.js';
import { ValidationError } from './validators.js';
import { readSessionCookie, resolveSession } from './sessions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const MAX_LOGIN_CLIENTS = 5000;
const loginAttempts = new Map();

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

function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function clientAddress(req) {
  return String(req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

function isLoginRateLimited(req, res) {
  const now = Date.now();
  for (const [address, entry] of loginAttempts) {
    if (entry.resetAt <= now) loginAttempts.delete(address);
  }

  const address = clientAddress(req);
  let entry = loginAttempts.get(address);
  if (!entry) {
    if (loginAttempts.size >= MAX_LOGIN_CLIENTS) {
      loginAttempts.delete(loginAttempts.keys().next().value);
    }
    entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(address, entry);
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    sendJson(res, 429, { message: 'Demasiados intentos. Intenta de nuevo más tarde.' }, {
      'Retry-After': String(retryAfter)
    });
    return true;
  }

  entry.count += 1;
  return false;
}

function hasAllowedOrigin(req) {
  const originHeader = req.headers.origin;
  if (!originHeader) return true;

  try {
    const origin = new URL(originHeader);
    const protocol = req.socket?.encrypted ? 'https:' : 'http:';
    return origin.protocol === protocol && origin.host.toLowerCase() === String(req.headers.host || '').toLowerCase();
  } catch {
    return false;
  }
}

function checkAuth(req, res, pathname) {
  // Login y logout son públicos.
  const publicPaths = ['/api/auth/login', '/api/auth/logout'];
  if (publicPaths.includes(pathname)) return true;

  const token = readSessionCookie(req);
  const session = token ? resolveSession(token) : null;
  if (!session) {
    sendJson(res, 401, { message: 'Token de sesión inválido o expirado' });
    return false;
  }
  const user = UserModel.findById(session.userId);
  if (!user || Number(user.activo) !== 1) {
    sendJson(res, 401, { message: 'La sesión ya no está activa' });
    return false;
  }
  req.user = user;
  return true;
}

function serveStatic(req, res, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    res.end('Solicitud inválida');
    return;
  }

  const relativePath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = path.resolve(ROOT_DIR, `.${relativePath}`);
  const relativeToRoot = path.relative(ROOT_DIR, filePath);
  const pathParts = relativeToRoot.split(path.sep);
  const restrictedRoots = new Set(['server', '.git', 'node_modules', 'test']);
  const privateFile = pathParts.some(part => part.startsWith('.'))
    || pathParts.some(part => restrictedRoots.has(part.toLowerCase()))
    || relativeToRoot.toLowerCase() === path.join('js', 'data', 'publicdemostore.js').toLowerCase();
  if (!relativeToRoot || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot) || privateFile) {
    res.writeHead(404);
    res.end('Archivo no encontrado');
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
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Resource-Policy': 'same-origin'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

async function handleApi(req, res, parsedUrl) {
  const { pathname, searchParams } = parsedUrl;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !hasAllowedOrigin(req)) {
    sendJson(res, 403, { message: 'Origen de solicitud no permitido' });
    return;
  }

  // Autenticación
  if (pathname === '/api/auth/login' && method === 'POST') {
    if (isLoginRateLimited(req, res)) return;
    const address = clientAddress(req);
    res.once('finish', () => {
      if (res.statusCode === 200) loginAttempts.delete(address);
    });
    const body = await parseBody(req);
    return await AuthController.login(req, res, body, sendJson);
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    return await AuthController.logout(req, res, sendJson);
  }

  // Validar cookie de sesión.
  if (!checkAuth(req, res, pathname)) {
    return;
  }

  // Productos
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

  // Movimientos
  if (pathname === '/api/movimientos') {
    if (method === 'GET') {
      return await MovementController.getAll(req, res, searchParams, sendJson);
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      return await MovementController.create(req, res, body, sendJson);
    }
  }

  // Catálogos
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
        sendJson(res, 500, { message: 'Error interno del servidor' });
      }
    }
  } else {
    serveStatic(req, res, pathname);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(` GEDS · Sistema Web de Gestión y Control de Inventario`);
  console.log(` Servidor local activo en: http://${HOST}:${PORT}`);
  console.log(` API REST disponible en:  http://${HOST}:${PORT}/api`);
  console.log(` Base de datos SQLite protegida con consultas preparadas activa`);
  console.log(`====================================================`);
});
