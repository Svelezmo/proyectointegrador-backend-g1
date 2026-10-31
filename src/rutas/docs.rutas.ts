import { Router } from "express";
import swaggerUI from "swagger-ui-express";
import { swaggerSpec } from "../docs/swagger.js";

/** RUTAS de documentación: Swagger UI en /api-docs y el JSON de OpenAPI en /api-docs.json. */
export function crearRutasDocs(): Router {
  const router = Router();
  router.get("/api-docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });
  router.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec, { customSiteTitle: "UP News API" }));
  return router;
}
