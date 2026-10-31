import { randomUUID } from "node:crypto";
import type { Actor, Rol } from "../../shared/domain/actor.js";
import { ValidacionError } from "../../shared/domain/errores.js";

/**
 * ENTITY: una persona de la fundación habilitada para usar el bot.
 * La identidad se comprueba con su ID de Telegram (BIGINT: ya no cabe en un entero de 32 bits).
 */
export interface PropsUsuarioAutorizado {
  id: string;
  telegramId: bigint;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export class UsuarioAutorizado {
  private constructor(private props: PropsUsuarioAutorizado) {}

  static crear(datos: { telegramId: bigint; nombre: string; rol: Rol }, ahora = new Date()): UsuarioAutorizado {
    if (datos.telegramId <= 0n) throw new ValidacionError("ID de Telegram inválido", ["telegramId"]);
    const nombre = datos.nombre.trim();
    if (nombre.length === 0) throw new ValidacionError("El nombre es obligatorio", ["nombre"]);
    return new UsuarioAutorizado({
      id: randomUUID(),
      telegramId: datos.telegramId,
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

  activar(ahora = new Date()): void {
    this.props.activo = true;
    this.props.actualizadoEn = ahora;
  }

  desactivar(ahora = new Date()): void {
    this.props.activo = false;
    this.props.actualizadoEn = ahora;
  }
}
