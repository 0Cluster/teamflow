import { z } from "zod";

export const createLabelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Label name is required")
    .max(50, "Label name must be at most 50 characters"),

  color: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      "Color must be a valid hex color",
    ),
});

export const updateLabelSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .optional(),

    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided",
    },
  );

export type CreateLabelInput = z.infer<
  typeof createLabelSchema
>;

export type UpdateLabelInput = z.infer<
  typeof updateLabelSchema
>;
