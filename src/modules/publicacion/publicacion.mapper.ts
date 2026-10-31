import type { Publicacion as PublicacionModelo } from "../../generated/prisma/client.js";
import { Publicacion } from "./publicacion.entity.js";
import type { PublicacionInternaDto, PublicacionPublicaDto } from "./publicacion.dto.js";

/**
 * MAPPER: traduce entre las tres "formas" de una publicación, para que ninguna capa
 * dependa de la forma de otra:
 *   fila de Prisma  <->  Entity  ->  DTO de respuesta
 * Si cambia una columna en la base, solo se toca este archivo y el repository.
 */
export const PublicacionMapper = {
  /** Base de datos -> dominio */
  aEntidad(fila: PublicacionModelo): Publicacion {
    return Publicacion.reconstruir({
      id: fila.id,
      titulo: fila.titulo,
      resumen: fila.resumen,
      cuerpo: fila.cuerpo,
      proposito: fila.proposito,
      etiqueta: fila.etiqueta,
      estado: fila.estado,
      autorId: fila.autorId,
      aprobadoPor: fila.aprobadoPor,
      canalId: fila.canalId,
      moduloOrigen: fila.moduloOrigen,
      registroOrigenId: fila.registroOrigenId,
      publicadaEn: fila.publicadaEn,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  },

  /** Dominio -> base de datos */
  aPersistencia(publicacion: Publicacion): PublicacionModelo {
    return { ...publicacion.aProps() };
  },

  /** Dominio -> respuesta pública (página web) */
  aPublicaDto(publicacion: Publicacion): PublicacionPublicaDto {
    const p = publicacion.aProps();
    return {
      id: p.id,
      titulo: p.titulo,
      resumen: p.resumen,
      cuerpo: p.cuerpo,
      etiqueta: p.etiqueta,
      publicadaEn: p.publicadaEn?.toISOString() ?? null,
    };
  },

  /** Dominio -> respuesta interna (bot / equipo) */
  aInternaDto(publicacion: Publicacion): PublicacionInternaDto {
    const p = publicacion.aProps();
    return {
      ...PublicacionMapper.aPublicaDto(publicacion),
      estado: p.estado,
      proposito: p.proposito,
      actualizadoEn: p.actualizadoEn.toISOString(),
    };
  },
};
