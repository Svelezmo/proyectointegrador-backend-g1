import { randomUUID } from "node:crypto";
import type { Actor } from "../../shared/domain/actor.js";
import { ValidacionError } from "../../shared/domain/errores.js";
import type { InformacionContactoDto } from "./informacion-contacto.dto.js";

export interface PropsInformacionContacto extends InformacionContactoDto {
  id: string;
  actualizadoPor: string | null;
  actualizadoEn: Date;
}

export class InformacionContacto {
  private constructor(private props: PropsInformacionContacto) {}

  static crear(datos: InformacionContactoDto, actor: Actor, ahora = new Date()): InformacionContacto {
    if (!datos.nombre.trim() || !datos.informacion.trim()) {
      throw new ValidacionError("El nombre y la información son obligatorios");
    }
    return new InformacionContacto({
      ...datos,
      nombre: datos.nombre.trim(),
      informacion: datos.informacion.trim(),
      id: randomUUID(),
      actualizadoPor: actor.id,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropsInformacionContacto): InformacionContacto {
    return new InformacionContacto({ ...props });
  }

  actualizar(datos: InformacionContactoDto, actor: Actor, ahora = new Date()): void {
    if (!datos.nombre.trim() || !datos.informacion.trim()) {
      throw new ValidacionError("El nombre y la información son obligatorios");
    }
    this.props = {
      ...this.props,
      ...datos,
      nombre: datos.nombre.trim(),
      informacion: datos.informacion.trim(),
      actualizadoPor: actor.id,
      actualizadoEn: ahora,
    };
  }

  aProps(): Readonly<PropsInformacionContacto> {
    return { ...this.props };
  }
}
