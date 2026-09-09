import { MFAType } from "@/types/domain/credential";
import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long")
});

export type SignInPayload = z.infer<typeof signInSchema>;

export const sendSignupOtpSchema = z.object({
  email: z.email("Invalid email address")
});

export type SendSignupOtpPayload = z.infer<typeof sendSignupOtpSchema>;

export const signUpDetailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  otpRequestId: z.string().min(1, "Verification OTP is required"),
  otpCode: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .regex(/^\d{6}$/, "Verification code must be a 6-digit number")
});

export const signUpCredentialsSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long"),
  mfaType: z.enum(MFAType).optional().default(MFAType.None)
});

export const signUpSchema = z.object({
  details: signUpDetailsSchema,
  credentials: signUpCredentialsSchema
});

export type SignUpPayload = z.infer<typeof signUpSchema>;
