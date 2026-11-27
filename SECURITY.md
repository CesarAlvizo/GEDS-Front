# Seguridad de GEDS

Este documento describe los mecanismos que actualmente aparecen en el código de GEDS. Es una descripción técnica del proyecto, no una certificación ni el resultado de una auditoría de penetración.

## Autenticación y contraseñas

- **Autenticación basada en sesiones (session-based authentication):** el backend valida usuario y contraseña y crea un token opaco aleatorio de 32 bytes con `crypto.randomBytes`. El token se conserva en un `Map` del proceso del servidor y se asocia al ID del usuario y una expiración de ocho horas. No es JWT: no contiene claims y el backend consulta la sesión en cada solicitud.
- **Cookie de sesión protegida:** `geds_session` usa `HttpOnly`, `SameSite=Strict`, `Path=/` y `Max-Age`. JavaScript del navegador no puede leer su valor. Se agrega `Secure` cuando la conexión llega directamente al servidor mediante TLS. En el uso local HTTP no se usa ese atributo. El cierre de sesión revoca el token y expira la cookie.
- **Hash de contraseñas (password hashing):** `scrypt` con salt aleatorio de 16 bytes, clave derivada de 64 bytes y parámetros configurados en `server/passwords.js`. La verificación usa `timingSafeEqual`. Las contraseñas no se cifran para recuperarlas: se almacenan como hashes no reversibles y no se incluyen en las respuestas de login.
- **Limitación de intentos (rate limiting):** el login admite hasta 10 intentos por dirección IP en una ventana de 15 minutos y responde `429 Too Many Requests` con `Retry-After`. El contador está en memoria, se borra al reiniciar el proceso y se reinicia cuando el login tiene éxito.

## Protección de API y solicitudes

- **Autenticación de rutas:** productos, movimientos y catálogos requieren una cookie de sesión válida y una cuenta activa. El login y logout son rutas públicas por diseño.
- **Comprobación de origen (Origin validation):** las solicitudes `POST`, `PUT`, `PATCH` y `DELETE` con encabezado `Origin` deben coincidir con el host y protocolo de la solicitud. Se permiten solicitudes sin `Origin` para mantener compatibilidad con clientes como PowerShell y Postman; por ello es una defensa adicional, no un token CSRF completo.
- **Política de mismo origen:** la API usa una ruta relativa `/api` y el servidor no configura cabeceras CORS permisivas. La interfaz envía cookies con `credentials: 'same-origin'`.
- **Límite del cuerpo HTTP:** los cuerpos JSON se limitan aproximadamente a 1 MB antes de procesarse.
- **Errores:** los errores internos `500` se registran en la consola del servidor y la respuesta al cliente no incluye el mensaje interno. Los errores de validación devuelven mensajes y campos de error.

## Validación, consultas y reglas de inventario

- **Consultas SQL parametrizadas:** los valores variables se pasan mediante parámetros de SQLite. Los nombres dinámicos de tabla para catálogos se seleccionan de una lista permitida (`categories`, `units`, `providers`, `clients`).
- **Validación de entrada en backend:** se validan campos, longitudes, formatos, IDs, cantidades, fechas y nombres de catálogo. Las validaciones del frontend ayudan a la experiencia, pero no reemplazan las del backend.
- **Filtro de patrones sospechosos:** el backend rechaza algunas cadenas que parecen SQL injection. Es un filtro heurístico adicional; la defensa principal son las consultas parametrizadas. También restringe ciertos caracteres en algunos campos, incluida la contraseña.
- **Restricciones de base de datos:** SQLite define claves foráneas; movimientos limitan el tipo a `E` o `S`; triggers rechazan cantidades no positivas, salidas mayores al stock y valores negativos en productos. Un trigger actualiza el stock al insertar movimientos.
- **Transacciones:** la creación de productos, el registro de movimientos y la carga inicial usan transacciones para mantener consistentes los datos cuando hay un error.

## Frontend y exposición de datos

