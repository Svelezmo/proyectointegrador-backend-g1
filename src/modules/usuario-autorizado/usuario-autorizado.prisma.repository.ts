import type { PrismaClient } from "../../generated/prisma/client.js";
import type { UsuarioAutorizado } from "./usuario-autorizado.entity.js";
import { UsuarioAutorizadoMapper } from "./usuario-autorizado.mapper.js";
import type { UsuarioAutorizadoRepository } from "./usuario-autorizado.repository.js";

export class PrismaUsuarioAutorizadoRepository implements UsuarioAutorizadoRepository {
  constructor(private readonly db: PrismaClient) {}

  async guardar(usuario: UsuarioAutorizado): Promise<void> {
    const { id, creadoEn: _creadoEn, ...datos } = UsuarioAutorizadoMapper.aPersistencia(usuario);
    await this.db.usuarioAutorizado.upsert({ where: { id }, create: { id, ...datos }, update: datos });
  }

  async buscarPorTelegramId(telegramId: bigint): Promise<UsuarioAutorizado | null> {
    const fila = await this.db.usuarioAutorizado.findUnique({ where: { telegramId } });
    return fila ? UsuarioAutorizadoMapper.aEntidad(fila) : null;
  }

  async buscarPorId(id: string): Promise<UsuarioAutorizado | null> {
    const fila = await this.db.usuarioAutorizado.findUnique({ where: { id } });
    return fila ? UsuarioAutorizadoMapper.aEntidad(fila) : null;
  }

  async listar(): Promise<UsuarioAutorizado[]> {
    const filas = await this.db.usuarioAutorizado.findMany({ orderBy: { nombre: "asc" } });
    return filas.map(UsuarioAutorizadoMapper.aEntidad);
  }
}
