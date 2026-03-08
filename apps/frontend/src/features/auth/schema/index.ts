import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const passwordResetSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PasswordResetConfirmFormValues = z.infer<
  typeof passwordResetConfirmSchema
>;
