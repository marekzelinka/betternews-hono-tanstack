import { drizzle } from "drizzle-orm/postgres-js";

import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import postgres from "postgres";
import { z } from "zod";

import { sessionsTable, userRelations, usersTable } from "./db/schemas/auth";
import { commentsRelations, commentsTable } from "./db/schemas/comments";
import { postsRelations, postsTable } from "./db/schemas/posts";
import {
  commentUpvotesRealtions,
  commentUpvotesTable,
  postUpvotesRelations,
  postUpvotesTable,
} from "./db/schemas/upvotes";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
});
const parsedEnv = EnvSchema.parse(process.env);

const queryClient = postgres(parsedEnv.DATABASE_URL);
export const db = drizzle(queryClient, {
  schema: {
    users: usersTable,
    userRelations,
    sessions: sessionsTable,
    posts: postsTable,
    postsRelations,
    postUpvotes: postUpvotesTable,
    postUpvotesRelations,
    comments: commentsTable,
    commentsRelations,
    commentUpvotes: commentUpvotesTable,
    commentUpvotesRealtions,
  },
});

export const adapter = new DrizzlePostgreSQLAdapter(
  db,
  sessionsTable,
  usersTable,
);
