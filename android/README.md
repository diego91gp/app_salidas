# Siroko Warehouse — Android App

WebView wrapper for the Siroko warehouse management system.
Loads `https://velneo.siroko.com/alm_app` with HTTP Basic Auth and a permanent image cache.

> **Español / English** — documentación bilingüe abajo.

---

## What it does

The app is a thin native shell around a Velneo web app. Its only responsibilities beyond rendering the web content are:

1. **Credential management** — stores `user:password` in `SharedPreferences` and injects them as an `Authorization: Basic ...` header on every request. A native dialog prompts for credentials on first launch or after a failed validation.

2. **Image cache** — intercepts all requests to `cdn.siroko.com` images via `shouldInterceptRequest`, saves them to disk, and serves them from disk on subsequent loads. Images are cached permanently and only evicted when credentials change.

3. **Rotation handling** — the Activity is configured with `configChanges = orientation|screenSize` so the WebView is never recreated on rotation; JS state is preserved.

4. **Back button** — pressing back exits the app completely (`finishAffinity`), since the web app handles its own navigation.

---

## Project structure

```
android/
├── app/
│   ├── build.gradle.kts            # App-level Gradle config, signing, dependencies
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/siroko/listados/
│       │   └── MainActivity.kt     # All logic (single activity)
│       └── res/
│           ├── layout/activity_main.xml
│           ├── mipmap-*/           # Launcher icons
│           └── values/
│               ├── strings.xml
│               └── themes.xml
├── build.gradle.kts                # Project-level Gradle config
├── gradle/wrapper/
│   └── gradle-wrapper.properties   # Gradle 8.7
├── gradlew / gradlew.bat
├── gradle.properties
├── settings.gradle.kts
└── keystore/
    └── siroko_almacen_release.jks  # Release signing keystore
```

---

## How the image cache works

```
Request to cdn.siroko.com/*.{jpg,png,webp}
        │
        ▼
shouldInterceptRequest()
        │
        ├── MD5(url) → filename
        │
        ├── File exists in cacheDir/img_cache/?
        │       YES → serve from disk immediately
        │       NO  → download, save to disk, serve from disk
        │
        └── All other URLs → pass through to WebView (no intercept)
```

- Cache directory: `<app_cacheDir>/img_cache/`
- Cache key: MD5 hex of the full URL string
- TTL: **permanent** — files are never expired automatically
- Eviction: only when the user saves new credentials (`clearCache = true`)
- WebView itself uses `LOAD_NO_CACHE` — only images are cached, not HTML/JS/CSS

---

## Credential flow

```
App launch
    │
    ├── Credentials in SharedPreferences?
    │       YES → testCredentials() (background thread)
    │               OK  → loadUrl() with Authorization header
    │               FAIL → show credential dialog
    │       NO  → show credential dialog
    │
Credential dialog (force = true, cannot be dismissed)
    │
    ├── User enters user + password
    ├── testCredentials() → GET startUrl with Basic Auth
    │       OK  → saveCredentials() → loadUrl()
    │               also: clear WebView cache + delete img_cache/
    │       FAIL → show dialog again with error message
    │
HTTP Auth challenge (onReceivedHttpAuthRequest)
    │
    └── Credentials available → handler.proceed(user, pass)
        No credentials → cancel + show dialog
```

---

## Build

### Requirements

- Android Studio Hedgehog or later (or just the Android SDK CLI tools)
- JDK 17
- Gradle 8.7 (included via wrapper — no manual install needed)

### Debug build

```bash
cd android
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

### Release build (signed)

```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

The release build is signed automatically using the keystore at
`keystore/siroko_almacen_release.jks`. Signing config is in `app/build.gradle.kts`.

### Install directly on a connected device

```bash
./gradlew installDebug      # debug
./gradlew installRelease    # release (device must allow unknown sources)
```

### Install APK over local Wi-Fi

Start a temporary HTTP server from the `release/` output folder:

```bash
cd app/build/outputs/apk/release
python3 -m http.server 8888
```

Then open `http://<your-machine-ip>:8888/app-release.apk` on the tablet browser.
Enable **"Install from unknown sources"** in Android settings before installing.

---

## App config

| Setting | Value |
|---------|-------|
| `applicationId` | `com.siroko.listados` |
| `minSdk` | 24 (Android 7.0) |
| `targetSdk` | 34 (Android 14) |
| `startUrl` | `https://velneo.siroko.com/alm_app` |
| Keystore alias | `siroko_almacen` |

To point the app at a different server, change `startUrl` in `MainActivity.kt`:

