import { randomUUID } from "node:crypto";
import type { Actor, Rol } from "../../shared/domain/actor.js";
import { ValidacionError } from "../../shared/domain/errores.js";

/**
 * ENTITY: identidad local enlazada a Telegram o al perfil del backend web principal.
 */
export interface PropsUsuarioAutorizado {
  id: string;
  telegramId: bigint | null;
  idUsuarioExterno: bigint | null;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export class UsuarioAutorizado {
  private constructor(private props: PropsUsuarioAutorizado) {}

  static crear(
    datos: { telegramId?: bigint | undefined; idUsuarioExterno?: bigint | undefined; nombre: string; rol: Rol },
    ahora = new Date(),
  ): UsuarioAutorizado {
    if (datos.telegramId === undefined && datos.idUsuarioExterno === undefined) {
      throw new ValidacionError("Se requiere una identidad de Telegram o web");
    }
    if (datos.telegramId !== undefined && datos.telegramId <= 0n) {
      throw new ValidacionError("ID de Telegram inválido", ["telegramId"]);
    }
    if (datos.idUsuarioExterno !== undefined && datos.idUsuarioExterno <= 0n) {
      throw new ValidacionError("ID de usuario externo inválido", ["idUsuarioExterno"]);
    }
    const nombre = datos.nombre.trim();
    if (nombre.length === 0) throw new ValidacionError("El nombre es obligatorio", ["nombre"]);
    return new UsuarioAutorizado({
      id: randomUUID(),
      telegramId: datos.telegramId ?? null,
      idUsuarioExterno: datos.idUsuarioExterno ?? null,
      nombre,
      rol: datos.rol,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropsUsuarioAutorizado): UsuarioAutorizado {
    return new UsuarioAutorizado({ ...props });
  }

  get id() { return this.props.id; }
  get telegramId() { return this.props.telegramId; }
  get idUsuarioExterno() { return this.props.idUsuarioExterno; }
  get activo() { return this.props.activo; }
  get rol() { return this.props.rol; }

  aProps(): Readonly<PropsUsuarioAutorizado> {
    return { ...this.props };
  }

  /** Convierte al usuario en el Actor que reciben los services. */
  aActor(): Actor {
    return { id: this.props.id, nombre: this.props.nombre, rol: this.props.rol };
  }

  cambiarRol(rol: Rol, ahora = new Date()): void {
    this.props.rol = rol;
    this.props.actualizadoEn = ahora;
  }

  cambiarNombre(nombre: string, ahora = new Date()): void {
    const nombreNormalizado = nombre.trim();
    if (!nombreNormalizado) throw new ValidacionError("El nombre es obligatorio", ["nombre"]);
    this.props.nombre = nombreNormalizado;
    this.props.actualizadoEn = ahora;
  }

  /** Actualiza nombre y rol con los del sistema principal. Devuelve true si algo cambió. */
  sincronizarPerfilWeb(nombre: string, rol: Rol, ahora = new Date()): boolean {
    const nombreNormalizado = nombre.trim();
    if (!nombreNormalizado) throw new ValidacionError("El nombre es obligatorio", ["nombre"]);
    if (this.props.nombre === nombreNormalizado && this.props.rol === rol) return false;
    this.props.nombre = nombreNormalizado;
    this.props.rol = rol;
    this.props.actualizadoEn = ahora;
    return true;
  }

  activar(ahora = new Date()): void {
    this.props.activo = true;
    this.props.actualizadoEn = ahora;
  }

  desactivar(ahora = new Date()): void {
    this.props.activo = false;
    this.props.actualizadoEn = ahora;
  }
}
