# Arquitectura de UP News Backend

## Idea central

Cada archivo tiene **una sola responsabilidad**, y las dependencias apuntan **hacia adentro**:
las reglas del negocio (entity) no conocen Express, Prisma ni Telegram. Así podemos cambiar
cómo entra una petición (HTTP, bot) o dónde se guarda (Prisma, otra base) sin tocar las reglas.

```
            ENTRADAS                       NEGOCIO                     INFRAESTRUCTURA
 ┌──────────────────────────┐   ┌───────────────────────────┐   ┌────────────────────────────┐
 │ rutas  → controller (HTTP)│──▶│ service  ──▶  entity       │   │ prisma.repository          │
 │ comandos del bot (Telegram)│  │    │  usa la interfaz        │◀──│ (implementa la interfaz)   │
 └──────────────────────────┘   │    ▼                        │   │        │ usa mapper         │
            │ valida con dto     │ repository (interfaz)       │   │        ▼                    │
            ▼                    └───────────────────────────┘   │ Prisma → Supabase Postgres │
        mapper → DTO respuesta                                    └────────────────────────────┘
```

## Estructura de carpetas

```
src/
├── server.ts            # Punto de entrada: verifica la base, levanta HTTP y el bot
├── app.ts               # Arma Express (configuración base + rutas + errores). Recibe dependencias por parámetro
├── rutas/               # TODAS las rutas HTTP en un solo lugar (+ comentarios @openapi para Swagger)
│   ├── index.ts         # Monta todo: /health, /api-docs, /telegram/webhook, /api/...
│   ├── publicacion.rutas.ts
│   ├── miniapp.rutas.ts
│   ├── salud.rutas.ts
│   └── docs.rutas.ts    # Swagger UI
├── docs/swagger.ts      # Definición OpenAPI (info, servidores, esquemas reutilizables)
├── contenedor.ts        # Composition root: crea repositories → services → controllers/bot
├── config/
│   ├── env.ts           # Lee y valida .env con Zod (falla al arrancar si falta algo)
│   ├── prisma.ts        # Cliente Prisma con @prisma/adapter-pg
│   └── supabase.ts      # Cliente supabase-js (Storage)
├── generated/prisma/    # Cliente generado por Prisma (NO se sube a git)
├── shared/
│   ├── domain/          # Errores de dominio, Actor/roles, paginación
│   ├── http/middlewares # Traducción de errores de dominio a HTTP
│   └── validacion.ts    # validar(esquemaDto, datos)
└── modules/
    ├── publicacion/     # ← MÓDULO DE REFERENCIA (copiar este patrón)
    ├── almacenamiento/  # Puerto de almacenamiento y adaptador de Cloudinary
    ├── miniapp/         # Casos de uso y controller HTTP de la Mini App
    ├── usuario-autorizado/  # Identidades locales asociadas a Telegram o al usuario web
    ├── auth/                # Validación de tokens web contra el backend principal
    └── telegram/        # Bot: es otra "entrada", como un controller
```

## Las capas, archivo por archivo (módulo `publicacion`)

| Archivo | Responsabilidad | Puede importar | NO debe |
|---|---|---|---|
| `publicacion.entity.ts` | Reglas de negocio: quién publica, qué estados existen, qué es válido | `shared/domain` | importar Express, Prisma, Zod, Telegram |
| `publicacion.dto.ts` | Forma de entrada (esquemas Zod) y de salida (interfaces de respuesta) | Zod, tipos de la entity | tener lógica |
| `publicacion.mapper.ts` | Convertir fila de Prisma ⇄ entity → DTO | entity, dto, *tipos* de Prisma | consultar la base |
| `publicacion.repository.ts` | **Interfaz**: qué operaciones de persistencia necesita el service | entity | depender de Prisma |
| `publicacion.prisma.repository.ts` | Implementación de la interfaz con Prisma | Prisma, mapper | tener reglas de negocio |
| `publicacion.service.ts` | Casos de uso: cargar → pedir a la entity que actúe → guardar → responder DTO | interfaces de repository, entity, mapper, dto | importar Prisma o Express |
| `publicacion.controller.ts` | HTTP: `req` → DTO validado → service → `res.json` | service, dto | tener reglas o consultas |
| `src/rutas/publicacion.rutas.ts` | URL + método → método del controller, y su documentación `@openapi` | controller | tener lógica |

### Recorrido de una petición

`GET /api/publicaciones?pagina=2`

1. **rutas** (`src/rutas/publicacion.rutas.ts`) dirige a `controller.listar`.
2. **controller** valida `req.query` con `listarPublicacionesDto` → `{ pagina: 2, limite: 10 }`.
3. **service** llama a `repository.listarPublicadas(...)` (la interfaz).
4. **prisma.repository** consulta la base y convierte cada fila en entity con el **mapper**.
5. **service** convierte las entities en `PublicacionPublicaDto` con el **mapper** (sin estado ni autor).
6. **controller** responde `res.json(...)`.

