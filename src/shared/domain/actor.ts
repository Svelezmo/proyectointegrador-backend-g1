/**
 * Roles dentro de UP News. Deben coincidir con el enum RolUpNews de prisma/schema.prisma.
 */
export const ROLES = ["DIRECTORA", "COMUNICACIONES", "COLABORADOR"] as const;
export type Rol = (typeof ROLES)[number];

/**
 * "Quién está haciendo la acción". Es lo único que los services saben de la identidad:
 * no saben si vino de Telegram, de una API key o de otro mecanismo futuro.
 */
export interface Actor {
  readonly id: string;
  readonly nombre: string;
  readonly rol: Rol;
}

/** Solo la directora puede aprobar y publicar. */
export function puedeAprobar(actor: Actor): boolean {
  return actor.rol === "DIRECTORA";
}
