import { Router } from "express";

/** RUTAS de salud del servicio (las usa Render para saber si el backend está vivo). */
export function crearRutasSalud(verificarSalud: () => Promise<void>): Router {
  const router = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Sistema]
   *     summary: Estado del servidor y de la base de datos
   *     responses:
   *       200:
   *         description: Todo funciona
   *         content:
   *           application/json:
   *             example: { status: ok }
   *       503:
   *         description: La base de datos no responde
   *         content:
   *           application/json:
   *             example: { status: unavailable }
   */
  router.get("/health", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      await verificarSalud();
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  return router;
}
