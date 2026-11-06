import type { Request, Response } from "express";
import type { InformacionContactoService } from "./informacion-contacto.service.js";

/**
 * CONTROLLER público de contacto: la página web muestra estos datos en el pie de página.
 * La administración (crear, editar, borrar) sigue en /api/gestion/contactos, solo para la directora.
 */
export class InformacionContactoController {
  constructor(private readonly service: InformacionContactoService) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(await this.service.listarPublico());
  };
}
