# UP News — Backend

Backend del proyecto **UP News** (Proyecto Integrador, Grupo 1) para la Fundación Asisco Up.

- **API pública** (solo lectura) para que la página web muestre las noticias.
- **Bot de Telegram** integrado y API REST de gestión para clientes web autenticados.
- **Autenticación web** validada por el backend principal y autenticación de Telegram para el bot/Mini App.
- Base de datos **propia de UP News** en Supabase (PostgreSQL) con Prisma 7.

Arquitectura limpia por módulos: **controller → dto → mapper → entity → repository → service**.
La explicación completa está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

---

## 1. Requisitos

- Node.js **22.12.0 o superior** (`node -v`). La versión recomendada está fijada en `.node-version`.
- La contraseña de la base de UP News (se comparte por canal privado; **nunca** se sube al repositorio).
- Para el bot: un token creado con [@BotFather](https://t.me/BotFather).

## 2. Instalar

```bash
npm install
```

## 3. Configurar `.env`

Copie `.env.example` como `.env` y edite:

| Variable | Qué poner |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Reemplazar `[REF]`, `[REGION]` y `[PASSWORD]` por valores reales. Si la contraseña tiene `@ # % / :`, codificarla (`@` → `%40`). |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → `anon` `public`. |
| `AUTH_PERFIL_URL` | Endpoint que valida el token web (por defecto `https://proyecto-asiscoup-g1.onrender.com/api/auth/perfil`). |
| `TELEGRAM_BOT_TOKEN` | Token de @BotFather. Si se deja vacío, la API funciona y el bot queda apagado. |
| `TELEGRAM_WEBHOOK_SECRET` | Solo para producción. Generar con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `PUBLIC_URL` | Solo en producción (URL HTTPS de Render). Vacío = el bot usa *long polling* en local. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Credenciales del backend de Cloudinary. Si se configuran, las tres son obligatorias. Se pueden usar para subidas web sin configurar Telegram; el secreto nunca se envía al frontend. |
| `CLOUDINARY_UPLOAD_FOLDER` | Carpeta de Cloudinary para imágenes (por defecto `upnews`). |

`.env.example` es la plantilla sin secretos que sí se sube.
El login TMA se habilita con `TELEGRAM_BOT_TOKEN`. Las subidas de imágenes web requieren Cloudinary y un token web autorizado. Mini App también requiere sus credenciales de Cloudinary.

## 4. Crear las tablas (una sola vez por cambio de esquema)

```bash
npm run generate          # genera el cliente de Prisma en src/generated/prisma
npm run db:migrate -- --name init   # crea una migración y las tablas (usa DIRECT_URL)
```

Después, en **Supabase → SQL Editor**, ejecutar [prisma/sql/seguridad-supabase.sql](prisma/sql/seguridad-supabase.sql)
(activa RLS para que la `anon key` del frontend solo pueda **leer** noticias publicadas, y habilita Realtime).

Cargar el acceso de la primera directora del bot:

```bash
npm run db:inicializar -- <telegramId> "Nombre de la directora"
```

> El `telegramId` se obtiene enviando `/miid` al bot.

## 5. Ejecutar

```bash
npm run check:config   # verifica .env, conexión y tablas
npm run dev            # http://127.0.0.1:3000
```

| Endpoint | Descripción |
|---|---|
| `GET /api-docs` | Documentación Swagger (probar los endpoints desde el navegador) |
| `GET /health` | Estado del servidor y la base |
| `GET /api/publicaciones?pagina=1&limite=10&etiqueta=salud` | Noticias aprobadas y activas, más recientes primero |
| `GET /api/publicaciones/historico?pagina=1&limite=10&etiqueta=Salud&busqueda=actividad` | Histórico de aprobadas, activas o inactivas; filtros por etiqueta y título |
| `GET /api/publicaciones/etiquetas` | Etiquetas de las noticias publicadas (filtros de la web) |
| `GET /api/publicaciones/:id` | Una noticia aprobada, incluso inactiva (incluye `imagenUrl`) |
| `GET /api/contacto` | Información de contacto de la fundación (pública, para el pie de página) |
| `POST /api/gestion/upload-signature` | Firma una subida directa a Cloudinary para la web; requiere `Authorization: Bearer <token>` |
| `POST /api/miniapp/upload-signature` | Firma una subida para una Mini App autenticada con `X-Telegram-Init-Data` |
| `POST /api/miniapp/publicaciones` | Guarda una noticia de Mini App (borrador o pendiente) y enlaza su imagen |
| `POST /api/auth/telegram-login` | Valida `{ "initData": "..." }` y confirma el acceso del usuario autorizado |
| `GET, POST, PATCH, DELETE /api/gestion/publicaciones...` | CRUD, aprobación y activación; requiere `Authorization: Bearer <token>` con rol `ADMIN` o `TALLERISTA` |
| `POST /api/gestion/publicaciones/:id/enviar` | El autor envía su borrador a aprobación |
| `POST /api/gestion/publicaciones/:id/aprobar-y-activar` | Aprueba y activa directamente en una acción (solo directora) |
| `GET, POST, PATCH, DELETE /api/gestion/usuarios...` | Gestión de colaboradores (solo directora); DELETE desactiva para preservar el historial |
| `GET, POST, PATCH, DELETE /api/gestion/contactos...` | Gestión de información de contacto tipada (solo directora) |
| `POST /telegram/webhook` | Solo Telegram (protegido con `TELEGRAM_WEBHOOK_SECRET`) |

Cada solicitud a `/api/gestion/*` valida el token Bearer con `AUTH_PERFIL_URL`; un token ya validado se reutiliza durante 60 s (se guarda solo su hash) para no depender del backend principal en cada petición. Solo se aceptan los roles `ADMIN` (equivale a `DIRECTORA`) y `TALLERISTA` (equivale a `COLABORADOR`); los demás roles reciben 403. El token inválido o expirado recibe 401. El ID externo se asocia a un usuario local para conservar la autoría de las publicaciones. `/api/miniapp/*` y el bot siguen autenticándose con Telegram; la API `/api/publicaciones` permanece pública y de solo lectura.

### Consumo desde navegador

Las rutas de gestión requieren `Authorization: Bearer <token>` en cada petición; el backend vuelve a validar el token consultando `AUTH_PERFIL_URL`. Las respuestas de autenticación mantienen el formato `{ "error": "...", "codigo": "NO_AUTORIZADO" }` (401 para token ausente/inválido/expirado, 403 para rol no permitido).

**Noticias públicas (sin token):**

| Método y ruta | Body / parámetros | Qué hace |
|---|---|---|
| `GET /api/publicaciones` | Query opcional: `pagina`, `limite` (máx. 50), `etiqueta` | Lista noticias publicadas y activas, paginadas. |
| `GET /api/publicaciones/historico` | Query opcional: `pagina`, `limite` (máx. 50), `etiqueta`, `busqueda` | Lista aprobadas activas o inactivas; `busqueda` coincide con el título. |
| `GET /api/publicaciones/etiquetas` | Sin body | Devuelve etiquetas disponibles para filtros. |
| `GET /api/publicaciones/:id` | `id` UUID en la ruta | Devuelve una noticia aprobada, también si está inactiva. |

Las etiquetas válidas son `Comunidad`, `Eventos`, `Salud` y `Consejos`. Los propósitos válidos son `Informar a la comunidad`, `Educar y compartir conocimientos`, `Promover la salud y el bienestar`, `Invitar a participar en actividades`, `Sensibilizar sobre una causa` y `Compartir recursos y conocimiento`.

**Gestión desde navegador (Bearer requerido):**

| Método y ruta | Body | Qué hace |
|---|---|---|
| `GET /api/gestion/publicaciones` | Sin body | Lista noticias gestionables: ADMIN ve todas; TALLERISTA ve todas las suyas (solo puede editar o borrar sus borradores). |
| `POST /api/gestion/upload-signature` | Sin body | Devuelve parámetros firmados para subir directamente un archivo de imagen a Cloudinary. |
| `POST /api/gestion/publicaciones` | `{ "titulo": "...", "cuerpo": "...", "resumen?": "...", "proposito?": "...", "etiqueta?": "...", "estado?": "BORRADOR", "imagenUrl?": "https://..." }` | Crea una noticia como borrador o pendiente de aprobación. |
| `GET /api/gestion/publicaciones/:id` | `id` UUID en la ruta | Obtiene una noticia y sus datos internos si el actor tiene acceso. |
| `PATCH /api/gestion/publicaciones/:id` | Cualquier combinación no vacía de `titulo`, `resumen`, `cuerpo`, `proposito`, `etiqueta`, `imagenUrl` | Edita una noticia según rol y autoría. |
| `DELETE /api/gestion/publicaciones/:id` | Sin body | Elimina una noticia gestionable. |
| `POST /api/gestion/publicaciones/:id/aprobar` | Sin body | ADMIN aprueba la noticia; queda inactiva hasta activarla. |
| `POST /api/gestion/publicaciones/:id/aprobar-y-activar` | Sin body | ADMIN aprueba y activa la noticia en una acción. |
| `PATCH /api/gestion/publicaciones/:id/activacion` | `{ "estaActivo": true }` o `{ "estaActivo": false }` | ADMIN activa o desactiva una noticia aprobada. |
| `GET /api/gestion/usuarios` | Sin body | ADMIN lista usuarios autorizados. |
| `POST /api/gestion/usuarios` | `{ "nombre": "...", "telegramId": "123456" }` | ADMIN registra un colaborador de Telegram. Los usuarios web se asocian automáticamente al validar su perfil; no se registran por esta ruta. |
| `PATCH /api/gestion/usuarios/:id` | `{ "nombre?": "...", "activo?": true }` | ADMIN modifica el nombre o reactiva/desactiva un colaborador. |
| `DELETE /api/gestion/usuarios/:id` | Sin body | ADMIN desactiva al colaborador, conservando el historial. |
| `GET /api/gestion/contactos` | Sin body | ADMIN lista la información de contacto. |
| `POST /api/gestion/contactos` | `{ "nombre": "...", "tipo": "RED_SOCIAL", "informacion": "..." }` | ADMIN crea un contacto. Tipos: `RED_SOCIAL`, `NUMERO_CONTACTO`, `DIRECCION`. |
| `PATCH /api/gestion/contactos/:id` | `{ "nombre": "...", "tipo": "...", "informacion": "..." }` | ADMIN reemplaza los datos del contacto indicado. |
| `DELETE /api/gestion/contactos/:id` | Sin body | ADMIN elimina el contacto. |

**Flujo de subida:** solicita la firma con `POST /api/gestion/upload-signature` y el token Bearer. Envía el archivo directamente a Cloudinary usando los valores devueltos (`cloudName`, `apiKey`, `timestamp`, `signature`, `folder`, `publicId`, `overwrite`). Cloudinary devuelve la URL segura de la imagen; envíala después como `imagenUrl` al crear o editar la publicación. No envíes el archivo ni el secreto de Cloudinary a este backend.

### Frontend

El frontend consume estos endpoints. En local: backend en `:3000` y Vite en `:5173`
(ya incluido en `CORS_ORIGINS`). La Mini App usa `VITE_API_URL=http://localhost:3000`.

### Comandos del bot

| Comando | Quién |
|---|---|
| `/start`, `/ayuda`, `/miid` | Cualquiera |
| `/nueva Título \| Cuerpo \| etiqueta` | Autorizados (crea borrador) |
| `/enviar <id>` | Autor del borrador (lo manda a aprobación) |
| `/publicar <id>`, `/archivar <id>`, `/pendientes` | Directora |
| `/ultimas` | Autorizados |
| `/autorizar <telegramId> <ROL> <nombre>`, `/revocar <telegramId>`, `/usuarios` | Directora |

## 6. Scripts

| Script | Uso |
|---|---|
| `npm run dev` | Desarrollo con recarga automática |
| `npm test` | Pruebas unitarias (no necesitan base de datos) |
| `npm run typecheck` | Revisión de tipos |
| `npm run build` / `npm start` | Compilar y ejecutar en producción |
| `npm run db:migrate` | Crear una migración nueva tras cambiar `schema.prisma` |
| `npm run db:deploy` | Aplicar migraciones existentes (producción) |
| `npm run db:studio` | Ver/editar datos en el navegador |

## 7. Despliegue en Render

`render.yaml` define el servicio (Blueprint). En Render completar `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `CORS_ORIGINS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y `PUBLIC_URL`
(la URL `https://...onrender.com` del servicio). Al arrancar, el backend registra el webhook en Telegram.

## 8. Reglas del equipo

- No subir `.env`, `node_modules`, `src/generated` ni `dist`.
- La contraseña de la base da acceso total: solo por canal privado.
- Todo módulo nuevo sigue la estructura de `src/modules/publicacion` (ver checklist en `docs/ARQUITECTURA.md`).
