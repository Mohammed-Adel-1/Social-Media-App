import * as z from "zod";
import { confirmEmailSchema, resendOtpSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./auth.validation";

export type signUpDto = z.infer<typeof signUpSchema.body>;
export type signInDto = z.infer<typeof signInSchema.body>;
export type confirmEmailDto = z.infer<typeof confirmEmailSchema.body>;
export type resendOtpDto = z.infer<typeof resendOtpSchema.body>;
export type resetPasswordDto = z.infer<typeof resetPasswordSchema.body>;