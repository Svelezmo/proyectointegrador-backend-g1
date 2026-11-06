import type { ErrorRequestHandler, RequestHandler } from "express";
import {
  ErrorDeDominio,
  NoAutorizadoError,
  NoAutenticadoError,
  NoEncontradoError,
  ReglaDeNegocioError,
  ServicioAutenticacionExternaError,
  ServicioNoDisponibleError,
  TelegramInitDataInvalidoError,
  ValidacionError,
} from "../../domain/errores.js";

const ESTADO_HTTP = new Map<Function, number>([
  [ValidacionError, 400],
  [NoAutorizadoError, 403],
  [NoAutenticadoError, 401],
  [ServicioAutenticacionExternaError, 502],
  [ServicioNoDisponibleError, 503],
  [TelegramInitDataInvalidoError, 403],
  [NoEncontradoError, 404],
  [ReglaDeNegocioError, 409],
]);

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
};

/** Traduce errores de dominio y de Express a respuestas HTTP. Express 5 envía aquí también los errores async. */
export const manejadorErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ErrorDeDominio) {
    const estado = ESTADO_HTTP.get(error.constructor) ?? 400;
    const cuerpo: Record<string, unknown> = { error: error.message, codigo: error.codigo };
    if (error instanceof ValidacionError && error.campos.length > 0) cuerpo["campos"] = error.campos;
    res.status(estado).json(cuerpo);
    return;
  }
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON inválido" });
    return;
  }
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "Solicitud demasiado grande" });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Error interno. Intente más tarde" });
};
