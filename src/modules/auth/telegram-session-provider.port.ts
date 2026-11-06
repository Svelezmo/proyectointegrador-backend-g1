import type { Actor } from "../../shared/domain/actor.js";

export interface TelegramAuthSession {
  readonly authenticated: true;
  readonly actor: Actor;
}

export interface TelegramSessionProviderPort {
  crearSesion(actor: Actor): Promise<TelegramAuthSession>;
}
