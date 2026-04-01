# App Web Interna - SIROKO

Aplicacion web interna pensada para tablet en formato apaisado.

## Estructura recomendada

- `index.html`
  - Menu principal de modulos.
  - Carga sus propios recursos:
    - `pages/menu/menu.css`
    - `pages/menu/menu.js`
- `sacar-listados.html`
  - Pantalla principal del modulo de listados (flujo operativo actual).
  - Carga:
    - `styles.css`
    - `app.js`
- `fichar.html`
  - Pantalla placeholder del modulo fichar.
- `inventario-gavetas.html`
  - Pantalla del modulo inventario de gavetas.
  - Carga:
    - `pages/inventario-gavetas/inventario-gavetas.css`
    - `pages/inventario-gavetas/inventario-gavetas.js`
- `pages/inventario-gavetas/inventario-gavetas.css`
  - Estilos propios del modulo inventario de gavetas (reutilizando estilo base global).
- `pages/inventario-gavetas/inventario-gavetas.js`
  - Logica del modulo inventario de gavetas.
  - Carga inventarios abiertos desde API y gestiona pantalla de escaneo.
- `styles.css`
  - Estilos del modulo sacar listados.
- `app.js`
  - Logica del modulo sacar listados + llamadas API.

## Endpoints actuales (modulo sacar listados)

Base URL: definida en `../env-config.js` como `BASE_URL`.

- `GET /api/API_GET_OPE`
- `POST /api/API_ASSIGN_SAL_LIST`
- `GET /api/API_GET_LIST`
- `POST /api/API_FIN_LIST`

## Endpoint actual (modulo inventario de gavetas)

- `GET /api/API_GET_PICKING_INV`
  - Configurable con `PICKING_INV_ENDPOINT` en `env-config.js`.
  - Respuesta esperada: array de objetos con `name`, `id`, `url`.

## Configuracion de entorno

Archivo global fuera del modulo: `../env-config.js`

Campos usados:

- `BASE_URL`
- `AUTHORIZATION_TOKEN`
- `API_KEY` (opcional, segun backend)

## Nota de arquitectura

Para crecer sin romper modulos:

- cada modulo nuevo debe tener su propio `html` + `css` + `js`;
- evitar meter logica de modulos nuevos dentro de `app.js` de listados;
- mantener `index.html` solo como enrutador/menu.
