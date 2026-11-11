# GEDS · Sistema Web de Gestión y Control de Inventario

Sitio web construido con páginas HTML independientes, CSS, Bootstrap 5 y JavaScript vanilla. Cada pantalla es un documento normal y la navegación utiliza enlaces `href`; JavaScript se encarga de la autenticación, formularios y datos.

## Inicio

El servidor local incluye los archivos estáticos y la API de desarrollo:

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000). También puedes servir la carpeta con Live Server o `python -m http.server`; para las funciones de API en desarrollo, usa el servidor Node incluido.

Las páginas internas verifican la sesión desde el `<head>` antes de mostrar su contenido. Si abres directamente un dashboard con Live Server sin iniciar sesión, te redirige a `login.html`.

## Publicar en GitHub Pages

La aplicación funciona como sitio estático en modo demostración (`USE_MOCK: true`). No requiere instalar dependencias ni ejecutar un proceso de compilación. Los datos de demostración y la sesión se guardan en el navegador, por lo que no se comparten entre dispositivos.

1. Crea un repositorio vacío en GitHub. No agregues README, licencia ni `.gitignore` desde GitHub, porque estos archivos ya existen aquí.
2. En una terminal, desde la carpeta del proyecto, ejecuta:

   ```bash
   git init -b main
   git add .
   git commit -m "Preparar sitio GEDS"
   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
   git push -u origin main
   ```

   Sustituye `TU-USUARIO` y `TU-REPOSITORIO` por los valores de tu cuenta y del repositorio.
3. En GitHub abre **Settings → Pages**. En **Build and deployment**, selecciona **Deploy from a branch**, elige `main` y la carpeta `/(root)`, y guarda.
4. Cuando termine la publicación, GitHub mostrará la dirección del sitio en esa misma sección. El archivo `index.html` abre el inicio de sesión.

Para actualizar el sitio después de cambiar archivos:

```bash
git add .
git commit -m "Describe el cambio"
git push
```

GitHub Pages solo sirve los archivos estáticos. Si se desactiva el modo de demostración para usar una API real, publica también el servidor Node en un servicio compatible con Node.js y configura `API_BASE_URL` para apuntar a esa API. El servidor incluido está pensado para desarrollo local.

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
