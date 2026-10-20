# tickoff — Diseño v1

Fecha: 2026-10-20
Estado: aprobado (2026-10-20)

## Intención

Hoy la lista del mandado vive en las notas del celular de una sola persona. Problemas:

- Agregar algo cuesta lo suficiente para que, cuando alguien se acuerda, no lo agregue y se olvide.
- Las notas no separan lo pendiente de lo hecho ni guardan historial.
- Se compra en varias tiendas, y la nota mezcla todo.
- Solo una persona tiene la lista; la pareja no la ve ni la edita.
- No todo es despensa: también hay cosas del trabajo, del jardín, de las mascotas, compras y pendientes por hacer.

tickoff es una PWA (Android e iOS) de listas personales organizadas por categoría. Cada lista mezcla cosas por **comprar** y cosas por **hacer**, separadas en dos pestañas. Cada usuario decide qué listas comparte y con quién; las demás son privadas. Las listas compartidas se sincronizan en vivo.

**Éxito:** la pareja deja las notas del celular; agregar un elemento toma menos de 5 segundos desde que se abre la app; en el super, cada quien ve lo que el otro tachó; las listas privadas de cada uno siguen siendo privadas.

## Objetivos v1

1. Login con Google.
2. Listas propias con categoría; cada lista tiene pestañas **Comprar** y **Hacer**.
3. Categorías personales para agrupar listas.
4. Compartir una lista concreta desde la app con un link de invitación.
5. Captura rápida de elementos.
6. Catálogo personal de tiendas con una default (elementos por comprar).
7. Modo super: filtrar por tienda y tachar.
8. Historial: compras cerradas y pendientes completados.
9. Revertir errores (destachar, deshacer cierre, regresar desde historial).
10. Funcionar sin señal y sincronizar al volver.
11. Exportar respaldo a JSON y CSV en una carpeta "tickoff" de Google Drive.
12. Actividad: campana de avisos, aviso al abrir la app, punto en listas con cambios y resaltado de lo nuevo.

## No-objetivos v1

- Notificaciones push (cambios del otro con la app cerrada). Los avisos de F12 solo se ven dentro de la app.
- Recordatorios y elementos recurrentes (ej. croquetas cada 15 días). Feature opcional posterior.
- Fechas límite, prioridades o asignar pendientes a alguien.
- Vista que junte elementos de varias listas por tienda (ej. "todo lo de Walmart"). Candidata para después.
- Precios, presupuesto, tickets.
- Fotos en elementos.
- Importar datos.
- Apps nativas o publicación en tiendas.

## Anti-objetivos (sería un fracaso aunque funcione)

- Agregar un elemento toma más pasos que escribir en una nota.
- Un cambio de un miembro borra el cambio del otro en otro elemento o en otro campo del mismo elemento (ver F10).
- Alguien ve una lista que no le compartieron.
- La app no abre o no deja tachar dentro del super sin señal.

## Restricciones

- Sin backend propio. Firebase en plan gratuito **Spark**: Auth + Firestore + Hosting. Nada que requiera plan Blaze (sin Cloud Functions).
- PWA instalable en Android (Chrome) e iOS (Safari, "Agregar a inicio").
- React 19 + Vite + TypeScript, ya en el repo.
- Versiones de herramientas fijadas con mise (`mise.toml`); pnpm como gestor de paquetes.
- Interfaz en español (México).
- Datos de prueba, fixtures y seeds siempre inventados.

## Conceptos

- **Usuario:** cuenta de Google.
- **Categoría:** etiqueta personal para agrupar listas (ej. Despensa, Trabajo, Jardín, Mascotas). Cada usuario tiene las suyas.
- **Lista:** tiene dueño, miembros, nombre y dos pestañas:
  - **Comprar:** elementos con cantidad y tienda; se tachan y se cierran como compra.
  - **Hacer:** tareas con nota opcional; se marcan hechas y se archivan.
- **Elemento:** tiene un tipo, `buy` (comprar) o `do` (hacer), que decide en qué pestaña vive.
- **Tienda:** entrada del catálogo personal del usuario.

## Features

