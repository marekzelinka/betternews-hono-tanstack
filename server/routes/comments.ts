import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq, sql } from "drizzle-orm";

import { db } from "@/adapter";
import type { Context } from "@/context";
import { commentsTable } from "@/db/schemas/comments";
import { postsTable } from "@/db/schemas/posts";
import { loggedIn } from "@/middleware/logged-in";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import {
  createCommentSchema,
  type Comment,
  type SuccessResponse,
} from "@/shared/types";
import { getISOFormatDateQuery } from "@/lib/utils";

export const commentsRouter = new Hono<Context>().post(
  "/:commentId",
  loggedIn,
  zValidator("param", z.object({ commentId: z.coerce.number() })),
  zValidator("form", createCommentSchema),
  async (c) => {
    const user = c.get("user")!;

    const { commentId } = c.req.valid("param");
    const { content } = c.req.valid("form");

    const [comment] = await db.transaction(async (tx) => {
      const [updatedParentComment] = await tx
        .update(commentsTable)
        .set({ commentCount: sql<number>`${commentsTable.commentCount} + 1` })
        .where(eq(commentsTable.id, commentId))
        .returning({
          postId: commentsTable.postId,
          commentCount: commentsTable.commentCount,
          depth: commentsTable.depth,
        });
      if (!updatedParentComment) {
        throw new HTTPException(404, { message: "Parent comment not found" });
      }

      const [updatedPost] = await tx
        .update(postsTable)
        .set({
          commentCount: sql<number>`${postsTable.commentCount} + 1`,
        })
        .where(eq(postsTable.id, updatedParentComment.postId))
        .returning({ commentCount: postsTable.commentCount });
      if (!updatedPost) {
        throw new HTTPException(404, {
          message: "Post of parent comment not found",
        });
      }

      return await tx
        .insert(commentsTable)
        .values({
          userId: user.id,
          parentCommentId: commentId,
          content,
          postId: updatedParentComment.postId,
          depth: updatedParentComment.depth + 1,
        })
        .returning({
          id: commentsTable.id,
          userId: commentsTable.userId,
          postId: commentsTable.postId,
          content: commentsTable.content,
          points: commentsTable.points,
          commentCount: commentsTable.commentCount,
          depth: commentsTable.depth,
          parentCommentId: commentsTable.parentCommentId,
          createdAt: getISOFormatDateQuery(commentsTable.createdAt).as(
            "created_at",
          ),
        });
    });

    return c.json<SuccessResponse<{ comment: Comment }>>(
      {
        success: true,
        message: "Comment created",
        data: {
          comment: {
            ...comment,
            author: user,
            commentUpvotes: [],
            childComments: [],
          },
        },
      },
      201,
    );
  },
);
