import { randomUUID } from "node:crypto";
import { puedeAprobar, type Actor } from "../../shared/domain/actor.js";
import { NoAutorizadoError, ReglaDeNegocioError, ValidacionError } from "../../shared/domain/errores.js";

/**
 * ENTITY: el corazón del módulo. Contiene las reglas de negocio de una publicación
 * y no conoce Express, Prisma, Telegram ni ningún detalle técnico.
 * Su estado solo cambia a través de sus métodos, que garantizan que siempre sea válido.
 */

export const ESTADOS_PUBLICACION = ["BORRADOR", "PENDIENTE_APROBACION", "PUBLICADA", "ARCHIVADA"] as const;
export type EstadoPublicacion = (typeof ESTADOS_PUBLICACION)[number];

export interface PropsPublicacion {
  id: string;
  titulo: string;
  resumen: string | null;
  cuerpo: string;
  proposito: string | null;
  etiqueta: string | null;
  estado: EstadoPublicacion;
  autorId: string;
  aprobadoPor: string | null;
  canalId: string;
  moduloOrigen: string | null;
  registroOrigenId: string | null;
  publicadaEn: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface DatosNuevaPublicacion {
  titulo: string;
  cuerpo: string;
  resumen?: string | null | undefined;
  proposito?: string | null | undefined;
  etiqueta?: string | null | undefined;
  canalId: string;
  moduloOrigen?: string | null | undefined;
  registroOrigenId?: string | null | undefined;
}

type CampoEditable = "titulo" | "resumen" | "cuerpo" | "proposito" | "etiqueta";
/** Campos que se pueden editar; los que llegan como undefined se ignoran. */
export type CambiosPublicacion = { [K in CampoEditable]?: PropsPublicacion[K] | undefined };

const LONGITUD_MAXIMA_TITULO = 150;

export class Publicacion {
  private constructor(private props: PropsPublicacion) {}

  /** Crea una publicación nueva (siempre empieza como BORRADOR). */
  static crear(datos: DatosNuevaPublicacion, autor: Actor, ahora = new Date()): Publicacion {
    const publicacion = new Publicacion({
      id: randomUUID(),
      titulo: datos.titulo.trim(),
      cuerpo: datos.cuerpo.trim(),
      resumen: datos.resumen ?? null,
      proposito: datos.proposito ?? null,
      etiqueta: datos.etiqueta ?? null,
      estado: "BORRADOR",
      autorId: autor.id,
      aprobadoPor: null,
      canalId: datos.canalId,
      moduloOrigen: datos.moduloOrigen ?? null,
      registroOrigenId: datos.registroOrigenId ?? null,
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
  get estaPublicada() { return this.props.estado === "PUBLICADA"; }

  /** Copia de solo lectura de los datos, para mappers y DTOs. */
  aProps(): Readonly<PropsPublicacion> {
    return { ...this.props };
  }

  editar(cambios: CambiosPublicacion, actor: Actor, ahora = new Date()): void {
    if (this.props.estado === "ARCHIVADA") {
      throw new ReglaDeNegocioError("No se puede editar una publicación archivada");
    }
    if (actor.id !== this.props.autorId && !puedeAprobar(actor)) {
      throw new NoAutorizadoError("Solo el autor, comunicaciones o la directora pueden editar esta publicación");
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

  /** Publica (o aprueba y publica). Solo directora o comunicaciones. */
  publicar(actor: Actor, ahora = new Date()): void {
    if (!puedeAprobar(actor)) {
      throw new NoAutorizadoError("Solo comunicaciones o la directora pueden publicar");
    }
    if (this.props.estado !== "BORRADOR" && this.props.estado !== "PENDIENTE_APROBACION") {
      throw new ReglaDeNegocioError(`No se puede publicar una publicación en estado ${this.props.estado}`);
    }
    this.props.estado = "PUBLICADA";
    this.props.aprobadoPor = actor.id;
    this.props.publicadaEn = ahora;
    this.props.actualizadoEn = ahora;
  }

  archivar(actor: Actor, ahora = new Date()): void {
    if (!puedeAprobar(actor)) {
      throw new NoAutorizadoError("Solo comunicaciones o la directora pueden archivar");
    }
    if (this.props.estado === "ARCHIVADA") {
      throw new ReglaDeNegocioError("La publicación ya está archivada");
    }
    this.props.estado = "ARCHIVADA";
    this.props.actualizadoEn = ahora;
  }

  private validarContenido(): void {
    const campos: string[] = [];
    if (this.props.titulo.trim().length === 0 || this.props.titulo.length > LONGITUD_MAXIMA_TITULO) campos.push("titulo");
    if (this.props.cuerpo.trim().length === 0) campos.push("cuerpo");
    if ((this.props.moduloOrigen === null) !== (this.props.registroOrigenId === null)) campos.push("moduloOrigen");
    if (campos.length > 0) throw new ValidacionError("La publicación no es válida", campos);
  }
}
