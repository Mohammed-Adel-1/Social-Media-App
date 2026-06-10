import * as z from "zod";
import { genderEnum } from "../../common/enum/user.enum";

export const signUpSchema = {
    body: z.object({
        userName: z.string().min(1).max(25),
        email: z.email(),
        password: z.string().min(6),
        cPassword: z.string().min(6),
        age: z.number().min(18).max(60),
        gender: z.enum(genderEnum).optional(),
        address: z.string().min(6).optional(),
        phone: z.string().min(6).optional(),
    }).superRefine((data, ctx)=> {
        if(data.password !== data.cPassword){
            ctx.addIssue({
                code: "custom",
                path: ["cPassword"],
                message: "Passwords do not match"
            })
        }
    }),

    
};

export const signInSchema = {
    body: z.object({
        email: z.email(),
        password: z.string().min(6),
        // fcm: z.string(),
    })
};

export const confirmEmailSchema = {
    body: z.object({
        email: z.email(),
        code: z.string().length(6)
    })
};

export const resendOtpSchema = {
    body: z.object({
        email: z.email(),
    })
};

export const resetPasswordSchema = {
    body: z.object({
        email: z.email(),
        code: z.string().length(6),
        password: z.string().min(6),
        cPassword: z.string().min(6)
    }).superRefine((data, ctx)=> {
        if(data.password !== data.cPassword){
            ctx.addIssue({
                code: "custom",
                path: ["cPassword"],
                message: "Passwords do not match"
            })
        }
    })
};


