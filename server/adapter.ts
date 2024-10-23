import { drizzle } from "drizzle-orm/postgres-js";

import postgres from "postgres";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
});
const parsedEnv = EnvSchema.parse(process.env);

const queryClient = postgres(parsedEnv.DATABASE_URL);
export const db = drizzle(queryClient);
