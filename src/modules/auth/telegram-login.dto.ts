import { z } from "zod";

export const telegramLoginDto = z.object({
  initData: z.string().trim().min(1).max(8_192),
}).strict();

export type TelegramLoginDto = z.output<typeof telegramLoginDto>;
