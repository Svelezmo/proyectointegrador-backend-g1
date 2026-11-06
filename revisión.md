# Revisión técnica del backend UP News

**Fecha de revisión:** 1 de noviembre de 2026
**Alcance:** estructura, responsabilidades, flujo de información, capacidades implementadas y pruebas disponibles.

## 1. Resumen ejecutivo

UP News es un backend en Node.js y TypeScript que combina dos entradas:

1. Una API HTTP pública de **solo lectura** para que la web consulte noticias publicadas.
2. Un bot de Telegram para que las personas autorizadas creen borradores, los envíen a aprobación, publiquen o archiven noticias y administren la lista de usuarios.

La aplicación usa Express 5, Zod para validar entradas, Prisma 7 para persistencia en PostgreSQL alojado en Supabase y grammY para el bot. Su estructura separa el dominio de HTTP, Telegram y la base de datos. El arranque y el despliegue están preparados para Render.

**Estado funcional:** están implementados los módulos de publicaciones y usuarios autorizados. El esquema de base de datos también incluye contacto, evidencias y métricas, pero esas áreas todavía no tienen casos de uso conectados.

## 2. Arquitectura y flujo de información

### Capas

```text
HTTP / Telegram
       ↓
Rutas HTTP / comandos del bot
       ↓
Controller HTTP / middleware de autenticación
       ↓
Service (casos de uso)
       ↓
Entity (reglas de negocio) ←→ Repository (contrato)
                                  ↓
                       Repository Prisma → PostgreSQL
```

- **Entradas:** las rutas expresan el contrato HTTP; los comandos de Telegram interpretan mensajes.
- **Validación:** los DTO con Zod convierten y validan datos externos antes de invocar los casos de uso.
- **Negocio:** services coordinan los casos de uso y entities hacen cumplir permisos, estados y reglas.
- **Persistencia:** los services dependen de interfaces de repository; los repositories Prisma consultan y guardan datos.
- **Salida:** mappers transforman entidades en DTO. El DTO público de noticias omite estado, autor y aprobador.
- **Errores:** errores de dominio se traducen a códigos HTTP o mensajes del bot.

### Flujo de lectura de una noticia

1. La web llama `GET /api/publicaciones`, `GET /api/publicaciones/etiquetas` o `GET /api/publicaciones/:id`.
2. Express aplica CORS y límite de solicitudes; el controller valida parámetros y delega al service.
3. El repository consulta solo publicaciones en estado `PUBLICADA`.
4. El service convierte las entidades en respuestas públicas; una noticia no publicada se trata como no encontrada.
5. El cliente recibe JSON. El listado permite paginación y filtro de etiqueta sin distinguir mayúsculas.

### Flujo de publicación por Telegram

1. En desarrollo el bot recibe mensajes mediante long polling; con `PUBLIC_URL` y `TELEGRAM_WEBHOOK_SECRET` configurados registra un webhook HTTPS.
2. `/start`, `/ayuda` y `/miid` se atienden sin autorización. Los comandos restantes requieren chat privado y un usuario activo en la lista blanca.
3. El middleware obtiene el ID asignado por Telegram y construye un `Actor` con identidad y rol.
4. El comando interpreta y valida los argumentos, y llama al service correspondiente.
5. La entidad aplica permisos y transición de estado; el repository guarda el resultado con Prisma.
6. El bot responde en Telegram. La publicación pasa a ser visible en la API al quedar en estado `PUBLICADA`.

### Arranque del servidor

`server.ts` carga configuración validada, crea la aplicación Express, comprueba conectividad con PostgreSQL, inicializa el bot si hay token y finalmente escucha en el puerto configurado. Ante señales de apagado, detiene el bot y cierra Prisma. `GET /health` prueba también la conectividad con la base.

## 3. Carpetas, archivos y responsabilidades

### Raíz y documentación

