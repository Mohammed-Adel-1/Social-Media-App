import * as z from "zod";
import { generalRules } from "../../common/utils/generalRules";
import { onModelEnum } from "../../common/enum/post.enum";


export const addCommentSchema = {
    body: z.object({
        content: z.string().optional(),
        attachments: z.array(generalRules.file).optional(),
        tags: z.array(generalRules.id).optional(),
        onModel: z.enum(onModelEnum)
    }).superRefine((args, ctx)=>{
        if(!args.content&&!args.attachments?.length){
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Content is required"
            })
        }

        if(args?.tags){
            const uniqueTags = new Set(args.tags);
            if(args.tags.length!==uniqueTags.size){
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Can't tag the same person twice"
                })
            }
        }
    }),
    params: z.object({
        postId:generalRules.id
    })
};
export const updateCommentSchema = {
    body: z.object({
        content: z.string().min(1),
    }),

    params: z.object({
        commentId: generalRules.id,
    }),
};

export const deleteCommentSchema = {
    params: z.object({
        commentId: generalRules.id,
    }),
};