import { z } from "zod";

export const TIPOS_CONTACTO = ["RED_SOCIAL", "NUMERO_CONTACTO", "DIRECCION"] as const;

export const informacionContactoDto = z.object({
  nombre: z.string().trim().min(1).max(100),
  tipo: z.enum(TIPOS_CONTACTO),
  informacion: z.string().trim().min(1).max(2_000),
}).strict();

export const idContactoDto = z.object({ id: z.uuid() });
export type InformacionContactoDto = z.output<typeof informacionContactoDto>;
export interface InformacionContactoRespuesta extends InformacionContactoDto {
  id: string;
  actualizadoEn: string;
}
