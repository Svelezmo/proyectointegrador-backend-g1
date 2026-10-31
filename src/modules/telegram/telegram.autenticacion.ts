import type { MiddlewareFn } from "grammy";
import { NoAutorizadoError } from "../../shared/domain/errores.js";
import type { UsuarioAutorizadoService } from "../usuario-autorizado/usuario-autorizado.service.js";
import type { ContextoUpNews } from "./telegram.contexto.js";

/**
 * Middleware de autenticación del bot (equivale al "guard" de una API).
 * 1. Solo atiende chats privados (evita que alguien use el bot desde un grupo).
 * 2. Toma ctx.from.id, que lo pone Telegram y no puede falsificarse si el webhook
 *    está protegido con secret_token.
 * 3. Lo busca en la lista blanca; si está activo deja pasar con ctx.actor lleno.
 */
export function autenticacionTelegram(usuarios: UsuarioAutorizadoService): MiddlewareFn<ContextoUpNews> {
  return async (ctx, next) => {
    if (ctx.chat?.type !== "private" || !ctx.from) return;
    try {
      ctx.actor = await usuarios.autenticarPorTelegram(BigInt(ctx.from.id));
    } catch (error) {
      if (error instanceof NoAutorizadoError) {
        await ctx.reply(`${error.message}.\nEnvía /miid y comparte ese número con la directora para que te habilite.`);
        return;
      }
      throw error;
    }
    await next();
  };
}
