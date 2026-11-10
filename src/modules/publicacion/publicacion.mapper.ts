import type { Publicacion as PublicacionModelo } from "../../generated/prisma/client.js";
import type {
  EtiquetaPublicacion as EtiquetaEnum,
  PropositoPublicacion as PropositoEnum,
} from "../../generated/prisma/enums.js";
import { Publicacion } from "./publicacion.entity.js";
import type { EtiquetaPublicacion, PropositoPublicacion } from "./publicacion.entity.js";
import type { PublicacionInternaDto, PublicacionPublicaDto } from "./publicacion.dto.js";

const ETIQUETA_A_ENUM = {
  Comunidad: "COMUNIDAD",
  Eventos: "EVENTOS",
  Salud: "SALUD",
  Consejos: "CONSEJOS",
} as const satisfies Record<EtiquetaPublicacion, EtiquetaEnum>;

const ENUM_A_ETIQUETA: Record<EtiquetaEnum, EtiquetaPublicacion> = {
  COMUNIDAD: "Comunidad",
  EVENTOS: "Eventos",
  SALUD: "Salud",
  CONSEJOS: "Consejos",
};

const PROPOSITO_A_ENUM = {
  "Informar a la comunidad": "INFORMAR_A_LA_COMUNIDAD",
  "Educar y compartir conocimientos": "EDUCAR_Y_COMPARTIR_CONOCIMIENTOS",
  "Promover la salud y el bienestar": "PROMOVER_LA_SALUD_Y_EL_BIENESTAR",
  "Invitar a participar en actividades": "INVITAR_A_PARTICIPAR_EN_ACTIVIDADES",
  "Sensibilizar sobre una causa": "SENSIBILIZAR_SOBRE_UNA_CAUSA",
  "Compartir recursos y conocimiento": "COMPARTIR_RECURSOS_Y_CONOCIMIENTO",
} as const satisfies Record<PropositoPublicacion, PropositoEnum>;

const ENUM_A_PROPOSITO: Record<PropositoEnum, PropositoPublicacion> = {
  INFORMAR_A_LA_COMUNIDAD: "Informar a la comunidad",
  EDUCAR_Y_COMPARTIR_CONOCIMIENTOS: "Educar y compartir conocimientos",
  PROMOVER_LA_SALUD_Y_EL_BIENESTAR: "Promover la salud y el bienestar",
  INVITAR_A_PARTICIPAR_EN_ACTIVIDADES: "Invitar a participar en actividades",
  SENSIBILIZAR_SOBRE_UNA_CAUSA: "Sensibilizar sobre una causa",
  COMPARTIR_RECURSOS_Y_CONOCIMIENTO: "Compartir recursos y conocimiento",
};

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
      proposito: fila.proposito ? ENUM_A_PROPOSITO[fila.proposito] : null,
      etiqueta: fila.etiqueta ? ENUM_A_ETIQUETA[fila.etiqueta] : null,
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
    const {
      imagenUrl: _imagenUrl,
      tipoEvidencia: _tipoEvidencia,
      etiqueta,
      proposito,
      ...columnas
    } = publicacion.aProps();
    return {
      ...columnas,
      etiqueta: etiqueta ? ETIQUETA_A_ENUM[etiqueta] : null,
      proposito: proposito ? PROPOSITO_A_ENUM[proposito] : null,
    };
  },

  etiquetaAPersistencia(etiqueta: EtiquetaPublicacion): EtiquetaEnum {
    return ETIQUETA_A_ENUM[etiqueta];
  },

  etiquetaDesdePersistencia(etiqueta: EtiquetaEnum): EtiquetaPublicacion {
    return ENUM_A_ETIQUETA[etiqueta];
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
