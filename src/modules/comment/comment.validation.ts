import * as z from "zod";
import { generalRules } from "../../common/utils/generalRules";


export const addCommentSchema = {
    body: z.object({
        content: z.string().min(1),
    }),

    params: z.object({
        postId: generalRules.id,
    }),
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