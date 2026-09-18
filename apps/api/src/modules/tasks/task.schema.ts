import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required")
    .max(200, "Task title must be at most 200 characters"),

  description: z
    .string()
    .trim()
    .max(5000, "Task description must be at most 5000 characters")
    .optional(),

  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),

  assigneeId: z.string().min(1).optional(),

  dueDate: z.coerce.date().optional(),

  labelIds: z.array(z.string().min(1)).max(20).optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),

    description: z.string().trim().max(5000).optional(),

    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),

    assigneeId: z.string().min(1).nullable().optional(),

    dueDate: z.coerce.date().nullable().optional(),

    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),

    labelIds: z.array(z.string().min(1)).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),

  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),

  assigneeId: z.string().min(1).optional(),

  labelId: z.string().min(1).optional(),

  search: z.string().trim().max(100).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  sortBy: z
    .enum(["createdAt", "updatedAt", "priority", "status", "number", "dueDate"])
    .default("createdAt"),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type TaskQueryInput = z.infer<typeof taskQuerySchema>;

export const myTasksQuerySchema = taskQuerySchema
  .omit({
    assigneeId: true,
    labelId: true,
  });

export type MyTasksQueryInput = z.infer<typeof myTasksQuerySchema>;
