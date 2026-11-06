import { Router } from "express";
import type { TelegramAuthController } from "../modules/auth/telegram-auth.controller.js";

export function crearRutasAuth(controller: TelegramAuthController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/auth/telegram-login:
   *   post:
   *     tags: [Autenticación]
   *     summary: Valida la sesión TMA y confirma el acceso del usuario autorizado
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [initData]
   *             properties:
   *               initData: { type: string, maxLength: 8192 }
   *     responses:
   *       200: { description: Sesión stateless confirmada }
   *       400: { $ref: '#/components/responses/DatosInvalidos' }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.post("/telegram-login", controller.iniciarSesion);

  return router;
}
