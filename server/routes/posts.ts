import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, asc, countDistinct, desc, eq, sql } from "drizzle-orm";

import { db } from "@/adapter";
import type { Context } from "@/context";
import { usersTable } from "@/db/schemas/auth";
import { postsTable } from "@/db/schemas/posts";
import { postUpvotesTable } from "@/db/schemas/upvotes";
import { loggedIn } from "@/middleware/logged-in";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import {
  createPostSchema,
  paginationSchema,
  type PaginatedResponse,
  type Post,
  type SuccessResponse,
} from "@/shared/types";
import { getISOFormatDateQuery } from "@/lib/utils";

export const postsRouter = new Hono<Context>()
  .post("/", loggedIn, zValidator("form", createPostSchema), async (c) => {
    const user = c.get("user")!;

    const { title, url, content } = c.req.valid("form");

    const [post] = await db
      .insert(postsTable)
      .values({
        userId: user.id,
        title,
        url,
        content,
      })
      .returning({ id: postsTable.id });

    return c.json<SuccessResponse<{ postId: number }>>(
      {
        success: true,
        message: "Post created",
        data: { postId: post.id },
      },
      201,
    );
  })
  .patch(
    "/:postId/upvote",
    loggedIn,
    zValidator("param", z.object({ postId: z.coerce.number() })),
    async (c) => {
      const user = c.get("user")!;

      const { postId } = c.req.valid("param");

      let pointsChange: -1 | 1 = 1;
      const points = await db.transaction(async (tx) => {
        const [existingUpvote] = await tx
          .select()
          .from(postUpvotesTable)
          .where(
            and(
              eq(postUpvotesTable.postId, postId),
              eq(postUpvotesTable.userId, user.id),
            ),
          )
          .limit(1);

        pointsChange = existingUpvote ? -1 : 1;

        const [updatedPost] = await tx
          .update(postsTable)
          .set({ points: sql<number>`${postsTable.points} + ${pointsChange}` })
          .where(and(eq(postsTable.id, postId)))
          .returning({ points: postsTable.points });
        if (!updatedPost) {
          throw new HTTPException(404, { message: "Post not found" });
        }

        if (existingUpvote) {
          await tx
            .delete(postUpvotesTable)
            .where(eq(postUpvotesTable.id, existingUpvote.id));
        } else {
          await tx.insert(postUpvotesTable).values({
            postId,
            userId: user.id,
          });
        }

        return updatedPost.points;
      });

      const isUpvoted = pointsChange > 0;

      return c.json<SuccessResponse<{ count: number; isUpvoted: boolean }>>(
        {
          success: true,
          message: "Post updated",
          data: { count: points, isUpvoted },
        },
        200,
      );
    },
  )
  .get("/", zValidator("query", paginationSchema), async (c) => {
    const user = c.get("user");

    const { limit, page, sortBy, orderBy, author, site } = c.req.valid("query");

    const offset = (page - 1) * limit;
    const sortByColumn =
      sortBy === "points" ? postsTable.points : postsTable.createdAt;
    const sortOrder =
      orderBy === "desc" ? desc(sortByColumn) : asc(sortByColumn);
    const [count] = await db
      .select({ count: countDistinct(postsTable.id) })
      .from(postsTable)
      .where(
        and(
          author ? eq(postsTable.userId, author) : undefined,
          site ? eq(postsTable.url, site) : undefined,
        ),
      );
    const postsQuery = db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        url: postsTable.url,
        content: postsTable.content,
        points: postsTable.points,
        commentCount: postsTable.commentCount,
        createdAt: getISOFormatDateQuery(postsTable.createdAt),
        author: {
          id: usersTable.id,
          username: usersTable.username,
        },
        isUpvoted: user
          ? sql<boolean>`CASE WHEN ${postUpvotesTable.userId} IS NOT NULL THEN true ELSE false END`
          : sql<boolean>`false`,
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset)
      .where(
        and(
          author ? eq(postsTable.userId, author) : undefined,
          site ? eq(postsTable.url, site) : undefined,
        ),
      );

    if (user) {
      postsQuery.leftJoin(
        postUpvotesTable,
        and(
          eq(postUpvotesTable.postId, postsTable.id),
          eq(postUpvotesTable.userId, user.id),
        ),
      );
    }

    const posts = await postsQuery;

    return c.json<PaginatedResponse<{ posts: Post[] }>>(
      {
        success: true,
        message: "Posts fetched",
        data: { posts: posts as Post[] },
        pagination: {
          page,
          totalPages: Math.ceil(count.count / limit),
        },
      },
      200,
    );
  });
