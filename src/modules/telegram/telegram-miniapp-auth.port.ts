import type { Actor } from "../../shared/domain/actor.js";

export interface TelegramMiniAppAuthPort {
  autenticar(initData: string): Promise<Actor>;
}
