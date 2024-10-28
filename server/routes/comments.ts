import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, asc, countDistinct, desc, eq, sql } from "drizzle-orm";

import { db } from "@/adapter";
import type { Context } from "@/context";
import { commentsTable } from "@/db/schemas/comments";
import { postsTable } from "@/db/schemas/posts";
import { commentUpvotesTable } from "@/db/schemas/upvotes";
import { loggedIn } from "@/middleware/logged-in";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import {
  createCommentSchema,
  paginationSchema,
  type Comment,
  type PaginatedResponse,
  type SuccessResponse,
} from "@/shared/types";
import { getISOFormatDateQuery } from "@/lib/utils";

export const commentsRouter = new Hono<Context>()
  .post(
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
  )
  .get(
    "/:commentId/comments",
    zValidator("param", z.object({ commentId: z.coerce.number() })),
    zValidator("query", paginationSchema),
    async (c) => {
      const user = c.get("user");

      const { commentId } = c.req.valid("param");
      const { limit, page, sortBy, orderBy } = c.req.valid("query");

      const offset = (page - 1) * limit;
      const sortByColumn =
        sortBy === "points" ? commentsTable.points : commentsTable.createdAt;
      const sortOrder =
        orderBy === "desc" ? desc(sortByColumn) : asc(sortByColumn);

      const [count] = await db
        .select({ count: countDistinct(commentsTable.id) })
        .from(commentsTable)
        .where(eq(commentsTable.parentCommentId, commentId));

      const comments = await db.query.comments.findMany({
        where: and(eq(commentsTable.parentCommentId, commentId)),
        orderBy: sortOrder,
        limit,
        offset,
        with: {
          author: {
            columns: {
              id: true,
              username: true,
            },
          },
          commentUpvotes: {
            columns: { userId: true },
            where: eq(commentUpvotesTable.userId, user?.id ?? ""),
            limit: 1,
          },
        },
        extras: {
          createdAt: getISOFormatDateQuery(commentsTable.createdAt).as(
            "created_at",
          ),
        },
      });

      return c.json<PaginatedResponse<{ comments: Comment[] }>>(
        {
          success: true,
          message: "Comments fetched",
          data: { comments: comments as Comment[] },
          pagination: {
            page,
            totalPages: Math.ceil(count.count / limit),
          },
        },
        200,
      );
    },
  )
  .patch(
    "/:commentId/upvote",
    loggedIn,
    zValidator("param", z.object({ commentId: z.coerce.number() })),
    async (c) => {
      const user = c.get("user")!;

      const { commentId } = c.req.valid("param");

      let pointsChange: -1 | 1 = 1;
      const points = await db.transaction(async (tx) => {
        const [existingUpvote] = await tx
          .select()
          .from(commentUpvotesTable)
          .where(
            and(
              eq(commentUpvotesTable.commentId, commentId),
              eq(commentUpvotesTable.userId, user.id),
            ),
          )
          .limit(1);

        pointsChange = existingUpvote ? -1 : 1;

        const [updatedComment] = await tx
          .update(commentsTable)
          .set({
            points: sql<number>`${commentsTable.points} + ${pointsChange}`,
          })
          .where(and(eq(commentsTable.id, commentId)))
          .returning({ points: commentsTable.points });
        if (!updatedComment) {
          throw new HTTPException(404, { message: "Comment not found" });
        }

        if (existingUpvote) {
          await tx
            .delete(commentUpvotesTable)
            .where(eq(commentUpvotesTable.id, existingUpvote.id));
        } else {
          await tx.insert(commentUpvotesTable).values({
            commentId,
            userId: user.id,
          });
        }

        return updatedComment.points;
      });

      const isUpvoted = pointsChange > 0;

      return c.json<
        SuccessResponse<{ count: number; commentUpvotes: { userId: string }[] }>
      >(
        {
          success: true,
          message: "Comment updated",
          data: {
            count: points,
            commentUpvotes: isUpvoted ? [{ userId: user.id }] : [],
          },
        },
        200,
      );
    },
  );
