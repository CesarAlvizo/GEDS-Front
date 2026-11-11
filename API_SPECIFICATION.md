# GEDS · Especificación Técnica de la API REST para el Backend

Este documento detalla el contrato de comunicación, modelos de datos, endpoints y reglas de negocio para el desarrollo o migración del backend del sistema **GEDS (Gestión y Control de Inventario)**.

---

## 1. Arquitectura General y Autenticación

- **Formato:** JSON (`application/json; charset=utf-8`).
- **Autenticación:** Tokens Bearer (JWT) enviados en la cabecera HTTP:
  ```http
  Authorization: Bearer <TOKEN_JWT>
  ```
- **Códigos de Estado HTTP Estándar:**
  - `200 OK`: Petición exitosa con datos de respuesta.
  - `201 Created`: Recurso creado exitosamente.
  - `204 No Content`: Eliminación exitosa sin cuerpo de retorno.
  - `400 Bad Request`: Error de validación en los datos enviados.
  - `401 Unauthorized`: Token faltante, inválido o credenciales erróneas.
  - `404 Not Found`: Recurso no encontrado.
  - `500 Internal Server Error`: Excepción no controlada en el servidor.

---

## 2. Esquema de Base de Datos Recomendado (SQL DDL)

```sql
-- 1. Usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) DEFAULT 'ADMIN',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Catálogos Base
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE unidades_medida (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    correo VARCHAR(100)
);

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    correo VARCHAR(100)
);

-- 3. Productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) NOT NULL,
    unidad VARCHAR(50) NOT NULL,
    costo NUMERIC(12, 2) DEFAULT 0.00,
    precio NUMERIC(12, 2) DEFAULT 0.00,
    stock NUMERIC(12, 2) DEFAULT 0,
    stock_minimo NUMERIC(12, 2) DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Movimientos de Almacén
CREATE TABLE movimientos (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo CHAR(1) NOT NULL CHECK (tipo IN ('E', 'S')), -- 'E' = Entrada, 'S' = Salida
    cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    motivo VARCHAR(100) NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Catálogo de Endpoints REST

### 3.1. Autenticación (`/api/auth`)

#### `POST /api/auth/login`
- **Descripción:** Valida credenciales y genera token de sesión.
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "admin"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "nombre": "Administrador General",
      "rol": "ADMIN",
      "avatar": "AD"
    }
  }
  ```
- **Response `401 Unauthorized`:**
  ```json
  {
    "message": "Usuario o contraseña incorrectos"
  }
  ```

#### `POST /api/auth/logout`
- **Descripción:** Invalida el token o registra el cierre de sesión.
- **Response `200 OK`:**
  ```json
  {
    "message": "Sesión finalizada"
  }
  ```

---

### 3.2. Productos (`/api/productos`)