| Archivo | Responsabilidad |
|---|---|
| [`README.md`](./README.md) | Instalación, variables de entorno, comandos, endpoints y despliegue. |
| [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md) | Explica las capas, los recorridos y el patrón para agregar módulos. |
| [`revisión.md`](./revisión.md) | Este inventario y evaluación del estado actual. |
| [`package.json`](./package.json) | Dependencias y comandos de desarrollo, pruebas, compilación y Prisma. |
| [`package-lock.json`](./package-lock.json) | Versiones exactas resueltas por npm. |
| [`.env.example`](./.env.example) | Plantilla de configuración local; contiene marcadores, no credenciales válidas. |
| [`.node-version`](./.node-version) | Fija Node.js 22.12.0 como versión recomendada. |
| [`.gitignore`](./.gitignore) | Excluye dependencias, secretos, cliente generado y artefactos de compilación. |
| [`tsconfig.json`](./tsconfig.json) | Configuración TypeScript estricta para la aplicación y herramientas. |
| [`tsconfig.build.json`](./tsconfig.build.json) | Limita la compilación de producción a `src/`. |
| [`prisma.config.ts`](./prisma.config.ts) | Configura Prisma CLI y utiliza `DIRECT_URL` para migraciones. |
| [`render.yaml`](./render.yaml) | Define el servicio Render, build, despliegue de migraciones y health check. |

### `src/`: aplicación

| Archivo o carpeta | Responsabilidad |
|---|---|
| [`src/server.ts`](./src/server.ts) | Punto de entrada: conexión, configuración del webhook/polling, escucha y apagado ordenado. |
| [`src/app.ts`](./src/app.ts) | Configura Express (JSON, proxy, rutas y middlewares de errores); recibe dependencias. |
| [`src/contenedor.ts`](./src/contenedor.ts) | Composition root: instancia repositories, services, controller y bot. |
| [`src/config/env.ts`](./src/config/env.ts) | Lee `.env`, valida variables con Zod y aplica reglas dependientes del entorno. |
| [`src/config/prisma.ts`](./src/config/prisma.ts) | Crea el cliente Prisma con el adaptador PostgreSQL y expone la prueba de conexión. |
| [`src/config/supabase.ts`](./src/config/supabase.ts) | Crea opcionalmente un cliente Supabase; hoy no hay un flujo de Storage que lo consuma. |
| [`src/docs/swagger.ts`](./src/docs/swagger.ts) | Define OpenAPI y descubre las anotaciones de las rutas. |
| [`src/rutas/index.ts`](./src/rutas/index.ts) | Monta health, Swagger, webhook opcional y API pública con CORS y rate limit. |
| [`src/rutas/publicacion.rutas.ts`](./src/rutas/publicacion.rutas.ts) | Asocia endpoints GET de publicaciones y sus anotaciones OpenAPI. |
| [`src/rutas/salud.rutas.ts`](./src/rutas/salud.rutas.ts) | Expone el estado de servicio/base de datos en `/health`. |
| [`src/rutas/docs.rutas.ts`](./src/rutas/docs.rutas.ts) | Expone Swagger UI en `/api-docs` y OpenAPI JSON en `/api-docs.json`. |
| [`src/shared/validacion.ts`](./src/shared/validacion.ts) | Ejecuta esquemas Zod y normaliza fallos como error de dominio. |
| [`src/shared/domain/actor.ts`](./src/shared/domain/actor.ts) | Define roles, identidad neutral del actor y capacidad de aprobar/publicar. |
| [`src/shared/domain/errores.ts`](./src/shared/domain/errores.ts) | Define errores de validación, autorización, ausencia y regla de negocio. |
| [`src/shared/domain/paginacion.ts`](./src/shared/domain/paginacion.ts) | Tipos comunes para paginación y resultados paginados. |
| [`src/shared/http/middlewares/manejador-errores.ts`](./src/shared/http/middlewares/manejador-errores.ts) | Traduce errores de dominio y de Express a respuestas HTTP. |

### `src/modules/publicacion/`