### F1. Login con Google
- Firebase Auth con proveedor Google; la sesión persiste.
- En el primer login se crean categorías de ejemplo (Despensa, Trabajo, Jardín, Mascotas), una tienda default ("Super") y una lista "Despensa" en la categoría Despensa. Todo se puede renombrar o borrar.
- Si el primer login llega desde un link de invitación, igual se crea lo anterior y además se une a la lista invitada.
- Cerrar sesión desde Ajustes.

### F2. Categorías
- Crear, renombrar, borrar y reordenar categorías. Cada una tiene nombre, ícono y color.
- Al borrar una categoría, sus listas pasan a "Sin categoría".
- La categoría es personal: si alguien te comparte una lista, tú decides en qué categoría tuya la pones (por default "Sin categoría"). El otro miembro no ve tu elección.

### F3. Listas
- Crear lista: nombre y categoría.
- Renombrar y cambiar de categoría.
- Borrar: solo el dueño; pide confirmación y la borra para todos los miembros, incluido su historial.
- Pantalla de inicio: listas agrupadas por categoría, con contador de pendientes por comprar y por hacer, y un indicador de lista compartida.

### F3b. Pestañas Comprar / Hacer
- Cada lista muestra dos pestañas, **Comprar** y **Hacer**, con su contador de pendientes.
- La pestaña activa decide el tipo del elemento que se agrega: no hay selector aparte.
- Cada lista recuerda la última pestaña usada (por usuario), así Despensa abre en Comprar y Trabajo en Hacer sin tocar nada.
- Un elemento se puede mover a la otra pestaña desde su edición (ej. "pintar la barda" → "comprar pintura" es otro elemento, pero un error de pestaña se corrige moviéndolo).
- Ambas pestañas existen siempre, aunque una esté vacía.

### F4. Compartir
- **Invitar:** el dueño, desde una lista, toca "Compartir" y la app genera un link con token. Se comparte con la Web Share API (WhatsApp, etc.), con copiar al portapapeles como respaldo.
- El token sirve una sola vez y vence a los 7 días.
- **Unirse:** quien abre el link entra con Google, ve el nombre de la lista y quién la comparte, y acepta. La lista aparece en sus listas; nada de lo suyo cambia.
  - El nombre de la lista y el nombre y foto del dueño se copian en la invitación al crearla, para mostrarlos antes de aceptar sin dar acceso a la lista. Cualquier usuario autenticado que conozca el token puede leer esa invitación (y solo esa).
- **Miembros:** en la lista se ve el dueño y los miembros (nombre y foto). Un miembro puede hacer todo lo de los elementos y del historial (agregar, editar, tachar, cerrar compra, archivar, deshacer, regresar, reabrir); no puede renombrar, borrar la lista ni invitar.
- **Control del dueño:** sacar a un miembro y cancelar invitaciones pendientes.
- **Salir:** un miembro puede salir de una lista compartida; deja de verla.
- El dueño no puede salir de su propia lista; solo borrarla.
- La seguridad vive en las reglas de Firestore: solo dueño y miembros leen y escriben una lista y sus elementos; unirse solo es posible con un token válido, vigente y sin usar.

### F5. Captura rápida
- Campo de texto siempre visible arriba de la lista; Enter agrega el elemento y deja el foco en el campo para seguir agregando.
- Pestaña Comprar: nombre (obligatorio), cantidad (texto libre opcional, ej. "2 kg"), tienda.
  - Sin tienda elegida: la que ese producto tuvo la última vez en esa lista (`products.lastStoreName`); si es nuevo, la tienda default de quien lo agrega.
  - Autocompletado con productos ya usados en esa lista, sin distinguir mayúsculas ni acentos.
  - Si el producto ya está pendiente en la lista, no se duplica: se avisa y se resalta el existente.
- Pestaña Hacer: texto (obligatorio) y nota opcional.
- Editar y borrar elementos.
- Cambios de otros miembros se ven en vivo con la app abierta.
- Cada elemento muestra quién lo agregó y quién lo tachó/completó (foto o iniciales).

