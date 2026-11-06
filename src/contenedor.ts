import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { TelegramAuthController } from "./modules/auth/telegram-auth.controller.js";
import { TelegramStatelessSessionProvider } from "./modules/auth/telegram-stateless-session.provider.js";
import { PerfilExternoAuthService } from "./modules/auth/perfil-externo-auth.service.js";
import { GestionController } from "./modules/gestion/gestion.controller.js";
import { PrismaInformacionContactoRepository } from "./modules/contacto/informacion-contacto.prisma.repository.js";
import { InformacionContactoService } from "./modules/contacto/informacion-contacto.service.js";
import { CloudinaryStorageAdapter } from "./modules/almacenamiento/cloudinary-storage.adapter.js";
import { MiniAppController } from "./modules/miniapp/miniapp.controller.js";
import { MiniAppService } from "./modules/miniapp/miniapp.service.js";
import { PublicacionController } from "./modules/publicacion/publicacion.controller.js";
import { PrismaPublicacionRepository } from "./modules/publicacion/publicacion.prisma.repository.js";
import { PublicacionService } from "./modules/publicacion/publicacion.service.js";
import { crearBot } from "./modules/telegram/telegram.bot.js";
import { TelegramCryptoService } from "./modules/telegram/telegram-crypto.service.js";
import { TelegramMiniAppAuthService } from "./modules/telegram/telegram-miniapp-auth.service.js";
import { PrismaUsuarioAutorizadoRepository } from "./modules/usuario-autorizado/usuario-autorizado.prisma.repository.js";
import { UsuarioAutorizadoService } from "./modules/usuario-autorizado/usuario-autorizado.service.js";

/**
 * COMPOSITION ROOT (inyección de dependencias manual).
 * Es el ÚNICO lugar donde se decide qué implementación concreta usa cada pieza:
 *   repository (Prisma) -> service -> controller / bot
 * Para probar o cambiar una implementación, se cambia aquí y nada más.
 */

// Repositories (infraestructura)
const publicacionRepository = new PrismaPublicacionRepository(prisma);
const usuarioAutorizadoRepository = new PrismaUsuarioAutorizadoRepository(prisma);
const informacionContactoRepository = new PrismaInformacionContactoRepository(prisma);
const almacenamiento =
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
    ? new CloudinaryStorageAdapter(
        env.CLOUDINARY_CLOUD_NAME,
        env.CLOUDINARY_API_KEY,
        env.CLOUDINARY_API_SECRET,
        env.CLOUDINARY_UPLOAD_FOLDER,
      )
    : undefined;

// Services (casos de uso)
const publicacionService = new PublicacionService(publicacionRepository);
const usuarioAutorizadoService = new UsuarioAutorizadoService(usuarioAutorizadoRepository);
const informacionContactoService = new InformacionContactoService(informacionContactoRepository);
const autenticacionWeb = new PerfilExternoAuthService(usuarioAutorizadoRepository, env.AUTH_PERFIL_URL);
let autenticacion: TelegramMiniAppAuthService | undefined;
if (env.TELEGRAM_BOT_TOKEN) {
  autenticacion = new TelegramMiniAppAuthService(
    new TelegramCryptoService(env.TELEGRAM_BOT_TOKEN),
    usuarioAutorizadoService,
    new TelegramStatelessSessionProvider(),
  );
}

// Entradas: controllers HTTP y bot de Telegram
const publicacionController = new PublicacionController(publicacionService);
let telegramAuthController: TelegramAuthController | undefined;
let miniAppController: MiniAppController | undefined;
const gestionController = new GestionController(
  autenticacionWeb,
  publicacionService,
  usuarioAutorizadoService,
  informacionContactoService,
  almacenamiento,
  autenticacion,
);
if (autenticacion) {
  telegramAuthController = new TelegramAuthController(autenticacion);
}
if (
  almacenamiento &&
  env.TELEGRAM_BOT_TOKEN &&
  autenticacion
) {
  miniAppController = new MiniAppController(
    new MiniAppService(autenticacion, almacenamiento, publicacionService),
  );
}
const bot = env.TELEGRAM_BOT_TOKEN
  ? crearBot(env.TELEGRAM_BOT_TOKEN, { usuarios: usuarioAutorizadoService, publicaciones: publicacionService })
  : null;

export const contenedor = {
  publicacionService,
  usuarioAutorizadoService,
  publicacionController,
  telegramAuthController,
  miniAppController,
  gestionController,
  bot,
};
