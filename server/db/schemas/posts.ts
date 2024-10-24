import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { usersTable } from "./auth";
import { commentsTable } from "./comments";
import { postUpvotesTable } from "./upvotes";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  content: text("content"),
  points: integer("points").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const postsRelations = relations(postsTable, ({ one, many }) => {
  return {
    author: one(usersTable, {
      fields: [postsTable.userId],
      references: [usersTable.id],
      relationName: "author",
    }),
    postUpvotesTable: many(postUpvotesTable, { relationName: "postUpvotes" }),
    comments: many(commentsTable),
  };
});
