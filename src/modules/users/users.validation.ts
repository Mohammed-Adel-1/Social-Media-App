import * as z from "zod";


export const updatePasswordSchema = {
    body: z.object({
        oldPassword: z.string().min(6),
        newPassword: z.string().min(6),
        cPassword: z.string().min(6)
    }).superRefine((data, ctx)=> {
        if(data.newPassword !== data.cPassword){
            ctx.addIssue({
                code: "custom",
                path: ["cPassword"],
                message: "Passwords do not match"
            })
        }
    })
};

export const logOutSchema = {
    query: z.object({
        flag: z.literal("all").optional()
    })
};