### F6. Tiendas
- Catálogo personal: crear, renombrar, borrar. Exactamente una es la default; se puede cambiar.
- No se puede borrar la default.
- El catálogo solo sirve para sugerir. Cada producto guarda únicamente el **nombre** de su tienda (`storeName`), así todos los miembros de una lista compartida ven la misma tienda aunque no esté en su catálogo.
- Renombrar o borrar una tienda del catálogo no toca productos existentes; conservan el nombre que tenían.
- Al elegir tienda para un producto se ofrecen: las tiendas del catálogo propio y las que ya aparecen en esa lista.

### F7. Modo super (pestaña Comprar)
- Filtro por tienda (chips: "Todas" y cada `storeName` distinto en la lista, agrupando sin distinguir mayúsculas ni acentos; "Walmart" de un miembro y "walmart" del otro son un solo chip).
- Tocar un producto lo tacha; tocarlo otra vez lo regresa a pendiente.
- Los tachados bajan al final, en gris.

### F8. Historial
- **Compras:** botón "Terminar compra" pasa todos los productos tachados (respetando el filtro de tienda activo) a un registro con fecha, quién la cerró y los productos. Los pendientes se quedan.
  - Desde una compra cerrada: volver a agregar uno o varios productos como pendientes.
- **Hacer:** al marcar una tarea como hecha se tacha; botón "Archivar hechos" (en la pestaña Hacer) las mueve al historial con fecha de completado.
- "Terminar compra" solo existe en la pestaña Comprar y "Archivar hechos" solo en Hacer; cada uno cierra solo elementos de su pestaña.
- Historial por lista, en orden de fecha descendente, con filtro Comprar / Hacer.

### F9. Revertir
1. Tachado o marcado por error → tocar de nuevo.
2. Compra cerrada o hechos archivados por error → aviso "Deshacer" durante 10 s; devuelve los elementos a la lista como tachados y borra el registro.
3. Detectado más tarde → en el historial, **regresar** un elemento a la lista como pendiente (sale del registro; si el registro queda vacío se borra), o **reabrir** una compra completa (sus productos vuelven como tachados y el registro se borra).

Diferencia con F8 "volver a agregar": volver a agregar **copia** el producto a la lista y deja el registro intacto (para comprarlo otra vez); regresar **corrige** un error y lo saca del registro. Regresar y reabrir revierten `timesPurchased` y `lastPurchasedAt` de los productos afectados. En los tres casos aplica la regla de no duplicar: si ya está pendiente en la lista, se resalta el existente.

### F10. Sin conexión
- La app instalada abre sin señal (service worker con el shell en caché).
- Firestore con persistencia offline: agregar, tachar y cerrar compra funcionan sin señal y se sincronizan al volver.
- Indicador discreto de "sin conexión / cambios pendientes".
- Conflictos:
  - Un documento por elemento, así que editar elementos distintos nunca choca.
  - Las escrituras actualizan solo los campos cambiados (`update`, no reemplazar el documento): si uno edita la cantidad y otro tacha el mismo producto, sobreviven ambos cambios.
  - Si dos cambian el mismo campo, gana el último, sin aviso. Aceptable.
  - Cambios rechazados al reconectar (ej. te sacaron de la lista mientras estabas sin señal): Firestore los revierte en pantalla y la app muestra "Algunos cambios no se guardaron porque ya no tienes acceso a esta lista".
  - La sincronización ocurre con la app abierta; lo hecho sin señal con la app cerrada queda en el celular y se envía al volver a abrirla.
  - Cerrar compra o archivar **no borra** los documentos de elementos: los marca `status: "closed"` con `historyId` y desaparecen de la vista. Así, una edición offline que llega después cae sobre un elemento cerrado y no revive un elemento fantasma. Regresar o reabrir vuelve a poner `status` en pendiente o hecho.

