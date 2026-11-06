import { z } from "zod";
import { ROLES, type Rol } from "../../shared/domain/actor.js";

/** DTOs del módulo de usuarios autorizados (los usa el bot con el comando /autorizar). */

const telegramId = z
  .union([z.string().trim().regex(/^\d{1,20}$/), z.number().int().positive(), z.bigint().positive()])
  .transform(valor => BigInt(valor));

export const autorizarUsuarioDto = z
  .object({
    telegramId,
    nombre: z.string().trim().min(1).max(150),
    rol: z
      .string()
      .trim()
      .toUpperCase()
      .pipe(z.enum(ROLES))
      .default("COLABORADOR"),
  })
  .strict();
export type AutorizarUsuarioDto = z.output<typeof autorizarUsuarioDto>;

export const telegramIdDto = z.object({ telegramId });
export const idUsuarioDto = z.object({ id: z.uuid() });
export const editarUsuarioDto = z.object({
  nombre: z.string().trim().min(1).max(150).optional(),
  activo: z.boolean().optional(),
}).strict().refine(datos => Object.keys(datos).length > 0, { message: "Envíe al menos un campo" });

export interface UsuarioAutorizadoDto {
  id: string;
  telegramId: string | null;
  idUsuarioExterno: string | null;
  nombre: string;
  rol: Rol;
  activo: boolean;
}
