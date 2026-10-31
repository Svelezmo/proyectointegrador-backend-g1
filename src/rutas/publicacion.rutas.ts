import { Router } from "express";
import type { PublicacionController } from "../modules/publicacion/publicacion.controller.js";

/**
 * RUTAS de publicaciones: solo asocian URL + método HTTP con el método del controller.
 * Los comentarios @openapi de este archivo generan la documentación de Swagger (/api-docs).
 * Se montan bajo /api/publicaciones en src/rutas/index.ts.
 */
export function crearRutasPublicacion(controller: PublicacionController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/publicaciones:
   *   get:
   *     tags: [Publicaciones]
   *     summary: Lista las noticias publicadas
   *     description: Devuelve solo publicaciones en estado PUBLICADA, de la más reciente a la más antigua.
   *     parameters:
   *       - in: query
   *         name: pagina
   *         schema: { type: integer, minimum: 1, default: 1 }
   *       - in: query
   *         name: limite
   *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
   *       - in: query
   *         name: etiqueta
   *         description: Filtra por etiqueta (no distingue mayúsculas). Ej. Talleres
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Página de publicaciones
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/PaginaPublicaciones' }
   *       400: { $ref: '#/components/responses/DatosInvalidos' }
   */
  router.get("/", controller.listar);

  /**
   * @openapi
   * /api/publicaciones/etiquetas:
   *   get:
   *     tags: [Publicaciones]
   *     summary: Etiquetas de las noticias publicadas
   *     description: Sirve para construir los filtros de la página web.
   *     responses:
   *       200:
   *         description: Lista de etiquetas en orden alfabético
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { type: string }
   *             example: ["Historias", "La Fundación", "Talleres"]
   */
  router.get("/etiquetas", controller.etiquetas); // antes de "/:id" para que no se confunda con un id

  /**
   * @openapi
   * /api/publicaciones/{id}:
   *   get:
   *     tags: [Publicaciones]
   *     summary: Obtiene una noticia publicada
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: La publicación
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/PublicacionPublica' }
   *       400: { $ref: '#/components/responses/DatosInvalidos' }
   *       404: { $ref: '#/components/responses/NoEncontrado' }
   */
  router.get("/:id", controller.obtener);

  return router;
}
