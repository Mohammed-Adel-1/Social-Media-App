import * as z from "zod";
import { addCommentSchema } from "./comment.validation";

export type addCommentDto = z.infer<typeof addCommentSchema.body>;
