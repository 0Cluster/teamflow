import { z } from "zod";

export const addMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  role: z
    .enum(["ADMIN", "MEMBER", "VIEWER"])
    .default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum([
    "OWNER",
    "ADMIN",
    "MEMBER",
    "VIEWER",
  ]),
});

export type AddMemberInput = z.infer<
  typeof addMemberSchema
>;

export type UpdateMemberRoleInput = z.infer<
  typeof updateMemberRoleSchema
>;
