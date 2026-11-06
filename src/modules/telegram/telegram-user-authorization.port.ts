import type { Actor } from "../../shared/domain/actor.js";

export interface TelegramUserAuthorizationPort {
  autenticarPorTelegram(telegramId: bigint): Promise<Actor>;
}
