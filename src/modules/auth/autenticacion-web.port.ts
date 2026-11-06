import type { Actor } from "../../shared/domain/actor.js";

export interface AutenticacionWebPort {
  autenticar(token: string): Promise<Actor>;
}
