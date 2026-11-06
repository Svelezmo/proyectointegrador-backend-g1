import type { TelegramAuthSession } from "./telegram-session-provider.port.js";

export interface TelegramLoginPort {
  iniciarSesion(initData: string): Promise<TelegramAuthSession>;
}