| Archivo | Responsabilidad |
|---|---|
| [`publicacion.entity.ts`](./src/modules/publicacion/publicacion.entity.ts) | Estados, validaciones de contenido y reglas de edición, aprobación, publicación y archivo. |
| [`publicacion.dto.ts`](./src/modules/publicacion/publicacion.dto.ts) | Esquemas Zod de entrada y formas de respuesta pública e interna. |
| [`publicacion.mapper.ts`](./src/modules/publicacion/publicacion.mapper.ts) | Convierte entre fila Prisma, entidad y DTO. |
| [`publicacion.repository.ts`](./src/modules/publicacion/publicacion.repository.ts) | Contrato de persistencia que necesita el service. |
| [`publicacion.prisma.repository.ts`](./src/modules/publicacion/publicacion.prisma.repository.ts) | Implementa lecturas, filtros, paginación y guardado con Prisma. |
| [`publicacion.service.ts`](./src/modules/publicacion/publicacion.service.ts) | Casos de uso públicos e internos; coordina entidad y repository. |
| [`publicacion.controller.ts`](./src/modules/publicacion/publicacion.controller.ts) | Adapta solicitudes HTTP a DTOs/services y responde JSON. |

### `src/modules/`

| Archivo o carpeta | Responsabilidad |
|---|---|
| [`usuario-autorizado/usuario-autorizado.entity.ts`](./src/modules/usuario-autorizado/usuario-autorizado.entity.ts) | Entidad de la lista blanca; activa/desactiva, cambia rol y produce un `Actor`. |
| [`usuario-autorizado/usuario-autorizado.dto.ts`](./src/modules/usuario-autorizado/usuario-autorizado.dto.ts) | Valida IDs de Telegram, roles y nombres; define el DTO de usuario. |
| [`usuario-autorizado/usuario-autorizado.mapper.ts`](./src/modules/usuario-autorizado/usuario-autorizado.mapper.ts) | Convierte usuario entre Prisma, entidad y DTO. |
| [`usuario-autorizado/usuario-autorizado.repository.ts`](./src/modules/usuario-autorizado/usuario-autorizado.repository.ts) | Contrato de persistencia de usuarios autorizados. |
| [`usuario-autorizado/usuario-autorizado.prisma.repository.ts`](./src/modules/usuario-autorizado/usuario-autorizado.prisma.repository.ts) | Implementa persistencia, búsqueda por Telegram ID y listado. |
| [`usuario-autorizado/usuario-autorizado.service.ts`](./src/modules/usuario-autorizado/usuario-autorizado.service.ts) | Autentica usuarios y permite que la directora autorice, revoque y liste. |
| [`telegram/telegram.bot.ts`](./src/modules/telegram/telegram.bot.ts) | Construye el bot, registra middleware/comandos y traduce errores para el chat. |
| [`telegram/telegram.contexto.ts`](./src/modules/telegram/telegram.contexto.ts) | Extiende el contexto grammY con el actor y utilidades para argumentos. |
| [`telegram/telegram.autenticacion.ts`](./src/modules/telegram/telegram.autenticacion.ts) | Restringe comandos protegidos a chats privados y usuarios autorizados activos. |
| [`telegram/telegram.iniciar.ts`](./src/modules/telegram/telegram.iniciar.ts) | Configura webhook Express con secreto o long polling y el menú del bot. |
| [`telegram/comandos/publicos.ts`](./src/modules/telegram/comandos/publicos.ts) | Implementa `/start`, `/ayuda` y `/miid`. |
| [`telegram/comandos/publicaciones.ts`](./src/modules/telegram/comandos/publicaciones.ts) | Implementa creación, envío a aprobación, publicación, archivo y listados. |
| [`telegram/comandos/usuarios.ts`](./src/modules/telegram/comandos/usuarios.ts) | Implementa `/autorizar`, `/revocar` y `/usuarios`; el service exige rol directora. |

### `prisma/`, `scripts/` y `tests/`