#### `GET /api/productos`
- **Descripción:** Devuelve la lista de productos con soporte para filtrado.
- **Query Params opcionales:**
  - `query` (string): Búsqueda por código o nombre.
  - `category` (string): Filtro por categoría.
  - `onlyLowStock` (boolean): `true` para devolver solo productos donde `stock <= min`.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 1,
      "codigo": "PAP-001",
      "nombre": "Hojas blancas carta",
      "desc": "Paquete 500 hojas",
      "categoria": "Papelería",
      "unidad": "Paquete",
      "costo": 68.00,
      "precio": 95.00,
      "stock": 84,
      "min": 30,
      "activo": true
    }
  ]
  ```

#### `GET /api/productos/:id`
- **Descripción:** Devuelve el detalle de un producto por su identificador.
- **Response `200 OK`:** Objeto del producto.
- **Response `404 Not Found`:** `{"message": "Producto no encontrado"}`

#### `POST /api/productos`
- **Descripción:** Crea un nuevo producto.
- **Request Body:**
  ```json
  {
    "codigo": "PAP-020",
    "nombre": "Folder tamaño carta beige",
    "desc": "Caja con 100 piezas",
    "categoria": "Papelería",
    "unidad": "Caja",
    "costo": 120.00,
    "precio": 180.00,
    "stock": 15,
    "min": 5
  }
  ```
- **Response `201 Created`:** Objeto del producto creado con su `id`.

#### `PUT /api/productos/:id`
- **Descripción:** Actualiza los datos de un producto existente.
- **Request Body:** Datos del producto a modificar.
- **Response `200 OK`:** Producto actualizado.

#### `PUT /api/productos/:id/desactivar`
- **Descripción:** Desactiva un producto en lugar de borrarlo físicamente para preservar la integridad histórica de los movimientos.
- **Response `200 OK`:** Producto con `activo: false`.

---

### 3.3. Movimientos (`/api/movimientos`)

#### `GET /api/movimientos`
- **Descripción:** Consulta el historial de movimientos de inventario con filtros de fecha, producto, categoría y tipo.
- **Query Params opcionales:**
  - `fromDate` (YYYY-MM-DD)
  - `toDate` (YYYY-MM-DD)
  - `category` (string)
  - `pid` (id del producto)
  - `tipo` (`E` o `S`)
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 105,
      "fecha": "2026-10-31",
      "pid": 1,
      "tipo": "E",
      "cant": 40,
      "motivo": "Compra a proveedor",
      "obs": "Factura F-8910"
    }
  ]
  ```

#### `POST /api/movimientos`
- **Descripción:** Registra un nuevo movimiento y actualiza atómicamente el stock del producto en la base de datos (mediante transacción SQL).
- **Reglas de Negocio:**
  1. Si `tipo == 'E'`, `producto.stock = producto.stock + cantidad`.
  2. Si `tipo == 'S'`, verificar que `cantidad <= producto.stock`. De lo contrario responder `400 Bad Request` con mensaje `"Cantidad insuficiente"`. Luego, `producto.stock = producto.stock - cantidad`.
- **Request Body:**
  ```json
  {
    "pid": 1,
    "tipo": "E",
    "cant": 20,
    "fecha": "2026-10-31",
    "motivo": "Compra a proveedor",
    "obs": "Recepción almacén norte"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "movement": {
      "id": 106,
      "fecha": "2026-10-31",
      "pid": 1,
      "tipo": "E",
      "cant": 20,
      "motivo": "Compra a proveedor",
      "obs": "Recepción almacén norte"
    },
    "updatedProduct": {
      "id": 1,
      "stock": 104
    }
  }
  ```

---

### 3.4. Catálogos (`/api/catalogos/:name`)

Donde `:name` puede ser `providers`, `clients`, `categories` o `units`.

#### `GET /api/catalogos/:name`
- **Response `200 OK`:** Arreglo con los elementos del catálogo solicitado.

#### `POST /api/catalogos/:name`
- **Descripción:** Agrega un nuevo elemento al catálogo.
- **Request Body (Simple - categorías/unidades):**
  ```json
  "Seguridad Industrial"
  ```
- **Request Body (Compuesto - proveedores/clientes):**
  ```json
  {
    "n": "Ferretería Industrial S.A.",
    "t": "449 888 7766",
    "c": "ventas@ferreind.mx"
  }
  ```
- **Response `201 Created`:** Catálogo actualizado.

#### `DELETE /api/catalogos/:name/:id`
- **Descripción:** Elimina un elemento del catálogo por su ID o índice.
- **Response `200 OK` o `204 No Content`.**

---

## 4. Activación de la Conexión en el Frontend

Una vez desplegado tu backend, para que el frontend se comunique con él:
1. Abre el archivo `js/config.js`.
2. Modifica:
   ```javascript
   export const CONFIG = {
     // ...
     USE_MOCK: false, // <-- Cambiar a false
     API_BASE_URL: 'http://localhost:3000/api', // <-- URL de tu backend
     // ...
   };
   ```
3. ¡Listo! Todo el frontend realizará llamadas HTTP `fetch` reales al backend mediante `apiClient.js`.