Si algo falla, la capa interna lanza un **error de dominio** (`NoEncontradoError`, `ReglaDeNegocioError`...)
y el middleware `manejadorErrores` lo convierte en 404, 409, etc. El bot hace lo mismo en `bot.catch`.

### Recorrido de un comando del bot

`/publicar 0193...`

1. Telegram llama a `POST /telegram/webhook` (o el bot lo recibe por long polling en local).
2. **telegram.autenticacion** busca `ctx.from.id` en `usuario_autorizado` → pone `ctx.actor`.
3. **comandos/publicaciones** valida el id con `idPublicacionDto` y llama a `service.publicar(id, actor)`.
4. **entity** verifica que el actor sea la directora y que el estado lo permita.
5. **repository** guarda; Supabase Realtime avisa al frontend.

## Autenticación

- Telegram pone `from.id` en cada mensaje; no se puede falsificar si el webhook exige `secret_token`.
- `usuario_autorizado.telegram_id` (BIGINT, opcional) identifica las cuentas autorizadas para Telegram.
- La Mini App valida criptográficamente `initData` con el token del bot, limita su antigüedad a 24 horas y verifica la lista blanca antes de firmar una subida o crear un borrador.
- La validación entrega también el `Actor { id, nombre, rol }`; el frontend elige su vista por rol, pero el backend vuelve a validar el rol en cada operación.
- Los endpoints `/api/gestion/*` requieren `Authorization: Bearer <token>`. Cada petición consulta `AUTH_PERFIL_URL`; nunca se confía en un rol enviado por el frontend.
- Los roles externos `ADMIN` y `TALLERISTA` se traducen a `DIRECTORA` y `COLABORADOR`. El `id_usuario` externo se guarda en `usuario_autorizado.id_usuario_externo`, que permite conservar las relaciones actuales de autoría. Las cuentas web no necesitan ID de Telegram.
- `/api/miniapp/*`, Telegram y `/api/publicaciones` pública conservan su comportamiento actual.
- Cloudinary se firma en el backend; el navegador recibe solo los parámetros públicos de subida y la firma temporal. La imagen y el borrador se asocian en una transacción.
- Los services reciben un `Actor { id, nombre, rol }`; no saben de dónde salió.
- Si otro frontend necesita autenticación no basada en Telegram, se agrega una nueva forma de obtener el `Actor` sin tocar services ni entities.

## Reglas de negocio actuales (propuesta, ajustar con el equipo)

- Las publicaciones nuevas pueden quedar como `BORRADOR` o `PENDIENTE_APROBACION`; nunca como aprobadas desde el formulario.
- Los colaboradores pueden consultar y editar únicamente sus borradores.
- Solo `DIRECTORA` puede aprobar, archivar o activar/desactivar publicaciones.
- Una noticia aprobada queda en `PUBLICADA`, pero invisible en la API pública hasta que la directora la active (`esta_activo = true`).
- Una publicación `ARCHIVADA` no se edita.
- El listado de Inicio muestra noticias `PUBLICADA` y activas; `/api/publicaciones/historico` incluye todas las `PUBLICADA`, activas o inactivas. Ambos ocultan datos internos (autor, estado).
- La gestión de usuarios es de colaboradores; su eliminación se implementa como desactivación para conservar el historial.
- La información de contacto se guarda con nombre, tipo (`RED_SOCIAL`, `NUMERO_CONTACTO`, `DIRECCION`) e información.

## Checklist para un módulo nuevo (ej. `contacto`)

1. Modelo en `prisma/schema.prisma` → `npm run db:migrate -- --name contacto` → re-ejecutar `prisma/sql/seguridad-supabase.sql`.
2. `src/modules/contacto/`:
   - `contacto.entity.ts` — reglas (ej. validar formato de teléfono/URL).
   - `contacto.dto.ts` — esquemas Zod de entrada + interfaces de salida.
   - `contacto.mapper.ts` — fila ⇄ entity → DTO.
   - `contacto.repository.ts` — interfaz.
   - `contacto.prisma.repository.ts` — implementación.
   - `contacto.service.ts` — casos de uso, recibe `Actor`.
   - `contacto.controller.ts` — si la web necesita leerlo.
3. Registrar en `src/contenedor.ts` (repository → service → controller).
4. Crear `src/rutas/contacto.rutas.ts` (con sus comentarios `@openapi`) y montarlo en `src/rutas/index.ts` (`api.use("/contacto", ...)`); y/o comandos en `src/modules/telegram/comandos/`.
5. Pruebas en `tests/contacto/` usando un repositorio en memoria (ver `tests/apoyo/fakes.ts`).

## Pendientes conocidos

- Completar `evidencia` para videos y verificación de consentimiento, y `metrica`.
- Cambiar los comandos de una línea por formularios paso a paso (`@grammyjs/conversations`) y botones en lugar de escribir UUIDs.
- Componente o estilo de presentación de cada noticia (mencionado en el alcance): definir si es un campo de `publicacion`.
