# GEDS · Sistema Web de Gestión y Control de Inventario

Sitio web construido con páginas HTML independientes, CSS, Bootstrap 5 y JavaScript vanilla. Cada pantalla es un documento normal y la navegación utiliza enlaces `href`; JavaScript se encarga de la autenticación, formularios y datos.

## Inicio

El servidor local incluye los archivos estáticos y la API de desarrollo:

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000). También puedes servir la carpeta con Live Server o `python -m http.server`; para las funciones de API en desarrollo, usa el servidor Node incluido.

Las páginas internas verifican la sesión desde el `<head>` antes de mostrar su contenido. Si abres directamente un dashboard con Live Server sin iniciar sesión, te redirige a `login.html`.

La aplicación usa datos de demostración y almacenamiento local del navegador por defecto (`USE_MOCK: true`). Para las funciones de API en desarrollo, utiliza el servidor Node incluido.

## Acceso de demostración

- Usuario: `admin`
- Contraseña: `admin`

## Páginas

- `index.html`: entrada del sitio; redirige al inicio de sesión.
- `login.html`: acceso.
- `dashboard.html`: resumen de inventario.
- `productos.html`: búsqueda y administración del catálogo.
- `producto-form.html`: alta y edición de productos (`?id=...`).
- `movimientos.html`: registro e historial de entradas y salidas.
- `reportes.html`: filtros y exportación CSV.
- `catalogos.html`: administración de proveedores, clientes, categorías y unidades.

## Estructura

```text
├── *.html                 # Documentos HTML completos por pantalla
├── css/                   # Estilos y tema
├── js/pages/              # Controladores vanilla por página
├── js/components/         # Notificaciones, diálogos e iconos
├── js/services/           # Acceso a datos y servicios
├── js/data/               # Datos de demostración y almacenamiento local
├── assets/                # Recursos estáticos
└── server/server.js       # Servidor estático y API local
```