```kotlin
private val startUrl = "https://velneo.siroko.com/alm_app"
```

---

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| `androidx.core:core-ktx` | 1.13.1 | Kotlin extensions |
| `androidx.appcompat:appcompat` | 1.7.0 | Activity/dialog base |
| `androidx.webkit:webkit` | 1.11.0 | WebView compat utilities |

No third-party image loading library (Glide, Picasso, Coil) — image caching is implemented natively in `shouldInterceptRequest`.

---
---

## Qué hace la app (ES)

La app es una capa nativa mínima sobre una app web de Velneo. Sus responsabilidades fuera de renderizar el contenido web son:

1. **Gestión de credenciales** — guarda `usuario:contraseña` en `SharedPreferences` e inyecta la cabecera `Authorization: Basic ...` en cada petición. Un diálogo nativo pide las credenciales la primera vez o tras un fallo de validación.

2. **Caché de imágenes** — intercepta todas las peticiones a imágenes de `cdn.siroko.com` mediante `shouldInterceptRequest`, las guarda en disco y las sirve desde disco en cargas posteriores. Las imágenes se cachean de forma permanente y solo se borran al cambiar las credenciales.

3. **Manejo de rotación** — la Activity está configurada con `configChanges = orientation|screenSize` para que el WebView nunca se recree al rotar; el estado JS se preserva.

4. **Botón atrás** — presionar atrás cierra la app completamente (`finishAffinity`), ya que la web gestiona su propia navegación.

---

## Cómo funciona la caché de imágenes (ES)

```
Petición a cdn.siroko.com/*.{jpg,png,webp}
        │
        ▼
shouldInterceptRequest()
        │
        ├── MD5(url) → nombre de archivo
        │
        ├── ¿Existe el archivo en cacheDir/img_cache/?
        │       SÍ → servir desde disco inmediatamente
        │       NO → descargar, guardar en disco, servir desde disco
        │
        └── Resto de URLs → pasan directamente al WebView (sin interceptar)
```

- Directorio de caché: `<app_cacheDir>/img_cache/`
- Clave de caché: MD5 hex de la URL completa
- TTL: **permanente** — los archivos nunca caducan automáticamente
- Borrado: solo al guardar nuevas credenciales (`clearCache = true`)
- El WebView usa `LOAD_NO_CACHE` — solo las imágenes se cachean, no HTML/JS/CSS

---

## Flujo de credenciales (ES)

```
Inicio de la app
    │
    ├── ¿Hay credenciales en SharedPreferences?
    │       SÍ → testCredentials() (hilo de fondo)
    │               OK   → loadUrl() con cabecera Authorization
    │               FAIL → mostrar diálogo de credenciales
    │       NO → mostrar diálogo de credenciales
    │
Diálogo de credenciales (force = true, no se puede cerrar)
    │
    ├── El usuario introduce usuario + contraseña
    ├── testCredentials() → GET a startUrl con Basic Auth
    │       OK   → saveCredentials() → loadUrl()
    │               también: limpia caché del WebView + borra img_cache/
    │       FAIL → vuelve a mostrar el diálogo con mensaje de error
    │
Challenge HTTP Auth (onReceivedHttpAuthRequest)
    │
    └── Credenciales disponibles → handler.proceed(user, pass)
        Sin credenciales → cancelar + mostrar diálogo
```

---

## Compilar (ES)

### Requisitos

- Android Studio Hedgehog o posterior (o solo las CLI tools del Android SDK)
- JDK 17
- Gradle 8.7 (incluido via wrapper — no requiere instalación manual)

### Build de debug

```bash
cd android
./gradlew assembleDebug
# Resultado: app/build/outputs/apk/debug/app-debug.apk
```

### Build de release (firmado)

```bash
cd android
./gradlew assembleRelease
# Resultado: app/build/outputs/apk/release/app-release.apk
```

El build de release se firma automáticamente con el keystore en
`keystore/siroko_almacen_release.jks`. La configuración de firma está en `app/build.gradle.kts`.

### Instalar directamente en un dispositivo conectado

```bash
./gradlew installDebug      # debug
./gradlew installRelease    # release (el dispositivo debe permitir fuentes desconocidas)
```

### Instalar APK por Wi-Fi local

Lanzar un servidor HTTP temporal desde la carpeta de salida:

```bash
cd app/build/outputs/apk/release
python3 -m http.server 8888
```

Abrir `http://<ip-de-tu-máquina>:8888/app-release.apk` en el navegador de la tablet.
Activar **"Instalar desde fuentes desconocidas"** en los ajustes de Android antes de instalar.
