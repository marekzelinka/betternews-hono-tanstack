import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

import { db } from "@/adapter";
import type { Context } from "@/context";
import { usersTable } from "@/db/schemas/auth";
import { lucia } from "@/lucia";
import { loggedIn } from "@/middleware/logged-in";
import { zValidator } from "@hono/zod-validator";
import { generateId, type User } from "lucia";
import postgres from "postgres";

import { loginSchema, type SuccessResponse } from "@/shared/types";

export const authRouter = new Hono<Context>()
  .post("/signup", zValidator("form", loginSchema), async (c) => {
    const { username, password } = c.req.valid("form");

    const passwordHash = await Bun.password.hash(password);
    const userId = generateId(15);

    try {
      await db.insert(usersTable).values({
        id: userId,
        username,
        passwordHash,
      });

      const session = await lucia.createSession(userId, { username });
      const sessionCookie = lucia.createSessionCookie(session.id).serialize();

      c.header("Set-Cookie", sessionCookie, { append: true });

      return c.json<SuccessResponse>(
        {
          success: true,
          message: "User created",
        },
        201,
      );
    } catch (error) {
      if (error instanceof postgres.PostgresError && error.code === "23505") {
        throw new HTTPException(409, { message: "Username already used" });
      }

      throw new HTTPException(500, { message: "Failed to create user" });
    }
  })
  .post("/login", zValidator("form", loginSchema), async (c) => {
    const { username, password } = c.req.valid("form");

    const existingUsersQuery = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    const existingUser = existingUsersQuery.at(0);
    if (!existingUser) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    const isPasswordValid = await Bun.password.verify(
      password,
      existingUser.passwordHash,
    );
    if (!isPasswordValid) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    const session = await lucia.createSession(existingUser.id, { username });
    const sessionCookie = lucia.createSessionCookie(session.id).serialize();

    c.header("Set-Cookie", sessionCookie, { append: true });

    return c.json<SuccessResponse>(
      {
        success: true,
        message: "Logged in",
      },
      200,
    );
  })
  .post("/logout", async (c) => {
    const session = c.get("session");
    if (!session) {
      return c.redirect("/");
    }

    await lucia.invalidateSession(session.id);
    const blankSessionCookie = lucia.createBlankSessionCookie().serialize();

    c.header("Set-Cookie", blankSessionCookie);

    return c.redirect("/");
  })
  .get("user", loggedIn, async (c) => {
    const user = c.get("user") as User;

    return c.json<SuccessResponse<{ username: User["username"] }>>({
      success: true,
      message: "Found user",
      data: { username: user.username },
    });
  });
