import type { Actor } from "../../shared/domain/actor.js";
import type {
  TelegramAuthSession,
  TelegramSessionProviderPort,
} from "./telegram-session-provider.port.js";

export class TelegramStatelessSessionProvider implements TelegramSessionProviderPort {
  async crearSesion(actor: Actor): Promise<TelegramAuthSession> {
    return { authenticated: true, actor };
  }
}
