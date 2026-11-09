import type { Publicacion as PublicacionModelo } from "../../generated/prisma/client.js";
import { Publicacion } from "./publicacion.entity.js";
import type { PublicacionInternaDto, PublicacionPublicaDto } from "./publicacion.dto.js";

/** Fila de publicación con su evidencia principal más reciente. */
export type PublicacionConImagen = PublicacionModelo & {
  evidencias?: { evidencia: { url: string; tipo: "IMAGEN" | "VIDEO" } }[];
};

/**
 * MAPPER: traduce entre las tres "formas" de una publicación, para que ninguna capa
 * dependa de la forma de otra:
 *   fila de Prisma  <->  Entity  ->  DTO de respuesta
 * Si cambia una columna en la base, solo se toca este archivo y el repository.
 */
export const PublicacionMapper = {
  /** Base de datos -> dominio */
  aEntidad(fila: PublicacionConImagen): Publicacion {
    return Publicacion.reconstruir({
      id: fila.id,
      titulo: fila.titulo,
      resumen: fila.resumen,
      cuerpo: fila.cuerpo,
      proposito: fila.proposito,
      etiqueta: fila.etiqueta,
      imagenUrl: fila.evidencias?.[0]?.evidencia.url ?? null,
      tipoEvidencia: fila.evidencias?.[0]?.evidencia.tipo ?? null,
      estado: fila.estado,
      estaActivo: fila.estaActivo,
      autorId: fila.autorId,
      aprobadoPor: fila.aprobadoPor,
      publicadaEn: fila.publicadaEn,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  },

  /** Dominio -> base de datos (solo columnas de la tabla publicacion). */
  aPersistencia(publicacion: Publicacion): PublicacionModelo {
    const { imagenUrl: _imagenUrl, tipoEvidencia: _tipoEvidencia, ...columnas } = publicacion.aProps();
    return columnas;
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
      imagenUrl: p.imagenUrl,
      tipoEvidencia: p.tipoEvidencia,
      publicadaEn: p.publicadaEn?.toISOString() ?? null,
    };
  },

  /** Dominio -> respuesta interna (bot / equipo) */
  aInternaDto(publicacion: Publicacion): PublicacionInternaDto {
    const p = publicacion.aProps();
    return {
      ...PublicacionMapper.aPublicaDto(publicacion),
      estado: p.estado,
      estaActivo: p.estaActivo,
      autorId: p.autorId,
      proposito: p.proposito,
      actualizadoEn: p.actualizadoEn.toISOString(),
    };
  },
};
