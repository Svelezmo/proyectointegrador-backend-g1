import express, { type Express } from "express";
import { crearRutas, type DependenciasRutas } from "./rutas/index.js";
import { manejadorErrores, rutaNoEncontrada } from "./shared/http/middlewares/manejador-errores.js";

export interface DependenciasApp extends DependenciasRutas {
  trustProxyHops: number;
}

/**
 * Arma la aplicación Express: configuración base, rutas (src/rutas) y manejo de errores.
 * Recibe todo por parámetro (no importa config ni Prisma), así se puede levantar en pruebas.
 */
export function crearApp(deps: DependenciasApp): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", deps.trustProxyHops);
  app.use(express.json({ limit: "1mb" }));

  app.use(crearRutas(deps));

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}
