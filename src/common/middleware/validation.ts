import { Request, Response, NextFunction } from "express"
import { ZodType } from "zod";
import { AppError } from "../utils/golbal.error.handler";
import { GraphQLError } from "graphql";

type reqType = keyof Request;
type schemaType = Partial<Record<reqType, ZodType>>

export const validation = (schema: schemaType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        let validationError = [];
        for (const key of Object.keys(schema) as reqType[]) {
            if (!schema[key]) continue;
            if (req?.file) {
                req.body.attachment = req.file
            }
            if (req?.files) {
                req.body.attachments = req.files
            }

            const result = await schema[key].safeParseAsync(req[key]);

            if (!result.success) {
                validationError.push(JSON.parse(result.error.message));
            }
        }
        if (validationError.length > 0) {
            throw new AppError(validationError, 400);
        }
        next();
    }
}

export const validation_gql = async(schema: ZodType, data: any) => {
    let validationError = [];

    const result = await schema.safeParseAsync(data);

    if (!result?.success) {
        const errors = result.error.issues.map((err: any) => {
            return {
                path: err.path[0],
                message: err.message
            }
        })
        validationError.push(...errors);
    }

    if(validationError.length){
        throw new GraphQLError("Validation Error", {
            extensions: {
                code: "BAD_REQUEST",
                status: 400,
                errors: validationError
            }
        });
    }

}