| Archivo o carpeta | Responsabilidad |
|---|---|
| [`prisma/schema.prisma`](./prisma/schema.prisma) | Modelos y relaciones PostgreSQL: usuarios, publicaciones, evidencias, métricas y contacto. |
| [`prisma/migrations/20261027000000_init/migration.sql`](./prisma/migrations/20261027000000_init/migration.sql) | Crea tipos, tablas, índices y relaciones iniciales. |
| [`prisma/migrations/migration_lock.toml`](./prisma/migrations/migration_lock.toml) | Registra el proveedor de base usado por las migraciones. |
| [`prisma/sql/seguridad-supabase.sql`](./prisma/sql/seguridad-supabase.sql) | Activa RLS, quita escritura a roles públicos y permite lectura de publicaciones publicadas; habilita Realtime para esa tabla. |
| [`scripts/ejecutar-pruebas.mjs`](./scripts/ejecutar-pruebas.mjs) | Descubre e importa recursivamente archivos `*.test.ts`. |
| [`scripts/verificar-conexion.ts`](./scripts/verificar-conexion.ts) | Valida configuración, conexión y presencia de las siete tablas esperadas. |
| [`scripts/inicializar.ts`](./scripts/inicializar.ts) | Registra/reactiva a la primera directora. |
| [`tests/apoyo/fakes.ts`](./tests/apoyo/fakes.ts) | Provee actores y repositories en memoria para pruebas sin PostgreSQL. |
| [`tests/publicacion/publicacion.entity.test.ts`](./tests/publicacion/publicacion.entity.test.ts) | Prueba reglas y transiciones principales de la entidad publicación. |
| [`tests/publicacion/publicacion.service.test.ts`](./tests/publicacion/publicacion.service.test.ts) | Prueba creación, exposición pública, etiquetas y filtro. |
| [`tests/usuario-autorizado/usuario-autorizado.service.test.ts`](./tests/usuario-autorizado/usuario-autorizado.service.test.ts) | Prueba autenticación, autorización, revocación y restricción por rol. |

## 4. Modelo de datos

El esquema declara:

- **UsuarioAutorizado:** ID de Telegram, nombre, rol y estado activo.
- **Publicacion:** contenido, estado, autor y aprobador; su destino es siempre la web.
- **Evidencia** y **PublicacionEvidencia:** URL/tipo de medio y vínculo con consentimiento verificado.
- **MetricaPublicacion:** conteos diarios de vistas, reacciones y clics.
- **InformacionContacto:** pares clave/valor y usuario que actualizó el dato.

Los roles son `DIRECTORA`, `COMUNICACIONES` y `COLABORADOR`. Los estados de publicación son `BORRADOR`, `PENDIENTE_APROBACION`, `PUBLICADA` y `ARCHIVADA`. En el código actual, el comportamiento completo se concentra en publicaciones y usuarios; las entidades de evidencia, métricas y contacto solo están modeladas en Prisma.

## 5. Qué se puede hacer actualmente

### Desde la API

- `GET /health`: verificar que el servidor responde y que PostgreSQL está accesible.
- `GET /api-docs` y `GET /api-docs.json`: consultar la documentación OpenAPI.
- `GET /api/publicaciones?pagina=1&limite=10&etiqueta=Talleres`: listar publicaciones públicas; `limite` acepta de 1 a 50.
- `GET /api/publicaciones/etiquetas`: obtener etiquetas distintas de noticias publicadas.
- `GET /api/publicaciones/:id`: obtener una noticia publicada por UUID.
- La API no ofrece endpoints HTTP para crear, editar, publicar o administrar usuarios. Está limitada a GET para la web y tiene rate limit de 120 solicitudes por minuto.

### Desde Telegram

- Sin autorización, solo en chat privado: `/start`, `/ayuda` y `/miid`.
- Usuarios autorizados: `/nueva Título | Cuerpo | etiqueta` crea un borrador; `/enviar <id>` envía el borrador del autor a aprobación; `/ultimas` muestra cinco noticias publicadas.
- Directora o comunicaciones pueden publicar borradores o pendientes con `/publicar <id>` y archivar con `/archivar <id>`.
- `/pendientes` lista las publicaciones pendientes. En el código está disponible para cualquier usuario autorizado, aunque la aprobación/publicación sí está restringida por rol.
- Solo la directora puede usar `/autorizar <telegramId> <ROL> <nombre>`, `/revocar <telegramId>` y `/usuarios`.
- Un usuario revocado conserva su registro e historial, pero ya no puede autenticarse.

