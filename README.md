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
- Almacenamiento local del navegador para el modo de demostración.

## Requisitos

- Node.js 18 o posterior.

## Ejecución

```bash
npm start
```

La aplicación queda disponible en `http://localhost:3000`. Las páginas estáticas también pueden servirse con un servidor de desarrollo local. El servidor Node incluido proporciona la API de desarrollo.

## Modo de demostración

La configuración predeterminada activa `USE_MOCK` en `js/config.js`. En este modo, la aplicación utiliza datos de ejemplo y los guarda en el almacenamiento local del navegador. Las credenciales de demostración son:

| Usuario | Contraseña |
| --- | --- |
| `admin` | `admin` |

El almacenamiento local es propio de cada navegador y no sincroniza información entre usuarios o dispositivos.

## Estructura del proyecto

```text
├── assets/             Recursos estáticos, como el logotipo
├── css/                Estilos globales, componentes y vistas
├── js/
│   ├── components/     Componentes de interfaz reutilizables
│   ├── data/           Datos iniciales y adaptador de almacenamiento local
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

La configuración de la aplicación se encuentra en `js/config.js`. Para utilizar la API de desarrollo en lugar del modo de demostración, se puede desactivar `USE_MOCK` y configurar `API_BASE_URL` con la dirección correspondiente. La especificación de endpoints está documentada en [API_SPECIFICATION.md](API_SPECIFICATION.md).

## Créditos

Desarrollado para el Instituto Tecnológico de Aguascalientes.
