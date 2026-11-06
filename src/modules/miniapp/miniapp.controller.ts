import type { Request, Response } from "express";
import { NoAutorizadoError } from "../../shared/domain/errores.js";
import { validar } from "../../shared/validacion.js";
import { crearPublicacionMiniAppDto } from "./miniapp.dto.js";
import type { MiniAppService } from "./miniapp.service.js";

export class MiniAppController {
  constructor(private readonly service: MiniAppService) {}

  crearFirmaSubida = async (req: Request, res: Response): Promise<void> => {
    const firma = await this.service.crearFirmaSubida(this.obtenerInitData(req));
    res.json(firma);
  };

  crearPublicacion = async (req: Request, res: Response): Promise<void> => {
    const dto = validar(crearPublicacionMiniAppDto, req.body);
    const publicacion = await this.service.crearPublicacion(dto, this.obtenerInitData(req));
    res.status(201).json(publicacion);
  };

  private obtenerInitData(req: Request): string {
    const initData = req.get("X-Telegram-Init-Data");
    if (!initData) throw new NoAutorizadoError("Falta la sesión de Telegram");
    return initData;
  }
}
