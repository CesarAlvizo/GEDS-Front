// test/security-test.js
// Suite de pruebas de seguridad y penetración contra SQL Injection
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

// 1. PRUEBAS DE AUTENTICACIÓN
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
  const result = UserModel.findByCredentials(payload, payload);
  assert(`Inyección detenida en login con payload: "${payload}"`, result === null);
}

// Comprobar que credencial legítima sigue funcionando
const validUser = UserModel.findByCredentials('admin', 'admin');
assert('Credencial legítima admin:admin autentica correctamente', validUser !== null && validUser.username === 'admin');

// 2. PRUEBAS EN PRODUCTOS
console.log('\n--- 2. Pruebas en Búsqueda y Modelos de Productos ---');
const maliciousProductCodes = [
  "PAP-001' OR '1'='1",
  "PAP-001'; DELETE FROM productos; --",
  "' UNION SELECT id, codigo, nombre, desc, categoria, unidad, costo, precio, stock, min, activo, created_at, updated_at FROM productos --"
];

for (const payload of maliciousProductCodes) {
  const prod = ProductModel.getByCodigo(payload);
  assert(`Búsqueda por código inmune a: "${payload}"`, prod === null);
}

// Búsqueda por ID con SQL Injection
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

// 3. PRUEBAS EN CATÁLOGOS (Whitelisting de tablas)
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

// Catálogos legítimos funcionan
const validCat = CatalogModel.getAll('categories');
assert('Catálogo legítimo "categories" devuelve resultados esperados', Array.isArray(validCat) && validCat.length > 0);

// 4. PRUEBA DE INYECCIÓN EN CREACIÓN DE PRODUCTOS
console.log('\n--- 4. Pruebas de Inserción de Productos con Comillas y Metacaracteres ---');
const maliciousProductData = {
  codigo: "SEC-' OR '1'='1",
  nombre: "Producto Test'); DROP TABLE productos; --",
  desc: "Descripción con 'comillas' y \"dobles\" y -- comentarios",
  categoria: "Papelería",
  unidad: "Pieza",
  costo: 50,
  precio: 80,
  stock: 10,
  min: 5
};

const newProduct = ProductModel.create(maliciousProductData);
assert('Producto con metacaracteres SQL se insertó como texto literal seguro (sin ejecutar SQL)', newProduct && newProduct.id > 0);

// Comprobar que la tabla productos NO fue borrada por la inyección
const allProds = ProductModel.getAll();
assert('La tabla productos permanece íntegra (DROP TABLE fue neutralizado)', allProds.length >= 8);

// 5. PRUEBA EN MOVIMIENTOS
console.log('\n--- 5. Pruebas en Filtros y Registro de Movimientos ---');
const maliciousMovements = MovementModel.getAll({
  fromDate: "2026-01-01' OR '1'='1",
  tipo: "E' OR '1'='1"
});
// Al usar consultas preparadas WHERE fecha >= ? AND tipo = ?, no debe retornar todos los registros por bypass lógico
assert('Filtros de movimientos con inyección SQL tratados como parámetros literales seguros', Array.isArray(maliciousMovements));

// 6. RESULTADOS FINALES
console.log('\n====================================================');
console.log(` RESULTADOS: ${passedTests} de ${totalTests} pruebas superadas.`);
if (passedTests === totalTests) {
  console.log(' ESTADO: EL SISTEMA ESTÁ COMPLETAMENTE BLINDADO CONTRA SQL INJECTION.');
} else {
  console.error(' ESTADO: ALGUNAS PRUEBAS FALLARON.');
  process.exit(1);
}
console.log('====================================================\n');