## 6. Alcance pendiente y límites observados

- **Evidencias/medios:** el esquema modela imágenes y videos, pero no existe flujo de carga a Supabase Storage, vinculación de evidencia ni verificación funcional del consentimiento. El cliente Supabase está preparado, no integrado a un caso de uso.
- **Contacto:** hay tabla, pero no service, repository, rutas ni comandos para consultar o actualizar datos.
- **Métricas:** existe el modelo de base, pero no captura ni consulta de vistas, reacciones o clics.
- **Publicaciones:** no hay endpoint HTTP de escritura ni comando específico de edición; la entidad y el service sí contemplan editar, pero el flujo no está conectado a una entrada.
- **Experiencia del bot:** los comandos son de texto de una línea y los identificadores se copian como UUID; no hay conversaciones guiadas ni botones.
- **Pruebas:** la suite cubre entidades y services con fakes, pero no contiene pruebas de rutas HTTP, integración real con PostgreSQL, webhooks, long polling, CORS, rate limit ni despliegue.
- **Realtime:** el SQL permite que el frontend reciba cambios de `publicacion` con Supabase Realtime; la aplicación backend no gestiona las suscripciones.

## 7. Pruebas que se pueden ejecutar

### Comprobaciones automáticas existentes

Primero instalar dependencias:

```bash
npm ci
```

Luego ejecutar:

```bash
npm test                 # Suite unitaria existente; no requiere base de datos
npm run typecheck        # TypeScript estricto para src, scripts y tests
npm run build            # Genera cliente Prisma y compila src/ a dist/
```

La suite actual comprueba, entre otros casos, el inicio como borrador, validación de título/cuerpo, transiciones de estado, permisos de publicación, visibilidad pública, filtro por etiqueta, autenticación en lista blanca y administración restringida a la directora.

### Pruebas que requieren servicios configurados

Con un `.env` válido y una base UP News accesible:

```bash
npm run check:config
npm run db:deploy
npm run db:inicializar -- <telegramId> "Nombre de la directora"
npm run dev
```

`check:config` valida conexión y cuenta las tablas requeridas; no reemplaza una prueba de integración de cada repository. La carga inicial debe ejecutarse después de migrar y antes de probar comandos que requieren un usuario autorizado.

Con el servidor arriba, verificar manualmente:

```bash
curl -i http://127.0.0.1:3000/health
curl -i 'http://127.0.0.1:3000/api/publicaciones?pagina=1&limite=10'
curl -i http://127.0.0.1:3000/api/publicaciones/etiquetas
curl -i http://127.0.0.1:3000/api-docs
```

También conviene comprobar en Swagger y con solicitudes HTTP parámetros inválidos (400), UUID inexistente/no publicado (404), paginación, filtro de etiqueta y que borradores no aparecen en la API. Para Telegram, probar `/miid` con un usuario no registrado, autorizarlo como directora y recorrer `/nueva` → `/enviar` → `/publicar`; verificar además que un colaborador no pueda publicar y que un usuario revocado deje de acceder.

### Pruebas recomendadas para completar la cobertura

1. Pruebas de rutas/controller: códigos HTTP, validación de query/UUID, contrato JSON y errores.
2. Pruebas de integración de repositories contra una base de prueba: persistencia, paginación, filtros, orden y migraciones.
3. Pruebas del bot con updates simulados: chat privado, lista blanca, permisos, comandos mal formados y errores.
4. Prueba de configuración/arranque y endpoint de salud con base disponible y no disponible.
5. Cuando se implementen contacto, evidencias y métricas, pruebas unitarias e integración de sus respectivos flujos.

## 8. Resultado de verificación en este entorno

Se intentaron `npm test` y `npm run typecheck`. Ambos comandos no llegaron a ejecutar pruebas ni análisis porque no están instaladas las dependencias del proyecto (`tsx` y `tsc` no se encontraron). Esto no constituye un fallo de las pruebas ni una validación de errores del código. Ejecutar `npm ci` y repetir los comandos permite obtener el resultado real.
