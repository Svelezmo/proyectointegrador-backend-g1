import type { Context } from "grammy";
import type { Actor } from "../../shared/domain/actor.js";

/** Contexto del bot extendido con el Actor autenticado (lo llena el middleware de autenticación). */
export type ContextoUpNews = Context & { actor?: Actor };

/** Obtiene el Actor; solo se usa en comandos registrados DESPUÉS del middleware de autenticación. */
export function actorDe(ctx: ContextoUpNews): Actor {
  if (!ctx.actor) throw new Error("Comando protegido registrado antes del middleware de autenticación");
  return ctx.actor;
}

/** Texto que sigue al comando: "/publicar abc" -> "abc". */
export function argumentosDe(ctx: ContextoUpNews): string {
  return typeof ctx.match === "string" ? ctx.match.trim() : "";
}
