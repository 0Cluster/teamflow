import { z } from "zod";

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  unreadOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
});

export type NotificationQueryInput = z.infer<
  typeof notificationQuerySchema
>;