- **Inserción segura de texto (DOM XSS mitigation):** los valores de inventario se muestran principalmente con `textContent` y nodos DOM. El uso encontrado de `innerHTML` en el tema instala SVG constantes definidas en el código, no datos recibidos del usuario.
- **Exportaciones:** CSV antepone un apóstrofo a textos que podrían interpretarse como fórmulas de hoja de cálculo. XLSX escapa caracteres XML y elimina caracteres de control.
- **Sesión del frontend:** `sessionStorage` conserva un indicador mínimo de la interfaz, no el token de sesión del backend. El token real está en la cookie `HttpOnly`. La protección de páginas en frontend es solo navegación; la autorización efectiva de los datos ocurre en la API.
- **Datos visibles:** productos, movimientos, catálogos y demás información que la aplicación entrega al navegador se pueden inspeccionar en DevTools. Eso no expone por sí solo la contraseña guardada, pero los datos mostrados no son secretos frente al usuario autenticado del navegador.

## Servidor y cabeceras

- **Escucha local:** el servidor enlaza a `localhost` por defecto. La variable `HOST` puede cambiar ese valor; configurarlo a una interfaz pública o `0.0.0.0` puede exponer el servidor a otros equipos.
- **Bloqueo de archivos privados:** el servidor estático rechaza rutas ocultas y directorios `server`, `.git`, `node_modules` y `test`, además del módulo privado de demostración. Los archivos de SQLite local están dentro de `server/` y no se entregan por HTTP.
- **Cabeceras HTTP:** respuestas de API y archivos estáticos incluyen `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` y `Cross-Origin-Resource-Policy: same-origin`. La API añade `Cache-Control: no-store`.

## SQLite, configuración y Git

- **SQLite local:** el backend activa `PRAGMA foreign_keys = ON`, `journal_mode = WAL` y `secure_delete = ON`. La inicialización ejecuta `VACUUM` después de cargar el conjunto inicial. `secure_delete` no cifra la base.
- **Secretos de configuración:** `.env`, `.env.local`, archivos `.env.*` salvo `.env.example`, `server/private/` y `server/*.sqlite` están excluidos por `.gitignore`. El servidor bloquea por HTTP archivos ocultos y el directorio `server/`. Las variables de inicialización se eliminan del entorno del proceso cuando el seed termina o ya no es necesario.
- **SQLite de demostración:** `demo/geds-demo.sqlite` contiene información ficticia y se publica intencionalmente. El ZIP para compañeros incluye una copia de esa base en `server/geds.sqlite`; no contiene la base local privada. La cuenta de demostración del README es pública y no debe reutilizarse como credencial real.
- **GitHub Pages:** el dominio `*.github.io` activa un modo de demostración que guarda datos ficticios en `localStorage`. No usa el servidor local ni SQLite y no ofrece autenticación real; cualquiera puede cambiar sus datos desde el navegador.

## Dependencias externas y riesgos pendientes

- **JavaScript de terceros:** `dashboard.html` carga un widget desde `https://abc-chatbot-two.vercel.app/widget.js`. Ese código se ejecuta dentro de la página con los permisos del documento; técnicamente podría leer contenido visible e iniciar solicitudes same-origin usando la sesión del navegador. Su atributo `data-public-key` se identifica como público, pero el proveedor y el script deben ser de confianza. La etiqueta no fija una versión ni usa Subresource Integrity (SRI).
- **Recursos CDN:** las páginas cargan Bootstrap CSS desde jsDelivr y la pantalla de login usa Google Fonts. No se encontró Subresource Integrity (SRI) para esos recursos.
- **No implementado:** el servidor no configura TLS/HTTPS, Content Security Policy (CSP), cifrado de SQLite en reposo, autenticación multifactor (MFA), protección CSRF mediante token, límite de intentos persistente/distribuido, permisos granulares basados en roles (RBAC) ni bitácora de auditoría. La sesión en memoria y el rate limiting son apropiados solo para el alcance local actual, no para múltiples instancias públicas.
- **Alcance de pruebas:** `test/security-test.js` se enfoca en casos de SQL injection; no cubre todos los controles anteriores ni constituye una auditoría de seguridad completa.
- **Exposición histórica:** la SQLite real estuvo publicada antes de retirarla mediante reescritura del historial de `main`. Los clones, forks o descargas anteriores pueden conservar copias. Las contraseñas que estuvieron en esa base deben cambiarse si continúan en uso.

## Uso recomendado

Usar el backend en el mismo equipo mediante `localhost`, no publicar el puerto en Internet ni configurar `HOST` para una interfaz de red sin protección adicional. Para desplegar el backend con datos reales se requiere, como mínimo, TLS correctamente terminado, CSP compatible, protección CSRF completa, límites de login compartidos/persistentes, revisión del widget externo, copias de seguridad protegidas y pruebas de seguridad más amplias.
