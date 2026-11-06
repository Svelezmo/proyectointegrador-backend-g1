import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJSDoc from "swagger-jsdoc";

/**
 * Especificación OpenAPI de UP News.
 * - Las rutas se documentan con comentarios @openapi dentro de src/rutas/*.rutas.ts.
 * - Los esquemas reutilizables (components) se definen aquí.
 *
 * La ruta de los archivos se calcula desde ESTE archivo (no desde la carpeta donde se ejecuta npm),
 * así funciona en desarrollo (src/rutas/*.ts) y en producción (dist/rutas/*.js).
 * Se usan "/" porque swagger-jsdoc no entiende las "\" de Windows.
 */
const carpetaRutas = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "rutas").replace(/\\/g, "/");

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "UP News API",
      version: "0.1.0",
      description:
        "API pública de noticias y endpoints de gestión protegidos por initData validado de Telegram. La publicación y activación requieren rol DIRECTORA.",
    },
    // URL relativa: "Try it out" usa el mismo servidor donde se abrió /api-docs (local o Render).
    servers: [{ url: "/", description: "Este servidor" }],
    tags: [
      { name: "Publicaciones", description: "Noticias visibles en la página web" },
      { name: "Mini App", description: "Subida firmada de imágenes y creación de borradores autenticadas con Telegram" },
      { name: "Gestión", description: "CRUD de noticias, colaboradores e información de contacto" },
      { name: "Sistema", description: "Estado del servicio" },
    ],
    components: {
      schemas: {
        PublicacionPublica: {
          type: "object",
          required: ["id", "titulo", "cuerpo"],
          properties: {
            id: { type: "string", format: "uuid" },
            titulo: { type: "string", example: "Taller: los jóvenes hornean sus primeras recetas" },
            resumen: { type: "string", nullable: true, example: "Una jornada para aprender y compartir." },
            cuerpo: { type: "string", example: "Cada participante preparó su propia receta..." },
            etiqueta: { type: "string", nullable: true, example: "Talleres" },
            publicadaEn: { type: "string", format: "date-time", nullable: true },
          },
        },
        PaginaPublicaciones: {
          type: "object",
          properties: {
            items: { type: "array", items: { $ref: "#/components/schemas/PublicacionPublica" } },
            total: { type: "integer", example: 12 },
            pagina: { type: "integer", example: 1 },
            limite: { type: "integer", example: 10 },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            codigo: { type: "string", example: "VALIDACION" },
            campos: { type: "array", items: { type: "string" } },
          },
        },
      },
      responses: {
        DatosInvalidos: {
          description: "Parámetros inválidos",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Datos inválidos", codigo: "VALIDACION", campos: ["id"] },
            },
          },
        },
        NoEncontrado: {
          description: "No existe o no está publicada",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Publicación no encontrada", codigo: "NO_ENCONTRADO" },
            },
          },
        },
        NoAutorizado: {
          description: "La sesión de Telegram es inválida, expiró o el usuario no está autorizado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "La sesión de Telegram es inválida o ha expirado", codigo: "NO_AUTORIZADO" },
            },
          },
        },
      },
    },
  },
  // OJO: `apis` va al mismo nivel que `definition`, no adentro.
  apis: [`${carpetaRutas}/*.rutas.{ts,js}`],
});
