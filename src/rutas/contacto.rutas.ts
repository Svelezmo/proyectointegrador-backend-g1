import { Router } from "express";
import type { InformacionContactoController } from "../modules/contacto/informacion-contacto.controller.js";

/** RUTAS públicas de contacto. Se montan bajo /api/contacto en src/rutas/index.ts. */
export function crearRutasContacto(controller: InformacionContactoController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/contacto:
   *   get:
   *     tags: [Contacto]
   *     summary: Información de contacto de la fundación
   *     description: Público y de solo lectura. Ordenado por tipo y nombre. Se administra en /api/gestion/contactos.
   *     responses:
   *       200:
   *         description: Lista de datos de contacto
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/ContactoPublico' }
   *             example:
   *               - { nombre: "WhatsApp", tipo: "NUMERO_CONTACTO", informacion: "+57 300 000 0000" }
   *               - { nombre: "Sede principal", tipo: "DIRECCION", informacion: "Calle 1 # 2-3, Manizales" }
   *               - { nombre: "Instagram", tipo: "RED_SOCIAL", informacion: "https://instagram.com/asiscoup" }
   */
  router.get("/", controller.listar);

  return router;
}
