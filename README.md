# App Web Interna - Control de Listados

Aplicación estática pensada para tablet en formato apaisado, con flujo de escaneo por lector de código de barras (EAN + Enter).

## Estructura

- `index.html`: interfaz principal
- `styles.css`: estilo oscuro optimizado para uso continuo en tablet
- `app.js`: lógica de pantallas + llamadas API
- `.htaccess.example`: ejemplo para proteger con login en Apache

## Flujo implementado

1. Pantalla de espera con:
   - `Empezar listado`
   - `Terminar listado`
2. Empezar listado:
   - Escaneo de listado -> `POST /API/GET_SAL_LIST` con body `{ "ean": "..." }`
   - Si OK: pide escaneo operario -> `POST /API/GET_OPE` con body `{ "ean": "...", "listEan": "..." }`
   - Si OK: vuelve a pantalla espera
   - Si error: muestra error y vuelve a pedir operario
3. Terminar listado:
   - Llama a `POST /API/FIN_LIST`
   - Si OK y devuelve items (`[{ean, articulo, uds}]`), pantalla de decisión:
     - `He recogido todo` -> `POST /API/FIN_LIST` con `{ "ok": true, "items": [] }`
     - `No pude recoger todo` -> selección de items/uds no recogidos y envío `POST /API/FIN_LIST` con `{ "ok": false, "items": [...] }`

## Ajuste de API

En `app.js`:

- Cambia `API_BASE` si necesitas prefijo (ejemplo: `'/miapp'`).
- Si tu API usa `GET` en vez de `POST`, adapta `apiRequest()`.

## Protección con Apache

1. Copia `.htaccess.example` a `.htaccess`
2. Ajusta la ruta de `AuthUserFile`
3. Crea usuarios:

```bash
htpasswd -c /ruta/segura/.htpasswd usuario_interno
```

