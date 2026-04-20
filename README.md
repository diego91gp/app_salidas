# Siroko Warehouse — Tablet Apps

Internal web + Android application suite for warehouse operations at Siroko.
Designed for landscape tablet use with barcode scanner input.

> **Español / English** — documentación bilingüe abajo.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Modules](#modules)
- [Android App](#android-app)
- [Local Development](#local-development)
- [Estructura del proyecto](#estructura-del-proyecto-es)
- [Configuración del entorno](#configuración-del-entorno-es)
- [Módulos](#módulos-es)
- [App Android](#app-android-es)
- [Desarrollo local](#desarrollo-local-es)

---

## Project Structure

```
apps_tablet/
├── android/                        # Android APK (warehouse WebView wrapper)
│   ├── app/src/main/
│   │   └── java/com/siroko/listados/MainActivity.kt
│   └── keystore/                   # Release signing keystore
├── assets/images/                  # Shared images and logos
├── mock-images/                    # Fallback SVG images for article renders
├── pages/
│   ├── clock-in/                   # Clock-in module (CSS + JS)
│   ├── drawer-inventory/           # Drawer inventory module (CSS + JS)
│   ├── menu/                       # Main menu (CSS + JS)
│   └── picking-map/                # Picking map module (CSS + JS)
├── index.html                      # Main menu
├── clock-in.html                   # Clock-in module
├── drawer-inventory.html           # Drawer inventory module
├── export-lists.html               # Picking list export module
├── picking-map.html                # Warehouse picking map
├── box-scan.html                   # Box label scanning (standalone)
├── app.js                          # Shared API client for export-lists
└── styles.css                      # Global base styles
```

---

## Environment Setup

The web apps load runtime configuration from **`../env-config.js`**
(one level above the project root — not committed to the repo).

Create the file at that path with the following structure:

```js
// env-config.js
window.ENV_CONFIG = {
    BASE_URL:            "https://velneo.siroko.com",   // Velneo backend URL
    AUTHORIZATION_TOKEN: "BASE64_BASIC_AUTH_TOKEN",     // Base64 of user:password
    API_KEY:             "YOUR-API-KEY-UUID",           // Velneo SQL API key
};
```

| Field | Description |
|-------|-------------|
| `BASE_URL` | Velneo server base URL. Use `https://velneo.siroko.com` for production or `https://c5.velneo.com:21272` for staging. |
| `AUTHORIZATION_TOKEN` | Base64-encoded `user:password` for HTTP Basic Auth. Generate with `btoa("user:password")` in the browser console. |
| `API_KEY` | UUID key registered in the `API_KEYS` table of Velneo. Required by `api_queries` and `api_box_scan` endpoints. |

> The file is intentionally outside the repo to avoid committing credentials.
> The Android app uses its own credential screen and does not read `env-config.js`.

---

## Modules

### `index.html` — Main Menu
Entry point. Links to all modules.

### `export-lists.html` — Export Picking Lists
- Scan operator EAN → validate via `GET /api/API_GET_OPE`
- Scan list EAN → assign via `POST /api/API_ASSIGN_SAL_LIST`
- Finish list → `GET /api/API_GET_LIST` → `POST /api/API_FIN_LIST`

### `drawer-inventory.html` — Drawer Inventory
- Load or create open inventories
- Scan operator EAN before counting
- Scan drawer EAN → `GET /api/API_GET_VAR_BY_EAN`
- Submit count line → `POST /api/API_CREATE_PICKING_INV_LINE`

### `clock-in.html` — Clock In/Out
- Operator clock-in and clock-out module.

### `picking-map.html` — Picking Map
- Visual map of warehouse zones and pallet/box positions.

### `box-scan.html` — Box Label Scanning
Standalone single-file app. No external JS dependencies.
- Scan box CODE128 → `GET /api/api_box_scan?code=...&apikey=...`
- Returns article photo (CDN), name, size and units in one request.
- Editable units per row. Transfer button (pending implementation).

---

## Android App

Located in `android/`. A signed WebView wrapper that loads `https://velneo.siroko.com/alm_app`.

**Build signed APK:**
```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

**Key behaviour:**
- Images are intercepted and cached to disk permanently (`cacheDir/img_cache/`).
- Requests go directly to `cdn.siroko.com` (CDN77, 1-year cache headers).
- WebView cache is disabled for HTML/JS/CSS (`LOAD_NO_CACHE`).
- Image cache is cleared only when credentials change.
- Credentials are stored in `SharedPreferences` and re-used across sessions.

---

## Local Development

Serve with any static server from the `apps_tablet/` root:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Then place `env-config.js` one level up:
```
codex/
├── env-config.js     ← here
└── apps_tablet/
    └── index.html
```

Open `http://localhost:8080` in a tablet-sized browser window (landscape).
Hard-reload (`Ctrl+Shift+R`) if cached assets appear stale.

---
---

## Estructura del proyecto (ES)

```
apps_tablet/
├── android/                        # App Android (wrapper WebView para almacén)
│   ├── app/src/main/
│   │   └── java/com/siroko/listados/MainActivity.kt
│   └── keystore/                   # Keystore de firma release
├── assets/images/                  # Imágenes y logos compartidos
├── mock-images/                    # SVGs de fallback para renders de artículos
├── pages/
│   ├── clock-in/                   # Módulo de fichaje (CSS + JS)
│   ├── drawer-inventory/           # Módulo de inventario de gavetas (CSS + JS)
│   ├── menu/                       # Menú principal (CSS + JS)
│   └── picking-map/                # Módulo mapa picking (CSS + JS)
├── index.html                      # Menú principal
├── clock-in.html                   # Módulo de fichaje
├── drawer-inventory.html           # Módulo de inventario de gavetas
├── export-lists.html               # Módulo de sacar listados de picking
├── picking-map.html                # Mapa visual del almacén
├── box-scan.html                   # Escaneo de etiquetas de caja (standalone)
├── app.js                          # Cliente API compartido para export-lists
└── styles.css                      # Estilos base globales
```

---

## Configuración del entorno (ES)

Las apps web cargan la configuración desde **`../env-config.js`**
(un nivel por encima de la raíz del proyecto — no se sube al repo).

Crea el archivo con esta estructura:

```js
// env-config.js
window.ENV_CONFIG = {
    BASE_URL:            "https://velneo.siroko.com",   // URL del backend Velneo
    AUTHORIZATION_TOKEN: "BASE64_USUARIO_CONTRASEÑA",   // Base64 de usuario:contraseña
    API_KEY:             "UUID-DE-LA-API-KEY",          // API key registrada en Velneo
};
```

| Campo | Descripción |
|-------|-------------|
| `BASE_URL` | URL base del servidor Velneo. Producción: `https://velneo.siroko.com`. Staging: `https://c5.velneo.com:21272`. |
| `AUTHORIZATION_TOKEN` | `usuario:contraseña` codificado en Base64 para HTTP Basic Auth. Generar con `btoa("usuario:contraseña")` en la consola del navegador. |
| `API_KEY` | UUID registrado en la tabla `API_KEYS` de Velneo. Necesario para los endpoints `api_queries` y `api_box_scan`. |

> El archivo está fuera del repo intencionalmente para no subir credenciales.
> La app Android usa su propia pantalla de credenciales y no lee `env-config.js`.

---

## Módulos (ES)

### `index.html` — Menú principal
Punto de entrada. Acceso a todos los módulos.

### `export-lists.html` — Sacar listados de picking
- Escanear EAN operario → validar con `GET /api/API_GET_OPE`
- Escanear EAN listado → asignar con `POST /api/API_ASSIGN_SAL_LIST`
- Cerrar listado → `GET /api/API_GET_LIST` → `POST /api/API_FIN_LIST`

### `drawer-inventory.html` — Inventario de gavetas
- Cargar o crear inventarios abiertos
- Escanear EAN operario antes de contar
- Escanear EAN gaveta → `GET /api/API_GET_VAR_BY_EAN`
- Enviar línea de recuento → `POST /api/API_CREATE_PICKING_INV_LINE`

### `clock-in.html` — Fichaje
- Módulo de entrada y salida de operarios.

### `picking-map.html` — Mapa de picking
- Mapa visual de zonas del almacén con posiciones de palés y cajas.

### `box-scan.html` — Escaneo de etiquetas de caja
App standalone en un solo archivo HTML sin dependencias externas.
- Escanear CODE128 de caja → `GET /api/api_box_scan?code=...&apikey=...`
- Devuelve foto (CDN), nombre artículo, talla y unidades en una sola petición.
- Unidades editables por fila. Botón de traspaso pendiente de implementar.

---

## App Android (ES)

Ubicada en `android/`. Wrapper WebView firmado que carga `https://velneo.siroko.com/alm_app`.

**Compilar APK firmado:**
```bash
cd android
./gradlew assembleRelease
# Resultado: app/build/outputs/apk/release/app-release.apk
```

**Comportamiento clave:**
- Las imágenes se interceptan y cachean en disco de forma permanente (`cacheDir/img_cache/`).
- Las peticiones van directamente a `cdn.siroko.com` (CDN77, cabeceras de caché de 1 año).
- La caché del WebView está desactivada para HTML/JS/CSS (`LOAD_NO_CACHE`).
- La caché de imágenes solo se limpia al cambiar las credenciales.
- Las credenciales se guardan en `SharedPreferences` y se reutilizan entre sesiones.

---

## Desarrollo local (ES)

Lanzar con cualquier servidor estático desde la raíz de `apps_tablet/`:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Colocar `env-config.js` un nivel por encima:
```
codex/
├── env-config.js     ← aquí
└── apps_tablet/
    └── index.html
```

Abrir `http://localhost:8080` en una ventana de navegador con tamaño de tablet (apaisado).
Si los assets se ven desactualizados, forzar recarga dura con `Ctrl+Shift+R`.
