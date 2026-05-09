import * as z from "zod";
import { createPostSchema, reactSchema, updatePostSchema } from "./post.validation";

export type createPostDto = z.infer<typeof createPostSchema.body>;
export type reactDto = z.infer<typeof reactSchema.query>;
export type updatePostDto = z.infer<typeof updatePostSchema.body>;
export type PostIdDto = z.infer<typeof updatePostSchema.params>;
