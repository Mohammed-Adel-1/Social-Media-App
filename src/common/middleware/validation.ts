import { Request, Response, NextFunction } from "express"
import { ZodType } from "zod";
import { AppError } from "../utils/golbal.error.handler";

type reqType = keyof Request;
type schemaType = Partial<Record<reqType, ZodType>>

export const validation = (schema: schemaType) => {
    return async(req: Request, res: Response, next: NextFunction) => {
        const validationError = [];
        for (const key of Object.keys(schema) as reqType[]) {
            if(!schema[key]) continue;
            const result = await schema[key].safeParseAsync(req[key]);

            if(!result.success){
                validationError.push(JSON.parse(result.error.message));
            }
        }
        if(validationError.length > 0){
            throw new AppError(validationError, 400);
        }
        next();
    }
}