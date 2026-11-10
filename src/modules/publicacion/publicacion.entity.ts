import { randomUUID } from "node:crypto";
import { puedeAprobar, type Actor } from "../../shared/domain/actor.js";
import { NoAutorizadoError, ReglaDeNegocioError, ValidacionError } from "../../shared/domain/errores.js";
import type { TipoEvidencia } from "./evidencia.js";

/**
 * ENTITY: el corazón del módulo. Contiene las reglas de negocio de una publicación
 * y no conoce Express, Prisma, Telegram ni ningún detalle técnico.
 * Su estado solo cambia a través de sus métodos, que garantizan que siempre sea válido.
 */

export const ESTADOS_PUBLICACION = ["BORRADOR", "PENDIENTE_APROBACION", "PUBLICADA", "ARCHIVADA"] as const;
export type EstadoPublicacion = (typeof ESTADOS_PUBLICACION)[number];

export const ETIQUETAS_PUBLICACION = ["Comunidad", "Eventos", "Salud", "Consejos"] as const;
export type EtiquetaPublicacion = (typeof ETIQUETAS_PUBLICACION)[number];

export const PROPOSITOS_PUBLICACION = [
  "Informar a la comunidad",
  "Educar y compartir conocimientos",
  "Promover la salud y el bienestar",
  "Invitar a participar en actividades",
  "Sensibilizar sobre una causa",
  "Compartir recursos y conocimiento",
] as const;
export type PropositoPublicacion = (typeof PROPOSITOS_PUBLICACION)[number];

export interface PropsPublicacion {
  id: string;
  titulo: string;
  resumen: string | null;
  cuerpo: string;
  proposito: PropositoPublicacion | null;
  etiqueta: EtiquetaPublicacion | null;
  /** URL del medio principal, guardado como evidencia de tipo IMAGEN o VIDEO. */
  imagenUrl: string | null;
  tipoEvidencia: TipoEvidencia | null;
  estado: EstadoPublicacion;
  estaActivo: boolean;
  autorId: string;
  aprobadoPor: string | null;
  publicadaEn: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface DatosNuevaPublicacion {
  titulo: string;
  cuerpo: string;
  resumen?: string | null | undefined;
  proposito?: PropositoPublicacion | null | undefined;
  etiqueta?: EtiquetaPublicacion | null | undefined;
  imagenUrl?: string | null | undefined;
  tipoEvidencia?: TipoEvidencia | null | undefined;
  estado?: "BORRADOR" | "PENDIENTE_APROBACION" | undefined;
}

type CampoEditable =
  | "titulo"
  | "resumen"
  | "cuerpo"
  | "proposito"
  | "etiqueta"
  | "imagenUrl"
  | "tipoEvidencia";
/** Campos que se pueden editar; los que llegan como undefined se ignoran. */
export type CambiosPublicacion = { [K in CampoEditable]?: PropsPublicacion[K] | undefined };

const LONGITUD_MAXIMA_TITULO = 150;

export class Publicacion {
  private constructor(private props: PropsPublicacion) {}

