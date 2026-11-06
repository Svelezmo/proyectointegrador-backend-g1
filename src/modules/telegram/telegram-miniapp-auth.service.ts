import type { Actor } from "../../shared/domain/actor.js";
import type {
  TelegramAuthSession,
  TelegramSessionProviderPort,
} from "../auth/telegram-session-provider.port.js";
import type { TelegramLoginPort } from "../auth/telegram-login.port.js";
import type { TelegramCryptoValidatorPort } from "./telegram-crypto-validator.port.js";
import type { TelegramMiniAppAuthPort } from "./telegram-miniapp-auth.port.js";
import type { TelegramUserAuthorizationPort } from "./telegram-user-authorization.port.js";

export class TelegramMiniAppAuthService implements TelegramMiniAppAuthPort, TelegramLoginPort {
  constructor(
    private readonly validador: TelegramCryptoValidatorPort,
    private readonly usuarios: TelegramUserAuthorizationPort,
    private readonly sesiones: TelegramSessionProviderPort,
  ) {}

  async autenticar(initData: string): Promise<Actor> {
    return (await this.iniciarSesion(initData)).actor;
  }

  async iniciarSesion(initData: string): Promise<TelegramAuthSession> {
    const datosTelegram = this.validador.validar(initData);
    const actor = await this.usuarios.autenticarPorTelegram(datosTelegram.telegramId);
    return this.sesiones.crearSesion(actor);
  }
}
