import { validate } from "@/middlewares/validation.js";
import z from "zod";
import {
  otpSchema,
  phoneSchema,
  objectIdSchema,
  credentialsSchema
} from "@/validations/base.js";

const signUpSchema = z.object({
  body: z.object({
    details: z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: z.email(),
      otpRequestId: objectIdSchema,
      otpCode: otpSchema
    }),
    credentials: credentialsSchema
  })
});

export type SignUpPayload = z.infer<typeof signUpSchema>;
export const signUp = validate(signUpSchema);

const signInSchema = z.object({
  body: z
    .object({
      email: z.email(),
      password: z.string().min(8)
    })
    .strict()
});
export type SignInPayload = z.infer<typeof signInSchema>;
export const signIn = validate(signInSchema);

const sendSignupOtpSchema = z.object({
  body: z.object({ email: z.email() }).strict()
});
export type SendSignupOtpPayload = z.infer<typeof sendSignupOtpSchema>;
export const sendSignupOtp = validate(sendSignupOtpSchema);