### F11. Exportar respaldo a Google Drive
- En Ajustes: "Exportar JSON" (categorías, tiendas, listas propias y compartidas a las que pertenece, elementos e historial) y "Exportar CSV" (elementos e historial).
- Los archivos se guardan en una carpeta **"tickoff"** en el Drive del usuario: `tickoff-YYYY-MM-DD.json`, `tickoff-elementos-YYYY-MM-DD.csv`, `tickoff-historial-YYYY-MM-DD.csv`. Si ya existe uno con ese nombre se agrega la hora (`-HHmm`).
- La primera vez Google pide permiso para Drive. El permiso es `drive.file`: la app solo ve los archivos y la carpeta que ella creó, no el resto del Drive.
- La carpeta se crea la primera vez y se reutiliza.
- Si Drive falla o no hay señal, se ofrece descargar los archivos al celular.
- Solo exportar en v1.

### F12. Actividad y avisos
- Cada acción de un miembro deja un registro en la bitácora de la lista, en la misma escritura que el cambio.
- Acciones que generan aviso: agregar, tachar/completar, terminar compra, archivar hechos, borrar elemento, alguien se unió, alguien salió. No generan aviso: editar cantidad/nota/tienda, mover de pestaña, destachar, deshacer.
- Solo cuenta la actividad de **otros**; lo propio no genera avisos.
- **Campana 🔔** en el encabezado: contador de avisos no leídos; al abrirla muestra la actividad de todas las listas del usuario, más reciente primero, agrupada (ej. "Ana agregó 5 elementos a Despensa · hace 2 h": misma persona, misma acción, misma lista, dentro de 30 min). Abrir la campana marca todo como leído. Tocar un aviso abre esa lista.
- **Al abrir la app:** si hay actividad de otros desde la última vez, aviso arriba por lista (ej. "Ana actualizó Despensa: 3 agregados, 2 tachados"); con más de 2 listas, un resumen "N listas con cambios".
- **Inicio:** punto de color en listas con actividad de otros posterior a la última vez que el usuario abrió esa lista.
- **Dentro de la lista:** elementos agregados por otros desde la última visita se resaltan unos segundos.
- Se guardan 30 días. Sin servidor que limpie, la app borra los registros de más de 30 días de una lista cuando alguien la abre.

## Pantallas

1. **Login** — "Entrar con Google".
2. **Inicio** — campana 🔔 en el encabezado, listas agrupadas por categoría (punto en las que tienen cambios), botón "Nueva lista". La app abre directo en la última lista usada (con el campo de captura listo); Inicio queda a un toque. Si esa lista ya no existe o ya no tiene acceso, abre Inicio.
3. **Lista** — campana en el encabezado, pestañas Comprar / Hacer, campo de captura, chips de tienda (solo Comprar), elementos pendientes y tachados, "Terminar compra" o "Archivar hechos" según la pestaña, acceso a historial y a compartir.
4. **Historial de lista** — registros y su detalle.
5. **Compartir / miembros** — link de invitación, miembros, invitaciones pendientes, salir.
6. **Unirse** — destino del link de invitación.
7. **Ajustes** — categorías, tiendas, exportar, cerrar sesión, versión.

Diseño mobile-first; en escritorio basta con que se vea bien centrado.

## Modelo de datos (Firestore)

```
users/{uid}
  displayName, photoURL, defaultStoreId, lastListId?, createdAt,
  notificationsReadAt?, driveFolderId?

users/{uid}/categories/{categoryId}
  name, icon, color, order

users/{uid}/stores/{storeId}
  name, createdAt

users/{uid}/listPrefs/{listId}
  categoryId?            // categoría personal para listas propias y compartidas
  lastTab: "buy" | "do"
  lastSeenAt?            // última vez que abrió la lista

lists/{listId}
  name,
  ownerId, memberIds[],                 // memberIds incluye al dueño
  members: { [uid]: { displayName, photoURL } },
  createdAt

lists/{listId}/invites/{token}
  createdBy, createdAt, expiresAt, usedBy?, usedAt?, revoked?,
  listName, ownerName, ownerPhotoURL   // copia para la pantalla Unirse

lists/{listId}/items/{itemId}
  kind: "buy" | "do",
  name, normalizedName,
  quantity?, storeName?,                // buy
  note?,                                // do
  status: "pending" | "done" | "closed",
  historyId?,                           // cuando status = "closed"
  addedBy, addedByName, doneBy?, doneByName?,
  createdAt, updatedAt

lists/{listId}/history/{entryId}
  kind: "purchase" | "archive",
  closedAt, closedBy, closedByName,
  items: [{ itemId, name, quantity?, storeName?, note?, addedByName, doneByName }]

lists/{listId}/activity/{activityId}
  type: "added" | "done" | "closed" | "archived" | "deleted" | "joined" | "left",
  actorUid, actorName, at,
  itemName?, count?        // count para cerrar/archivar

lists/{listId}/products/{normalizedName}   // solo buy; autocompletado
  name, lastStoreName?, lastPurchasedAt?, timesPurchased
```

