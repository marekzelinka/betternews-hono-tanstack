import { drizzle } from "drizzle-orm/postgres-js";

import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import postgres from "postgres";
import { z } from "zod";

import { sessionsTable, usersTable } from "./db/schemas/auth";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
});
const parsedEnv = EnvSchema.parse(process.env);

const queryClient = postgres(parsedEnv.DATABASE_URL);
export const db = drizzle(queryClient, {
  schema: {
    user: usersTable,
    session: sessionsTable,
  },
});

export const adapter = new DrizzlePostgreSQLAdapter(
  db,
  sessionsTable,
  usersTable,
);
