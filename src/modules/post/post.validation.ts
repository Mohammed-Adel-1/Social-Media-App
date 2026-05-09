import * as z from "zod";
import { allowCommentEnum, availabilityEnum, reactEnum, removeReactEnum, } from "../../common/enum/post.enum";
import { generalRules } from "../../common/utils/generalRules";


export const createPostSchema = {
    body: z.object({
        content: z.string().optional(),
        attachments: z.array(generalRules.file).optional(),
        tags: z.array(generalRules.id).optional(),
        availability: z.enum(availabilityEnum).default(availabilityEnum.friends),
        allowComment: z.enum(allowCommentEnum).default(allowCommentEnum.allow),
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
    })
};

export const reactSchema = {
    params: z.object ({
        postId: generalRules.id
    }),
    query: z.object({
        react: z.enum(reactEnum).optional(),
        flag: z.enum(removeReactEnum).default(removeReactEnum.add).optional()
    }).refine((data) => {

        const flag = data.flag ?? removeReactEnum.add;

        if (flag === removeReactEnum.add) {
            return !!data.react;
        }

        return true;

    }, {
        message: "React is required when flag is add",
        path: ["react"]
    })
}

export const updatePostSchema = {
    body: z.object({
        content: z.string().optional(),
        attachments: z.array(generalRules.file).optional(),
        removeFiles: z.array(z.string()).optional(),
        tags: z.array(generalRules.id).optional(),
        removeTags: z.array(generalRules.id).optional(),
        availability: z.enum(availabilityEnum).default(availabilityEnum.friends),
        allowComment: z.enum(allowCommentEnum).default(allowCommentEnum.allow),
    }).superRefine((args, ctx)=>{
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

    params: reactSchema.params,
};


