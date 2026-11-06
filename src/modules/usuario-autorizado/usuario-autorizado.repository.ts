import type { UsuarioAutorizado } from "./usuario-autorizado.entity.js";

/** REPOSITORY (contrato). Implementación: usuario-autorizado.prisma.repository.ts */
export interface UsuarioAutorizadoRepository {
  guardar(usuario: UsuarioAutorizado): Promise<void>;
  buscarPorId(id: string): Promise<UsuarioAutorizado | null>;
  buscarPorTelegramId(telegramId: bigint): Promise<UsuarioAutorizado | null>;
  listar(): Promise<UsuarioAutorizado[]>;
}
