import cors from "cors";
import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import type { PublicacionController } from "../modules/publicacion/publicacion.controller.js";
import { RUTA_WEBHOOK } from "../modules/telegram/telegram.iniciar.js";
import { crearRutasDocs } from "./docs.rutas.js";
import { crearRutasPublicacion } from "./publicacion.rutas.js";
import { crearRutasSalud } from "./salud.rutas.js";

export interface DependenciasRutas {
  publicacionController: PublicacionController;
  verificarSalud: () => Promise<void>;
  webhookTelegram?: RequestHandler | undefined;
  corsOrigins: string[];
}

/**
 * Punto ÚNICO donde se ve todo lo que expone el backend:
 *
 *   GET  /health                     salud.rutas.ts
 *   GET  /api-docs, /api-docs.json   docs.rutas.ts (Swagger)
 *   POST /telegram/webhook           webhook del bot (solo producción)
 *   GET  /api/publicaciones/...      publicacion.rutas.ts
 *
 * Para un módulo nuevo: crear src/rutas/<modulo>.rutas.ts y montarlo en `api` aquí abajo.
 */
export function crearRutas(deps: DependenciasRutas): Router {
  const router = Router();

  router.use(crearRutasSalud(deps.verificarSalud));
  router.use(crearRutasDocs());

  // Webhook de Telegram: sin CORS (no lo llama un navegador) y protegido por secret_token.
  if (deps.webhookTelegram) router.post(RUTA_WEBHOOK, deps.webhookTelegram);

  // API pública para la página web: CORS + límite de peticiones.
  const api = Router();
  api.use(cors({ origin: deps.corsOrigins.length > 0 ? deps.corsOrigins : true, methods: ["GET"] }));
  api.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
  api.use("/publicaciones", crearRutasPublicacion(deps.publicacionController));
  // api.use("/contacto", crearRutasContacto(deps.contactoController));
  router.use("/api", api);

  return router;
}
