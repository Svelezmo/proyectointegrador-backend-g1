import type { Request, Response } from "express";
import { validar } from "../../shared/validacion.js";
import { telegramLoginDto } from "./telegram-login.dto.js";
import type { TelegramLoginPort } from "./telegram-login.port.js";

export class TelegramAuthController {
  constructor(private readonly autenticacion: TelegramLoginPort) {}

  iniciarSesion = async (req: Request, res: Response): Promise<void> => {
    const dto = validar(telegramLoginDto, req.body);
    const sesion = await this.autenticacion.iniciarSesion(dto.initData);
    res.json(sesion);
  };
}