- `normalizedName`: minúsculas, sin acentos, espacios colapsados.
- Nombres y fotos se copian a los registros (`*Name`, `members`) para que se sigan viendo aunque alguien salga de la lista.

## Decisiones tomadas por el usuario

- PWA con la última versión de React; versiones con mise y regla en `CLAUDE.md`.
- Login con Google.
- Sin backend propio; Firebase para sincronización en vivo.
- Compartir todo desde la app.
- Listas propias por categoría (despensa, trabajo, jardín…); se comparten solo las que el usuario elige.
- Cosas por comprar y por hacer conviven en la misma lista, separadas en pestañas.
- Sin notificaciones push en v1; recordatorios como feature opcional posterior.
- Sin fotos en v1.
- Respaldo exportado a una carpeta "tickoff" en Google Drive.
- Aviso cuando se rechazan cambios hechos sin señal.
- Avisos de actividad: campana, aviso al abrir, punto en Inicio y resaltado; guardados en Firebase 30 días.
- Catálogo de tiendas con una default.
- Historial con posibilidad de revertir.
- Nombre del proyecto: tickoff.

## Decisiones mías (revisar)

- Node 24 LTS, pnpm 12 (vía `npm:pnpm` en mise).
- Firebase Hosting para publicar.
- Pestaña activa = tipo del elemento nuevo; cada lista recuerda la última pestaña por usuario.
- Un elemento puede cambiar de pestaña al editarlo.
- Categorías y tiendas personales; la categoría de una lista compartida la elige cada miembro.
- Solo el dueño invita, saca miembros, renombra y borra; los miembros editan elementos.
- Invitación de un solo uso, vigencia 7 días, revocable.
- Datos iniciales: categorías Despensa/Trabajo/Jardín/Mascotas, tienda "Super", lista "Despensa".
- Cantidad como texto libre.
- "Terminar compra" respeta el filtro de tienda activo.
- Pendientes: tachar + "Archivar hechos" en lugar de archivar al instante.
- Autocompletado y tienda sugerida por lista.
- Exportar JSON y CSV; sin importar. Descarga local como respaldo si Drive falla.
- Bitácora de actividad por lista (no por destinatario); agrupación de avisos en ventanas de 30 min.
- Acciones que generan aviso (aprobadas por el usuario): agregar, tachar, terminar, archivar, borrar, unirse, salir.
- Miembros pueden hacer todas las acciones de elementos e historial (incluido deshacer y reabrir).
- Tiendas: los productos guardan solo el nombre; renombrar/borrar en el catálogo no toca productos; chips agrupan por nombre normalizado.
- Conflictos: escrituras por campo; mismo campo gana el último; cerrar marca elementos como `closed` en vez de borrarlos.
- "Regresar" saca el elemento del registro; "volver a agregar" lo copia.
- La app abre en la última lista usada.
- La invitación lleva copia del nombre de lista y dueño para la pantalla Unirse.

## A criterio del builder

- Librería de UI y estilos, router, manejo de estado.
- Estrategia de tests (se esperan tests de reglas de Firestore con el emulador y de la lógica de normalización, cierre y reversión).
- Ambientes de Firebase (uno o dev/prod) y manejo de variables `VITE_FIREBASE_*`.
- Iconos, colores, catálogo de íconos para categorías.
- Mecanismo exacto de reglas para validar tokens de invitación.
- Qué pasa si dos miembros cierran la misma compra sin señal (aceptable: dos registros).
- Borrado en cascada de una lista desde el cliente (subcolecciones) dentro de los límites de Spark.