  /** Crea una publicación en el estado editable elegido por el autor. */
  static crear(datos: DatosNuevaPublicacion, autor: Actor, ahora = new Date()): Publicacion {
    const publicacion = new Publicacion({
      id: randomUUID(),
      titulo: datos.titulo.trim(),
      cuerpo: datos.cuerpo.trim(),
      resumen: datos.resumen ?? null,
      proposito: datos.proposito ?? null,
      etiqueta: datos.etiqueta ?? null,
      imagenUrl: datos.imagenUrl ?? null,
      tipoEvidencia: datos.tipoEvidencia ?? null,
      estado: datos.estado ?? "BORRADOR",
      estaActivo: false,
      autorId: autor.id,
      aprobadoPor: null,
      publicadaEn: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    publicacion.validarContenido();
    return publicacion;
  }

  /** Reconstruye una publicación que ya existe (la usa el mapper al leer de la base). */
  static reconstruir(props: PropsPublicacion): Publicacion {
    return new Publicacion({ ...props });
  }

  get id() { return this.props.id; }
  get titulo() { return this.props.titulo; }
  get estado() { return this.props.estado; }
  get autorId() { return this.props.autorId; }
  get estaActivo() { return this.props.estaActivo; }
  get estaPublicada() { return this.props.estado === "PUBLICADA" && this.props.estaActivo; }

  /** Copia de solo lectura de los datos, para mappers y DTOs. */
  aProps(): Readonly<PropsPublicacion> {
    return { ...this.props };
  }

  editar(cambios: CambiosPublicacion, actor: Actor, ahora = new Date()): void {
    if (actor.rol !== "DIRECTORA" && (actor.id !== this.props.autorId || this.props.estado !== "BORRADOR")) {
      throw new NoAutorizadoError("Solo la directora puede editar una publicación fuera de sus borradores");
    }
    if (this.props.estado === "ARCHIVADA" && actor.rol !== "DIRECTORA") {
      throw new ReglaDeNegocioError("No se puede editar una publicación archivada");
    }
    const anterior = { ...this.props };
    Object.assign(this.props, Object.fromEntries(Object.entries(cambios).filter(([, valor]) => valor !== undefined)));
    try {
      this.validarContenido();
    } catch (error) {
      this.props = anterior;
      throw error;
    }
    this.props.actualizadoEn = ahora;
  }

  /** Un colaborador no publica directo: envía su borrador a revisión. */
  enviarAAprobacion(actor: Actor, ahora = new Date()): void {
    if (this.props.estado !== "BORRADOR") {
      throw new ReglaDeNegocioError("Solo un borrador puede enviarse a aprobación");
    }
    if (actor.id !== this.props.autorId) {
      throw new NoAutorizadoError("Solo el autor puede enviar su borrador a aprobación");
    }
    this.props.estado = "PENDIENTE_APROBACION";
    this.props.actualizadoEn = ahora;
  }

  /** Aprueba y publica. Solo directora. La activación es una acción separada. */
  publicar(actor: Actor, ahora = new Date()): void {
    if (!puedeAprobar(actor)) {
      throw new NoAutorizadoError("Solo la directora puede aprobar y publicar");
    }
    if (this.props.estado !== "BORRADOR" && this.props.estado !== "PENDIENTE_APROBACION") {
      throw new ReglaDeNegocioError(`No se puede publicar una publicación en estado ${this.props.estado}`);
    }
    this.props.estado = "PUBLICADA";
    this.props.estaActivo = false;
    this.props.aprobadoPor = actor.id;
    this.props.publicadaEn = ahora;
    this.props.actualizadoEn = ahora;
  }

  archivar(actor: Actor, ahora = new Date()): void {
    if (!puedeAprobar(actor)) {
      throw new NoAutorizadoError("Solo la directora puede archivar");
    }
    if (this.props.estado === "ARCHIVADA") {
      throw new ReglaDeNegocioError("La publicación ya está archivada");
    }
    this.props.estado = "ARCHIVADA";
    this.props.estaActivo = false;
    this.props.actualizadoEn = ahora;
  }

  cambiarActivacion(estaActivo: boolean, actor: Actor, ahora = new Date()): void {
    if (actor.rol !== "DIRECTORA") {
      throw new NoAutorizadoError("Solo la directora puede activar o desactivar una publicación");
    }
    if (estaActivo && this.props.estado !== "PUBLICADA") {
      throw new ReglaDeNegocioError("Solo una publicación aprobada puede activarse");
    }
    this.props.estaActivo = estaActivo;
    this.props.actualizadoEn = ahora;
  }

  private validarContenido(): void {
    const campos: string[] = [];
    if (this.props.titulo.trim().length === 0 || this.props.titulo.length > LONGITUD_MAXIMA_TITULO) campos.push("titulo");
    if (this.props.cuerpo.trim().length === 0) campos.push("cuerpo");
    if (campos.length > 0) throw new ValidacionError("La publicación no es válida", campos);
  }
}
