import { z } from "zod";
import type { EstadoPublicacion } from "./publicacion.entity.js";

/**
 * DTO (Data Transfer Object): define la FORMA de los datos que entran y salen del módulo.
 * - Los esquemas Zod validan y normalizan la entrada (lo que llega de HTTP o del bot).
 * - Los tipos de respuesta definen exactamente qué se expone hacia afuera
 *   (por ejemplo, nunca se expone autorId ni aprobadoPor en la API pública).
 */

const textoOpcional = (maximo: number) => z.string().trim().min(1).max(maximo).optional();

// ── Entrada ─────────────────────────────────────────────────

export const crearPublicacionDto = z
  .object({
    titulo: z.string().trim().min(1).max(150),
    cuerpo: z.string().trim().min(1).max(10_000),
    resumen: textoOpcional(500),
    proposito: textoOpcional(200),
    etiqueta: textoOpcional(50),
    canal: z.string().trim().min(1).default("web"),
  })
  .strict();
export type CrearPublicacionDto = z.output<typeof crearPublicacionDto>;

export const editarPublicacionDto = crearPublicacionDto
  .omit({ canal: true })
  .partial()
  .strict()
  .refine(datos => Object.keys(datos).length > 0, { message: "Envíe al menos un campo" });
export type EditarPublicacionDto = z.output<typeof editarPublicacionDto>;

export const listarPublicacionesDto = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(10),
  etiqueta: textoOpcional(50),
});
export type ListarPublicacionesDto = z.output<typeof listarPublicacionesDto>;

export const idPublicacionDto = z.object({ id: z.uuid() });

// ── Salida ──────────────────────────────────────────────────

/** Lo que ve la página web pública. */
export interface PublicacionPublicaDto {
  id: string;
  titulo: string;
  resumen: string | null;
  cuerpo: string;
  etiqueta: string | null;
  publicadaEn: string | null;
}

/** Lo que ve el equipo interno (bot): incluye estado. */
export interface PublicacionInternaDto extends PublicacionPublicaDto {
  estado: EstadoPublicacion;
  proposito: string | null;
  actualizadoEn: string;
}
