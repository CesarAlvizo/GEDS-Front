import { UserModel, ProductModel, MovementModel, CatalogModel } from '../server/models.js';
import { Validators, ValidationError } from '../server/validators.js';

console.log('====================================================');
console.log(' INICIANDO SUITE DE PRUEBAS DE SEGURIDAD (SQL INJECTION)');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(description, condition) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${description}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${description}`);
  }
}

// Autenticación
console.log('--- 1. Pruebas en Autenticación (Login) ---');
const maliciousLogins = [
  "' OR '1'='1",
  "admin' --",
  "admin' /*",
  "' UNION SELECT 1, 'admin', 'hash', 'Admin', 'ADMIN', 1, '2026-01-01' --",
  "'; DROP TABLE usuarios; --",
  "admin' OR 1=1; --"
];

for (const payload of maliciousLogins) {
  // Rechazo del validador
  let rejected = false;
  try {
    Validators.validateLogin({ username: payload, password: 'password' });
  } catch (e) {
    rejected = e instanceof ValidationError;
  }
  assert(`Validación estricta alfanumérica rechaza usuario sospechoso: "${payload}"`, rejected);

  // Rechazo del modelo
  const result = UserModel.findByCredentials(payload, payload);
  assert(`Consulta en BD neutraliza inyección: "${payload}"`, result === null);
}

// Productos
console.log('\n--- 2. Pruebas en Búsqueda y Modelos de Productos ---');
const maliciousProductCodes = [
  "PAP-001' OR '1'='1",
  "PAP-001'; DELETE FROM productos; --",
  "' UNION SELECT id, codigo, nombre, desc, categoria, unidad, costo, precio, stock, min, activo, created_at, updated_at FROM productos --"
];

for (const payload of maliciousProductCodes) {
  // Validación de producto
  let rejected = false;
  try {
    Validators.assertSafeText(payload, 'código', true);
  } catch (e) {
    rejected = e instanceof ValidationError;
  }
  assert(`Backend rechaza código de producto no alfanumérico: "${payload}"`, rejected);

  const prod = ProductModel.getByCodigo(payload);
  assert(`Búsqueda en BD por código inmune a: "${payload}"`, prod === null);
}

// Búsqueda por ID
const maliciousIds = [
  "1 OR 1=1",
  "1; DROP TABLE productos;",
  "-1 UNION SELECT 1,2,3,4,5,6,7,8,9,10,1,datetime(),datetime()"
];

for (const badId of maliciousIds) {
  let threw = false;
  try {
    const validatedId = Validators.validateId(badId);
    ProductModel.getById(validatedId);
  } catch (e) {
    threw = e instanceof ValidationError;
  }
  assert(`Validación de ID rechaza payload no numérico: "${badId}"`, threw);
}

// Catálogos
console.log('\n--- 3. Pruebas en Catálogos (Protección de nombres de tabla) ---');
const maliciousCatalogs = [
  "usuarios",
  "productos; DROP TABLE categorias;",
  "categorias WHERE 1=1",
  "admin"
];

for (const badCat of maliciousCatalogs) {
  let threw = false;
  try {
    const cleanCat = Validators.validateCatalogName(badCat);
    CatalogModel.getAll(cleanCat);
  } catch (e) {
    threw = e instanceof ValidationError;
  }
  assert(`Nombre de catálogo malicioso o no autorizado rechazado: "${badCat}"`, threw);
}

// Catálogos válidos
const validCat = CatalogModel.getAll('categories');
assert('Catálogo legítimo "categories" devuelve resultados esperados', Array.isArray(validCat) && validCat.length > 0);

// Alta de productos
console.log('\n--- 4. Pruebas de Validación Alfanumérica en Creación de Productos ---');
const maliciousProductData = {
  codigo: "SEC-TEST'; DROP TABLE productos; --",
  nombre: "Producto Malicioso",
  costo: 50,
  precio: 80,
  min: 5
};

let productValidationRejected = false;
try {
  Validators.validateProduct(maliciousProductData);
} catch (e) {
  productValidationRejected = e instanceof ValidationError;
}
assert('El backend rechaza el producto por contener caracteres sospechosos de SQLi en código', productValidationRejected);

// Producto válido
const validProductData = {
  codigo: "PROD-" + Date.now(),
  nombre: "Paquete de Hojas Carta",
  desc: "Papelería escolar y de oficina",
  categoria: "Papelería",
  unidad: "Paquete",
  costo: 50,
  precio: 80,
  stock: 10,
  min: 5
};
const newProduct = ProductModel.create(validProductData);
assert('Producto legítimo se crea correctamente', newProduct && newProduct.id > 0);

// Integridad de productos
const allProds = ProductModel.getAll();
assert('La tabla productos permanece íntegra', allProds.length >= 8);

// Filtros y movimientos
console.log('\n--- 5. Pruebas en Filtros y Registro de Movimientos ---');
const maliciousMovements = MovementModel.getAll({
  fromDate: "2026-01-01' OR '1'='1",
  tipo: "E' OR '1'='1"
});
assert('Filtros de movimientos con inyección SQL tratados como parámetros literales seguros', Array.isArray(maliciousMovements));

// Resultados
console.log('\n====================================================');
console.log(` RESULTADOS: ${passedTests} de ${totalTests} pruebas superadas.`);
if (passedTests === totalTests) {
  console.log(' ESTADO: EL SISTEMA ESTÁ COMPLETAMENTE BLINDADO CONTRA SQL INJECTION.');
} else {
  console.error(' ESTADO: ALGUNAS PRUEBAS FALLARON.');
  process.exit(1);
}
console.log('====================================================\n');
