import { z } from "zod";
import {
  ETIQUETAS_PUBLICACION,
  PROPOSITOS_PUBLICACION,
  type EtiquetaPublicacion,
  type EstadoPublicacion,
  type PropositoPublicacion,
} from "./publicacion.entity.js";
import type { TipoEvidencia } from "./evidencia.js";

/**
 * DTO (Data Transfer Object): define la FORMA de los datos que entran y salen del módulo.
 * - Los esquemas Zod validan y normalizan la entrada (lo que llega de HTTP o del bot).
 * - Los tipos de respuesta definen exactamente qué se expone hacia afuera
 *   (por ejemplo, nunca se expone autorId ni aprobadoPor en la API pública).
 */

const textoOpcional = (maximo: number) => z.string().trim().min(1).max(maximo).optional();
const etiquetaFiltro = z.string().trim()
  .transform(valor => ETIQUETAS_PUBLICACION.find(etiqueta => etiqueta.toLowerCase() === valor.toLowerCase()) ?? valor)
  .pipe(z.enum(ETIQUETAS_PUBLICACION))
  .optional();

// ── Entrada ─────────────────────────────────────────────────

export const crearPublicacionDto = z
  .object({
    titulo: z.string().trim().min(1).max(150),
    cuerpo: z.string().trim().min(1).max(10_000),
    resumen: textoOpcional(500),
    proposito: z.enum(PROPOSITOS_PUBLICACION).optional(),
    etiqueta: z.enum(ETIQUETAS_PUBLICACION).optional(),
    estado: z.enum(["BORRADOR", "PENDIENTE_APROBACION"]).default("BORRADOR"),
  })
  .strict();
export type CrearPublicacionDto = z.output<typeof crearPublicacionDto>;

export const editarPublicacionDto = crearPublicacionDto
  .omit({ estado: true })
  .partial()
  .extend({
    resumen: textoOpcional(500).nullable().optional(),
    proposito: z.enum(PROPOSITOS_PUBLICACION).nullable().optional(),
    etiqueta: z.enum(ETIQUETAS_PUBLICACION).nullable().optional(),
  })
  .strict()
  .refine(datos => Object.keys(datos).length > 0, { message: "Envíe al menos un campo" });
export type EditarPublicacionDto = z.output<typeof editarPublicacionDto>;

export const listarPublicacionesDto = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(10),
  etiqueta: etiquetaFiltro,
});
export type ListarPublicacionesDto = z.output<typeof listarPublicacionesDto>;

export const listarHistoricoDto = listarPublicacionesDto.extend({
  busqueda: z.string().trim().max(150).optional(),
});
export type ListarHistoricoDto = z.output<typeof listarHistoricoDto>;

export const idPublicacionDto = z.object({ id: z.uuid() });

// ── Salida ──────────────────────────────────────────────────

/** Lo que ve la página web pública. */
export interface PublicacionPublicaDto {
  id: string;
  titulo: string;
  resumen: string | null;
  cuerpo: string;
  etiqueta: EtiquetaPublicacion | null;
  /** URL del medio principal (imagen o video) o null si no se adjuntó evidencia. */
  imagenUrl: string | null;
  tipoEvidencia: TipoEvidencia | null;
  publicadaEn: string | null;
}

/** Lo que ve el equipo interno (bot): incluye estado. */
export interface PublicacionInternaDto extends PublicacionPublicaDto {
  estado: EstadoPublicacion;
  estaActivo: boolean;
  autorId: string;
  proposito: PropositoPublicacion | null;
  actualizadoEn: string;
}
