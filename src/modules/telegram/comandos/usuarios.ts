import type { Composer } from "grammy";
import { validar } from "../../../shared/validacion.js";
import { autorizarUsuarioDto, telegramIdDto, type UsuarioAutorizadoDto } from "../../usuario-autorizado/usuario-autorizado.dto.js";
import type { UsuarioAutorizadoService } from "../../usuario-autorizado/usuario-autorizado.service.js";
import { actorDe, argumentosDe, type ContextoUpNews } from "../telegram.contexto.js";

/** Administración de la lista blanca desde el chat (solo la directora; lo valida el service). */
export function registrarComandosUsuarios(bot: Composer<ContextoUpNews>, service: UsuarioAutorizadoService): void {
  bot.command("autorizar", async ctx => {
    const [telegramId, rol, ...nombre] = argumentosDe(ctx).split(/\s+/);
    const dto = validar(autorizarUsuarioDto, { telegramId, rol, nombre: nombre.join(" ") });
    const usuario = await service.autorizar(dto, actorDe(ctx));
    await ctx.reply(`Usuario autorizado.\n${linea(usuario)}`);
  });

  bot.command("revocar", async ctx => {
    const { telegramId } = validar(telegramIdDto, { telegramId: argumentosDe(ctx) });
    const usuario = await service.revocar(telegramId, actorDe(ctx));
    await ctx.reply(`Acceso revocado.\n${linea(usuario)}`);
  });

  bot.command("usuarios", async ctx => {
    const usuarios = await service.listar(actorDe(ctx));
    await ctx.reply(usuarios.length ? usuarios.map(linea).join("\n") : "No hay usuarios autorizados.");
  });
}

function linea(u: UsuarioAutorizadoDto): string {
  return `${u.activo ? "✅" : "⛔"} ${u.nombre} — ${u.rol} — ${u.telegramId ?? "usuario web"}`;
}
