import type { UsuarioAutorizado as UsuarioAutorizadoModelo } from "../../generated/prisma/client.js";
import type { UsuarioAutorizadoDto } from "./usuario-autorizado.dto.js";
import { UsuarioAutorizado } from "./usuario-autorizado.entity.js";

/** MAPPER: fila de Prisma <-> Entity -> DTO. */
export const UsuarioAutorizadoMapper = {
  aEntidad(fila: UsuarioAutorizadoModelo): UsuarioAutorizado {
    return UsuarioAutorizado.reconstruir({
      id: fila.id,
      telegramId: fila.telegramId,
      nombre: fila.nombre,
      rol: fila.rol,
      activo: fila.activo,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  },

  aPersistencia(usuario: UsuarioAutorizado): UsuarioAutorizadoModelo {
    return { ...usuario.aProps() };
  },

  aDto(usuario: UsuarioAutorizado): UsuarioAutorizadoDto {
    const u = usuario.aProps();
    return { id: u.id, telegramId: u.telegramId.toString(), nombre: u.nombre, rol: u.rol, activo: u.activo };
  },
};
