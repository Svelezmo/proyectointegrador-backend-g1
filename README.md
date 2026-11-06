# UP News — Backend

Backend del proyecto **UP News** (Proyecto Integrador, Grupo 1) para la Fundación Asisco Up.

- **API pública** (solo lectura) para que la página web muestre las noticias.
- **Bot de Telegram** integrado y API REST de gestión para clientes web autenticados.
- **Autenticación por ID de Telegram** (lista blanca) — sin JWT ni registro público.
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
| `TELEGRAM_BOT_TOKEN` | Token de @BotFather. Si se deja vacío, la API funciona y el bot queda apagado. |
| `TELEGRAM_WEBHOOK_SECRET` | Solo para producción. Generar con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `PUBLIC_URL` | Solo en producción (URL HTTPS de Render). Vacío = el bot usa *long polling* en local. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Credenciales del backend de Cloudinary. Si se configuran, las tres son obligatorias y también se requiere `TELEGRAM_BOT_TOKEN`. El secreto nunca se envía al frontend. |
| `CLOUDINARY_UPLOAD_FOLDER` | Carpeta de Cloudinary para imágenes (por defecto `upnews`). |

`.env.example` es la plantilla sin secretos que sí se sube.
El login TMA se habilita con `TELEGRAM_BOT_TOKEN`. Los endpoints de Mini App que suben imágenes requieren además las tres credenciales de Cloudinary.

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
| `GET /api/publicaciones/etiquetas` | Etiquetas de las noticias publicadas (filtros de la web) |
| `GET /api/publicaciones/:id` | Una noticia publicada |
| `POST /api/miniapp/upload-signature` | Firma una subida para una Mini App autenticada con `X-Telegram-Init-Data` |
| `POST /api/miniapp/publicaciones` | Guarda una noticia de Mini App (borrador o pendiente) y enlaza su imagen |
| `POST /api/auth/telegram-login` | Valida `{ "initData": "..." }` y confirma el acceso del usuario autorizado |
| `GET, POST, PATCH, DELETE /api/gestion/publicaciones...` | CRUD, aprobación y activación; requiere `X-Telegram-Init-Data` validado |
| `POST /api/gestion/publicaciones/:id/aprobar-y-activar` | Aprueba y activa directamente en una acción (solo directora) |
| `GET, POST, PATCH, DELETE /api/gestion/usuarios...` | Gestión de colaboradores (solo directora); DELETE desactiva para preservar el historial |
| `GET, POST, PATCH, DELETE /api/gestion/contactos...` | Gestión de información de contacto tipada (solo directora) |
| `POST /telegram/webhook` | Solo Telegram (protegido con `TELEGRAM_WEBHOOK_SECRET`) |

El endpoint de login devuelve el actor y su rol. La sesión es stateless; no emite JWT ni crea una sesión persistida. Las operaciones de Mini App y REST de gestión verifican `initData` firmado por Telegram en cada solicitud. La API REST puede consumirse desde un cliente web que pueda aportar ese `initData`; no está expuesta sin autenticación.

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
