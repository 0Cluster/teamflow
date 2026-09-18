import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z
    .string()
    .regex(
      /^mongodb(\+srv)?:\/\//,
      "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    ),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(/^\d+(s|m|h|d|w|y)$/, "Invalid JWT expiration format")
    .default("15m"),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(/^\d+(s|m|h|d|w|y)$/, "Invalid JWT refresh expiration format")
    .default("7d"),

  REDIS_URL: z
    .string()
    .min(1, "REDIS_URL must be a valid Redis connection string")
    .optional(),

  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),

  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
}).refine(
  (data) =>
    Boolean(data.UPSTASH_REDIS_REST_URL) ===
    Boolean(data.UPSTASH_REDIS_REST_TOKEN),
  {
    message:
      "Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or neither",
  },
);

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment variables:");

  console.error(result.error.format());

  process.exit(1);
}

export const env = result.data;
