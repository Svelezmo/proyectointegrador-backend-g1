import { createHmac, timingSafeEqual } from "node:crypto";
import { TelegramInitDataInvalidoError } from "../../shared/domain/errores.js";
import type { TelegramCryptoValidatorPort } from "./telegram-crypto-validator.port.js";
import type { TelegramInitData } from "./telegram-init-data.js";

const EDAD_MAXIMA_INIT_DATA_SEGUNDOS = 24 * 60 * 60;
const TOLERANCIA_FUTURO_SEGUNDOS = 60;
const TAMANO_MAXIMO_INIT_DATA = 8_192;

export class TelegramCryptoService implements TelegramCryptoValidatorPort {
  constructor(private readonly botToken: string) {}

  validar(initData: string): TelegramInitData {
    if (!initData || initData.length > TAMANO_MAXIMO_INIT_DATA) {
      throw new TelegramInitDataInvalidoError();
    }

    const parametros = new URLSearchParams(initData);
    const entradas = [...parametros.entries()];
    const hash = parametros.get("hash");
    const authDateValue = parametros.get("auth_date");
    const userData = parametros.get("user");
    const authDate = Number(authDateValue);
    const keys = entradas.map(([key]) => key);
    if (
      !hash ||
      !/^[a-f\d]{64}$/i.test(hash) ||
      authDateValue === null ||
      !Number.isSafeInteger(authDate) ||
      !userData ||
      new Set(keys).size !== keys.length
    ) {
      throw new TelegramInitDataInvalidoError();
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      authDate > now + TOLERANCIA_FUTURO_SEGUNDOS ||
      now - authDate > EDAD_MAXIMA_INIT_DATA_SEGUNDOS
    ) {
      throw new TelegramInitDataInvalidoError();
    }

    const dataCheckString = entradas
      .filter(([key]) => key !== "hash")
      .sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const secretKey = createHmac("sha256", "WebAppData").update(this.botToken).digest();
    const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();
    const receivedHash = Buffer.from(hash, "hex");
    if (
      expectedHash.length !== receivedHash.length ||
      !timingSafeEqual(expectedHash, receivedHash)
    ) {
      throw new TelegramInitDataInvalidoError();
    }

    try {
      const user = JSON.parse(userData) as { id?: unknown };
      if (typeof user.id !== "number" || !Number.isSafeInteger(user.id) || user.id <= 0) {
        throw new Error("ID de Telegram inválido");
      }
      return { telegramId: BigInt(user.id), authDate };
    } catch {
      throw new TelegramInitDataInvalidoError();
    }
  }
}
