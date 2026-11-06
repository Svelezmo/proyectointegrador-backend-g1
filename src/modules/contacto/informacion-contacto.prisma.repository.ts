import type { PrismaClient } from "../../generated/prisma/client.js";
import { InformacionContacto } from "./informacion-contacto.entity.js";
import type { InformacionContactoRepository } from "./informacion-contacto.repository.js";

export class PrismaInformacionContactoRepository implements InformacionContactoRepository {
  constructor(private readonly db: PrismaClient) {}

  async listar(): Promise<InformacionContacto[]> {
    const filas = await this.db.informacionContacto.findMany({ orderBy: [{ tipo: "asc" }, { nombre: "asc" }] });
    return filas.map(fila => InformacionContacto.reconstruir({
      id: fila.id,
      nombre: fila.nombre,
      tipo: fila.tipo,
      informacion: fila.informacion,
      actualizadoPor: fila.actualizadoPor,
      actualizadoEn: fila.actualizadoEn,
    }));
  }

  async buscarPorId(id: string): Promise<InformacionContacto | null> {
    const fila = await this.db.informacionContacto.findUnique({ where: { id } });
    return fila ? InformacionContacto.reconstruir({
      id: fila.id,
      nombre: fila.nombre,
      tipo: fila.tipo,
      informacion: fila.informacion,
      actualizadoPor: fila.actualizadoPor,
      actualizadoEn: fila.actualizadoEn,
    }) : null;
  }

  async guardar(contacto: InformacionContacto): Promise<void> {
    const { id, ...datos } = contacto.aProps();
    await this.db.informacionContacto.upsert({
      where: { id },
      create: { id, ...datos },
      update: datos,
    });
  }

  async eliminar(id: string): Promise<void> {
    await this.db.informacionContacto.delete({ where: { id } });
  }
}
