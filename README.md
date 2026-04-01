# APP SALIDAS / SIROKO WAREHOUSE (WEB TABLET)

Aplicacion web interna para tablet (uso principal en formato apaisado), dividida en modulos y consumiendo APIs de backend Velneo a traves de Apache.

## 1. Estructura del proyecto

- `index.html`
  - Menu principal de modulos.
  - Carga:
    - `pages/menu/menu.css`
    - `pages/menu/menu.js`

- `sacar-listados.html`
  - Modulo de gestion de listados de picking.
  - Carga:
    - `styles.css`
    - `app.js`

- `inventario-gavetas.html`
  - Modulo de inventario de gavetas.
  - Carga:
    - `styles.css` (estilo base global)
    - `pages/inventario-gavetas/inventario-gavetas.css`
    - `pages/inventario-gavetas/inventario-gavetas.js`

- `fichar.html`
  - Placeholder/entrada futura para modulo de fichaje.

- `assets/images/`
  - Logos e imagenes de apoyo visual (operario, ean gaveta, etc.).

- `mock-images/`
  - Imagenes fallback para renders de items.

## 2. Configuracion de entorno

La web carga configuracion global desde:

- `../env-config.js`

Campos usados en runtime:

- `BASE_URL`
- `AUTHORIZATION_TOKEN`

Campos opcionales para sobreescribir endpoints (inventario):

- `PICKING_INV_ENDPOINT`
- `CREATE_PICKING_INV_ENDPOINT`
- `PICKING_INV_LINES_ENDPOINT`
- `GET_VAR_BY_EAN_ENDPOINT`
- `CREATE_PICKING_INV_LINE_ENDPOINT`
- `GET_OPE_ENDPOINT`

Si no se informan, se usan defaults `/api/...` definidos en JS.

## 3. Endpoints actuales

Base efectiva: `${BASE_URL}` + endpoint.

### 3.1 Modulo Sacar Listados (`app.js`)

- `GET /api/API_GET_OPE`
  - Query: `operator_ean`
  - Uso: validar operario.

- `POST /api/API_ASSIGN_SAL_LIST`
  - Body:
    - `operator_ean`
    - `list_ean`
  - Uso: asignar listado a operario.

- `GET /api/API_GET_LIST`
  - Query: `list_ean`
  - Uso: obtener lineas para flujo de finalizacion.

- `POST /api/API_FIN_LIST`
  - Body:
    - `ean_listado`
    - `ok`
    - `items` (segun haya pendientes o no)
  - Uso: cierre de listado.

### 3.2 Modulo Inventario Gavetas (`pages/inventario-gavetas/inventario-gavetas.js`)

- `GET /api/API_GET_PICKING_INV`
  - Uso: cargar inventarios abiertos.

- `POST /api/API_CREATE_PICKING_INV`
  - Uso: crear inventario abierto si no existe.

- `GET /api/API_GET_PICKING_INV_LINES`
  - Query: `INV_ID`
  - Uso: cargar lineas del inventario.

- `GET /api/API_GET_OPE`
  - Query: `operator_ean`
  - Uso: validar operario antes de contar.

- `GET /api/API_GET_VAR_BY_EAN`
  - Query: `VAR_EAN`
  - Uso: obtener datos articulo/gaveta tras escaneo.

- `POST /api/API_CREATE_PICKING_INV_LINE`
  - Body actual enviado:
    - `var_ean`
    - `inv_id`
    - `operator_ean`
    - `uds`
    - `uds_max`
    - `uds_aviso`
  - Uso: alta/modificacion de linea de recuento.

## 4. Flujo funcional

### 4.1 Menu principal

Opciones:

- `SACAR LISTADOS`
- `FICHAR` (actualmente deshabilitado)
- `INVENTARIO DE GAVETAS`

### 4.2 Sacar listados

- Escanear operario (`API_GET_OPE`).
- Escanear listado.
- Asignar (`API_ASSIGN_SAL_LIST`) o finalizar (`API_GET_LIST` -> `API_FIN_LIST`) segun modo.
- Flujo de pendientes con teclado tactil y seleccion de incidencias.

### 4.3 Inventario de gavetas

- Cargar inventarios abiertos.
- Crear nuevo inventario o abrir uno existente.
- Boton `CONTAR` exige escaneo previo de operario (`API_GET_OPE`).
- Escaneo EAN gaveta (`API_GET_VAR_BY_EAN`).
- Pantalla de recuento:
  - unidades contadas
  - desplegable para uds maximas / minimas aviso
  - validaciones de campos obligatorios
- Enviar linea (`API_CREATE_PICKING_INV_LINE`) y recargar lineas (`API_GET_PICKING_INV_LINES`).

Nota: el operario validado se mantiene durante el flujo del modulo y se limpia al volver al menu principal.

## 5. Desarrollo local

Opciones habituales:

- Live Server (VSCode)
- Servidor estatico simple

Si el navegador muestra version antigua, forzar recarga dura (`Ctrl+Shift+R`) o desactivar cache en DevTools.

## 6. Criterios de UI actuales

- Orientado a tablet y lector de codigo de barras.
- Inputs en `readonly` para evitar teclado virtual y priorizar escaner.
- Navegacion por pantallas tipo kiosk con feedback visual de:
  - carga
  - ok
  - error
- Estetica dark, textos en mayusculas y controles grandes para uso tactil.
