import type { TelegramInitData } from "./telegram-init-data.js";

export interface TelegramCryptoValidatorPort {
  validar(initData: string): TelegramInitData;
}
