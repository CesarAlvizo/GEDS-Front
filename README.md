# GEDS — Sistema de Gestión y Control de Inventario

Aplicación web para la administración de inventario de un almacén. GEDS reúne en una sola interfaz la consulta de existencias, el registro de operaciones y la gestión de la información asociada a productos, clientes y proveedores.

## Funcionalidades

- Inicio de sesión y control de acceso a las pantallas internas.
- Panel de resumen con indicadores del inventario.
- Consulta, búsqueda, alta y edición de productos.
- Registro e historial de entradas y salidas.
- Administración de categorías, unidades, clientes y proveedores.
- Reportes filtrables y exportación de movimientos a CSV.
- Interfaz adaptable, tema claro y oscuro, y navegación entre páginas.

## Tecnologías

- HTML5 con páginas independientes y navegación mediante enlaces.
- CSS3 y Bootstrap 5.3.3.
- JavaScript vanilla con módulos ES.
- Node.js para el servidor local de archivos y la API de desarrollo.
- SQLite en el servidor local; GitHub Pages ofrece una demostración aislada con datos ficticios guardados en el navegador.

## Requisitos

- Node.js 22 o posterior (el proyecto usa `node:sqlite`).

## Ejecución

```bash
npm start
```

La aplicación queda disponible en `http://localhost:3000`. Inicia sesión desde esa dirección para que el navegador use la API del mismo servidor. SQLite crea o migra `server/geds.sqlite` en la primera petición autenticada. Este modo local no carga el módulo de datos de demostración.

Al publicar en el dominio predeterminado `*.github.io`, la aplicación activa automáticamente un modo de portafolio: permite explorar y modificar datos inventados, guardados solo en el almacenamiento de ese navegador. No usa ni solicita acceso a SQLite, credenciales o registros locales. El inicio de sesión de demostración no es autenticación real.

## Inicialización local

La base local se provisiona con un usuario y un catálogo de farmacia almacenado fuera del código público, en `server/private/`. Esa carpeta y el archivo SQLite están excluidos de Git y el servidor no los publica como archivos estáticos.

Antes de inicializar una base nueva, configura `FARMA_USERNAME`, `FARMA_NAME` y `FARMA_INITIAL_PASSWORD` en el entorno de Node. Puedes partir de `.env.example`; `.env` está excluido de Git y bloqueado por el servidor estático. La contraseña se almacena en SQLite usando scrypt y nunca se devuelve por la API. Después de iniciar la base, elimina la variable de contraseña del entorno.

GitHub Pages solo publica frontend estático: no puede ejecutar este servidor ni acceder a SQLite. Para producción, despliega el backend y la base en un servidor privado y configura el frontend para esa API.

## Base SQLite de demostración

El repositorio incluye [`demo/geds-demo.sqlite`](demo/geds-demo.sqlite), una base descargable con un esquema compatible y registros inventados para revisar tablas, relaciones, productos y movimientos. No contiene información de FARMACIA TEC ni datos de clientes reales. La cuenta incluida es `demo_admin` y su contraseña de prueba es `DemoGeds2026!`; úsala únicamente con esta base de demostración.

Puedes abrir el archivo directamente con [DB Browser for SQLite](https://sqlitebrowser.org/) o consultar la base desde PowerShell con `node` y el módulo `node:sqlite`. Para regenerarla desde los datos de ejemplo versionados, ejecuta:

```bash
node scripts/create-demo-database.js
```

El servidor local sigue usando `server/geds.sqlite`; nunca lee ni modifica la base de demostración. GitHub Pages tampoco ejecuta SQLite: su modo de portafolio usa datos ficticios en el navegador.

## Estructura del proyecto

```text
├── assets/             Recursos estáticos, como el logotipo
├── css/                Estilos globales, componentes y vistas
├── js/
│   ├── components/     Componentes de interfaz reutilizables
│   ├── data/           Adaptador de sesión local
│   ├── pages/          Lógica de cada pantalla
│   ├── services/       Servicios de autenticación e inventario
│   └── utils/          Formateo, exportación y utilidades DOM
├── server/             Servidor local y API de desarrollo
├── index.html          Página de entrada y redirección al inicio de sesión
├── login.html          Inicio de sesión
├── dashboard.html      Resumen del inventario
├── productos.html      Catálogo de productos
├── producto-form.html  Alta y edición de productos
├── movimientos.html    Registro e historial de movimientos
├── reportes.html       Reportes de inventario
└── catalogos.html      Catálogos auxiliares
```

## Configuración de API

La configuración de la API está en `js/config.js` y usa `/api` en el mismo origen. Las sesiones viajan en una cookie `HttpOnly`; no se almacenan tokens Bearer en `localStorage`. La especificación está en [API_SPECIFICATION.md](API_SPECIFICATION.md).

## Créditos

Desarrollado para el Instituto Tecnológico de Aguascalientes.
