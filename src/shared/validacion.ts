import type { z } from "zod";
import { ValidacionError } from "./domain/errores.js";

/**
 * Valida datos de entrada contra un esquema de DTO.
 * Devuelve los datos ya tipados y normalizados, o lanza ValidacionError con los campos que fallaron.
 */
export function validar<S extends z.ZodType>(esquema: S, datos: unknown): z.output<S> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const campos = [...new Set(resultado.error.issues.map(issue => String(issue.path[0] ?? "body")))];
    throw new ValidacionError("Datos inválidos", campos);
  }
  return resultado.data;
}
