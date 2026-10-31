import { Bot, BotError, GrammyError, HttpError } from "grammy";
import { ErrorDeDominio, ValidacionError } from "../../shared/domain/errores.js";
import type { PublicacionService } from "../publicacion/publicacion.service.js";
import type { UsuarioAutorizadoService } from "../usuario-autorizado/usuario-autorizado.service.js";
import { registrarComandosPublicacion } from "./comandos/publicaciones.js";
import { registrarComandosPublicos } from "./comandos/publicos.js";
import { registrarComandosUsuarios } from "./comandos/usuarios.js";
import { autenticacionTelegram } from "./telegram.autenticacion.js";
import type { ContextoUpNews } from "./telegram.contexto.js";

export interface DependenciasBot {
  usuarios: UsuarioAutorizadoService;
  publicaciones: PublicacionService;
}

/**
 * Arma el bot. El ORDEN importa:
 *   1. comandos públicos (/start, /ayuda, /miid)
 *   2. middleware de autenticación (corta aquí si no está en la lista blanca)
 *   3. comandos protegidos
 * Todo va dentro de un errorBoundary para que los errores se respondan en el chat
 * tanto en long polling como en webhook (en webhook, bot.catch no se usa).
 */
export function crearBot(token: string, deps: DependenciasBot): Bot<ContextoUpNews> {
  const bot = new Bot<ContextoUpNews>(token);
  const raiz = bot.errorBoundary(manejarErrorBot);

  registrarComandosPublicos(raiz);
  raiz.use(autenticacionTelegram(deps.usuarios));
  registrarComandosPublicacion(raiz, deps.publicaciones);
  registrarComandosUsuarios(raiz, deps.usuarios);
  raiz.on("message", ctx => ctx.reply("No entendí ese mensaje. Envía /ayuda para ver los comandos."));

  bot.catch(manejarErrorBot);
  return bot;
}

/** Traduce errores de dominio a mensajes de chat (equivale a manejadorErrores en HTTP). */
async function manejarErrorBot({ ctx, error }: BotError<ContextoUpNews>): Promise<void> {
  if (error instanceof ErrorDeDominio) {
    const detalle = error instanceof ValidacionError && error.campos.length ? ` (${error.campos.join(", ")})` : "";
    await ctx.reply(`⚠️ ${error.message}${detalle}`).catch(() => {});
    return;
  }
  if (error instanceof GrammyError || error instanceof HttpError) {
    console.error("Error comunicándose con Telegram:", error.message);
    return;
  }
  console.error("Error no controlado en el bot:", error);
  await ctx.reply("Ocurrió un error inesperado. Intenta de nuevo más tarde.").catch(() => {});
}

/** Menú de comandos que muestra Telegram al escribir "/". */
export const COMANDOS_MENU = [
  { command: "nueva", description: "Crear borrador: Título | Cuerpo | etiqueta" },
  { command: "pendientes", description: "Publicaciones esperando aprobación" },
  { command: "ultimas", description: "Últimas publicaciones en la web" },
  { command: "ayuda", description: "Ver todos los comandos" },
  { command: "miid", description: "Ver mi ID de Telegram" },
];
