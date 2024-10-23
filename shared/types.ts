import { z } from "zod";

export type SuccessResponse<Data = void> = {
  success: true;
  message: string;
} & (Data extends void ? {} : { data: Data });

export type ErrorResponse = {
  success: false;
  error: string;
  isFormError?: boolean;
};

export const loginSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(31)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(3).max(255),
});
