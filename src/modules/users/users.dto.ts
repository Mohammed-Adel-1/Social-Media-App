import * as z from "zod";
import { logOutSchema, updatePasswordSchema } from "./users.validation";

export type updatePasswordDto = z.infer<typeof updatePasswordSchema.body>;
export type logOutDto = z.infer<typeof logOutSchema.query>;
