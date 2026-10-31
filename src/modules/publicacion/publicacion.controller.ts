import type { Request, Response } from "express";
import { validar } from "../../shared/validacion.js";
import { idPublicacionDto, listarPublicacionesDto } from "./publicacion.dto.js";
import type { PublicacionService } from "./publicacion.service.js";

/**
 * CONTROLLER: solo traduce HTTP <-> caso de uso.
 *   req (query/params/body) -> DTO validado -> service -> res.json(DTO)
 * No contiene reglas de negocio ni consultas a la base.
 * Los errores que lance el service los atrapa el middleware manejadorErrores.
 *
 * Por alcance del proyecto, la web solo LEE noticias: la escritura entra por el bot.
 */
export class PublicacionController {
  constructor(private readonly service: PublicacionService) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const filtro = validar(listarPublicacionesDto, req.query);
    res.json(await this.service.listarPublicadas(filtro));
  };

  etiquetas = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.listarEtiquetas());
  };

  obtener = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idPublicacionDto, req.params);
    res.json(await this.service.obtenerPublicada(id));
  };
}
