import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { usersTable } from "./auth";
import { postsTable } from "./posts";
import { commentUpvotesTable } from "./upvotes";

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  postId: integer("post_id").notNull(),
  content: text("content").notNull(),
  points: integer("points").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  depth: integer("depth").default(0).notNull(),
  parentCommentId: integer("parent_comment_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertCommentSchema = createInsertSchema(commentsTable, {
  content: z
    .string()
    .min(3, { message: "Comment must be at least 3 characters long" }),
});

export const commentsRelations = relations(commentsTable, ({ one, many }) => {
  return {
    author: one(usersTable, {
      fields: [commentsTable.userId],
      references: [usersTable.id],
      relationName: "author",
    }),
    parentComment: one(commentsTable, {
      fields: [commentsTable.parentCommentId],
      references: [commentsTable.id],
      relationName: "childComments",
    }),
    childComments: many(commentsTable, {
      relationName: "childComments",
    }),
    post: one(postsTable, {
      fields: [commentsTable.postId],
      references: [postsTable.id],
    }),
    commentUpvotes: many(commentUpvotesTable, {
      relationName: "commentUpvotes",
    }),
  };
});
