import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { usersTable } from "./auth";
import { commentsTable } from "./comments";
import { postsTable } from "./posts";

export const postUpvotesTable = pgTable("post_upvotes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const postUpvotesRelations = relations(postUpvotesTable, ({ one }) => {
  return {
    post: one(postsTable, {
      fields: [postUpvotesTable.postId],
      references: [postsTable.id],
      relationName: "postUpvotes",
    }),
    user: one(usersTable, {
      fields: [postUpvotesTable.userId],
      references: [usersTable.id],
      relationName: "user",
    }),
  };
});

export const commentUpvotesTable = pgTable("comment_upvotes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const commentUpvotesRealtions = relations(
  commentUpvotesTable,
  ({ one }) => {
    return {
      comment: one(commentsTable, {
        fields: [commentUpvotesTable.commentId],
        references: [commentsTable.id],
        relationName: "commentUpvotes",
      }),
      user: one(usersTable, {
        fields: [commentUpvotesTable.userId],
        references: [usersTable.id],
        relationName: "user",
      }),
    };
  },
);
