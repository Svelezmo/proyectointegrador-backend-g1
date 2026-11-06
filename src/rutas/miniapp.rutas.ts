import { Router } from "express";
import type { MiniAppController } from "../modules/miniapp/miniapp.controller.js";

export function crearRutasMiniApp(controller: MiniAppController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/miniapp/upload-signature:
   *   post:
   *     tags: [Mini App]
   *     summary: Obtiene una firma temporal para subir una imagen a Cloudinary
   *     parameters:
   *       - in: header
   *         name: X-Telegram-Init-Data
   *         required: true
   *         schema: { type: string }
   *         description: initData original de Telegram Web Apps
   *     responses:
   *       200:
   *         description: Parámetros firmados de Cloudinary
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.post("/upload-signature", controller.crearFirmaSubida);

  /**
   * @openapi
   * /api/miniapp/publicaciones:
   *   post:
   *     tags: [Mini App]
   *     summary: Guarda una noticia desde la Mini App de Telegram
   *     parameters:
   *       - in: header
   *         name: X-Telegram-Init-Data
   *         required: true
   *         schema: { type: string }
   *         description: initData original de Telegram Web Apps
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [titulo, cuerpo]
   *             properties:
   *               titulo: { type: string, maxLength: 150 }
   *               cuerpo: { type: string, maxLength: 10000 }
   *               resumen: { type: string }
   *               proposito: { type: string }
   *               etiqueta: { type: string }
   *               estado: { type: string, enum: [BORRADOR, PENDIENTE_APROBACION] }
   *               imagenUrl: { type: string, format: uri, description: URL segura devuelta por Cloudinary }
   *     responses:
   *       201: { description: Noticia guardada y asociada al usuario de Telegram }
   *       400: { $ref: '#/components/responses/DatosInvalidos' }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.post("/publicaciones", controller.crearPublicacion);

  return router;
}
