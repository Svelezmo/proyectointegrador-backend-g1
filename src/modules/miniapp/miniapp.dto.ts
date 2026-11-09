import { z } from "zod";
import { crearPublicacionDto } from "../publicacion/publicacion.dto.js";

export const crearPublicacionMiniAppDto = crearPublicacionDto.extend({
  imagenUrl: z.url({ protocol: /^https$/ }).nullable().optional(),
});

export type CrearPublicacionMiniAppDto = z.output<typeof crearPublicacionMiniAppDto>;
