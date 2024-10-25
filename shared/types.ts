import { insertPostSchema } from "@/db/schemas/posts";
import { z } from "zod";

export type SuccessResponse<T = void> = {
  success: true;
  message: string;
} & (T extends void ? {} : { data: T });

export type PaginatedResponse<T> = {
  pagination: {
    page: number;
    totalPages: number;
  };
} & SuccessResponse<T>;

export type ErrorResponse = {
  success: false;
  error: string;
  isFormError?: boolean;
};

export type Post = {
  id: number;
  title: string;
  url: string | null;
  content: string | null;
  points: number;
  commentCount: number;
  createdAt: string;
  author: {
    id: string;
    username: string;
  };
  isUpvoted: boolean;
};

export const loginSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(31)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(3).max(255),
});

export const createPostSchema = insertPostSchema
  .pick({
    title: true,
    url: true,
    content: true,
  })
  .refine(({ url, content }) => url || content, {
    message: "Either URL or Content must be provided",
    path: ["url", "content"],
  });

export const sortBySchema = z.enum(["points", "recent"]);

export const orderBySchema = z.enum(["asc", "desc"]);

export const paginationSchema = z.object({
  limit: z.coerce.number().optional().default(10),
  page: z.coerce.number().optional().default(1),
  sortBy: sortBySchema.optional().default("points"),
  orderBy: orderBySchema.optional().default("desc"),
  author: z.string().optional(),
  site: z.string().optional(),
});
