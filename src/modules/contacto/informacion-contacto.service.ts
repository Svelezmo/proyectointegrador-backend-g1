import type { Actor } from "../../shared/domain/actor.js";
import { NoAutorizadoError, NoEncontradoError } from "../../shared/domain/errores.js";
import type {
  InformacionContactoDto,
  InformacionContactoPublicaDto,
  InformacionContactoRespuesta,
} from "./informacion-contacto.dto.js";
import { InformacionContacto } from "./informacion-contacto.entity.js";
import type { InformacionContactoRepository } from "./informacion-contacto.repository.js";

export class InformacionContactoService {
  constructor(private readonly contactos: InformacionContactoRepository) {}

  /** Contacto de la fundación para la página web (público, solo lectura). */
  async listarPublico(): Promise<InformacionContactoPublicaDto[]> {
    return (await this.contactos.listar()).map(contacto => {
      const { nombre, tipo, informacion } = contacto.aProps();
      return { nombre, tipo, informacion };
    });
  }

  async listar(actor: Actor): Promise<InformacionContactoRespuesta[]> {
    this.exigirDirectora(actor);
    return (await this.contactos.listar()).map(contacto => this.aDto(contacto));
  }

  async guardar(datos: InformacionContactoDto, actor: Actor, id?: string): Promise<InformacionContactoRespuesta> {
    this.exigirDirectora(actor);
    const contacto = id ? await this.contactos.buscarPorId(id) : null;
    if (id && !contacto) throw new NoEncontradoError("Información de contacto no encontrada");
    const resultado = contacto
      ? this.actualizar(contacto, datos, actor)
      : InformacionContacto.crear(datos, actor);
    await this.contactos.guardar(resultado);
    return this.aDto(resultado);
  }

  async eliminar(id: string, actor: Actor): Promise<void> {
    this.exigirDirectora(actor);
    if (!(await this.contactos.buscarPorId(id))) throw new NoEncontradoError("Información de contacto no encontrada");
    await this.contactos.eliminar(id);
  }

  private actualizar(contacto: InformacionContacto, datos: InformacionContactoDto, actor: Actor): InformacionContacto {
    contacto.actualizar(datos, actor);
    return contacto;
  }

  private aDto(contacto: InformacionContacto): InformacionContactoRespuesta {
    const props = contacto.aProps();
    return {
      id: props.id,
      nombre: props.nombre,
      tipo: props.tipo,
      informacion: props.informacion,
      actualizadoEn: props.actualizadoEn.toISOString(),
    };
  }

  private exigirDirectora(actor: Actor): void {
    if (actor.rol !== "DIRECTORA") throw new NoAutorizadoError("Solo la directora puede gestionar la información de contacto");
  }
}
