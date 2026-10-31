import { validar } from "../../../shared/validacion.js";
import { crearPublicacionDto, idPublicacionDto, type PublicacionInternaDto } from "../../publicacion/publicacion.dto.js";
import type { PublicacionService } from "../../publicacion/publicacion.service.js";
import { actorDe, argumentosDe, type ContextoUpNews } from "../telegram.contexto.js";

type Composer<TContext> = {
  command(nombre: string, handler: (ctx: TContext) => Promise<void>): void;
};

/**
 * Los comandos del bot son otro "controlador": igual que PublicacionController para HTTP,
 * convierten el mensaje en un DTO, llaman al service y responden. No tienen reglas de negocio.
 *
 * Versión inicial con comandos de una línea; después se puede cambiar por formularios
 * paso a paso (plugin @grammyjs/conversations) sin tocar el service.
 */
export function registrarComandosPublicacion(bot: Composer<ContextoUpNews>, service: PublicacionService): void {
  bot.command("nueva", async ctx => {
    const [titulo = "", cuerpo = "", etiqueta] = argumentosDe(ctx).split("|").map(parte => parte.trim());
    const dto = validar(crearPublicacionDto, { titulo, cuerpo, ...(etiqueta ? { etiqueta } : {}) });
    const creada = await service.crear(dto, actorDe(ctx));
    await ctx.reply(`Borrador creado.\n\n${resumen(creada)}\n\nPara publicarlo: /publicar ${creada.id}`);
  });

  bot.command("enviar", async ctx => {
    const actualizada = await service.enviarAAprobacion(idDe(ctx), actorDe(ctx));
    await ctx.reply(`Enviada a aprobación.\n\n${resumen(actualizada)}`);
  });

  bot.command("publicar", async ctx => {
    const actualizada = await service.publicar(idDe(ctx), actorDe(ctx));
    await ctx.reply(`Publicada en la web.\n\n${resumen(actualizada)}`);
  });

  bot.command("archivar", async ctx => {
    const actualizada = await service.archivar(idDe(ctx), actorDe(ctx));
    await ctx.reply(`Archivada.\n\n${resumen(actualizada)}`);
  });

  bot.command("pendientes", async ctx => {
    const pendientes = await service.listarPorEstado("PENDIENTE_APROBACION");
    await ctx.reply(pendientes.length ? pendientes.map(resumen).join("\n\n") : "No hay publicaciones pendientes.");
  });

  bot.command("ultimas", async ctx => {
    const { items } = await service.listarPublicadas({ pagina: 1, limite: 5 });
    await ctx.reply(items.length ? items.map(p => `• ${p.titulo}\n  id: ${p.id}`).join("\n\n") : "Aún no hay publicaciones.");
  });
}

function idDe(ctx: ContextoUpNews): string {
  return validar(idPublicacionDto, { id: argumentosDe(ctx) }).id;
}

function resumen(p: PublicacionInternaDto): string {
  return [`📰 ${p.titulo}`, `Estado: ${p.estado}`, p.etiqueta ? `Etiqueta: ${p.etiqueta}` : null, `id: ${p.id}`]
    .filter(Boolean)
    .join("\n");
}
