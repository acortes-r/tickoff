# tickoff

Listas de compras y pendientes, personales o compartidas, instalables como PWA en Android y iOS.

## Requisitos
- [mise](https://mise.jdx.dev) (instala Node, pnpm y Java para los emuladores de Firebase)

## Arranque
```sh
mise install
pnpm install
pnpm dev        # Vite + emuladores de Auth y Firestore (proyecto demo-tickoff)
```

## Tests
```sh
pnpm test       # unitarios (jsdom)
pnpm test:emu   # reglas y datos contra los emuladores de Firebase
pnpm test:e2e   # navegador (Playwright, perfil Android) contra los emuladores
```

La primera vez, descarga el navegador: `pnpm exec playwright install chromium`
(queda en `~/Library/Caches/ms-playwright`, fuera del repo). Para probar también
con WebKit (motor de Safari): `pnpm exec playwright install webkit` y
`E2E_WEBKIT=1 pnpm test:e2e`. En macOS 14 Playwright solo ofrece un WebKit
congelado que ya no es compatible.

## Publicar (Firebase Hosting)

Desarrollo y tests no lo necesitan: usan el emulador `demo-tickoff`. Para publicar
hace falta un proyecto real de Firebase. Esto se hace una sola vez.

### 1. Proyecto de Firebase
1. En la [consola de Firebase](https://console.firebase.google.com) crea un proyecto (plan Spark, gratis).
2. **Authentication › Método de acceso:** activa **Google**.
3. **Firestore Database:** créala en **modo producción** (las reglas de `firestore.rules` se suben al publicar). Región sugerida: `nam5`.
4. **Configuración del proyecto › Tus apps:** registra una app **web** (sin Hosting en ese paso).
5. Copia `.env.example` a `.env.local` y llena los `VITE_FIREBASE_*` con la config de esa app.
   - `VITE_FIREBASE_AUTH_DOMAIN` va con el dominio de Hosting (`<proyecto>.web.app`), no con `<proyecto>.firebaseapp.com`: así el login por redirección funciona en Safari e iOS.

### 2. Google Cloud (respaldo a Drive)
En la [consola de Google Cloud](https://console.cloud.google.com), con el mismo proyecto seleccionado:
1. **APIs y servicios › Biblioteca:** activa **Google Drive API**.
2. **Pantalla de consentimiento de OAuth:** agrega el permiso `https://www.googleapis.com/auth/drive.file`. Mientras la app esté en modo "Prueba", agrega como usuarios de prueba las cuentas que la van a usar.
3. **Credenciales › Web client (creado por Firebase):**
   - Orígenes autorizados de JavaScript: `https://<proyecto>.web.app`.
   - URI de redireccionamiento autorizados: `https://<proyecto>.web.app/__/auth/handler`.
   - Copia su **ID de cliente** a `VITE_GOOGLE_CLIENT_ID` en `.env.local`.

Sin `VITE_GOOGLE_CLIENT_ID` la app funciona igual, pero el respaldo se descarga al dispositivo en vez de subirse a Drive.

### 3. Conectar el repo con el proyecto
```sh
pnpm exec firebase login
pnpm exec firebase use --add   # elige el proyecto y ponle el alias: prod
```
Esto agrega el alias `prod` a `.firebaserc`. `default` sigue siendo `demo-tickoff`, así que los emuladores no tocan el proyecto real.

### 4. Publicar
```sh
pnpm deploy:prod
```
Compila con `.env.local` y sube Hosting, las reglas y los índices de Firestore. Al terminar imprime la URL (`https://<proyecto>.web.app`).

- `sw.js`, `index.html` y el manifest se sirven sin caché: una versión nueva llega al siguiente arranque de la app. Lo de `assets/` lleva hash en el nombre y se guarda un año.
- Usa `pnpm deploy:prod`, no `pnpm deploy`: ese es un comando propio de pnpm.

### 5. Instalar en el celular
- **Android (Chrome):** abre la URL › menú › "Instalar app".
- **iPhone (Safari):** abre la URL › Compartir › "Agregar a inicio".
