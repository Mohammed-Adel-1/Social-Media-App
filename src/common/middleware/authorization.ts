import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/golbal.error.handler";
import { GraphQLError } from "graphql";


const authorization = (roles: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {

        if(!req.user) throw new AppError("Invalid User")

        if(!roles.includes(req.user.role)){
            throw new Error("You are not authorized");
        }
        next();
    } 
}

export const authorization_gql = (roles: string[] = [], role: string) => {
        if(!roles.includes(role)){
            throw new GraphQLError("You are not authorized", {
                extensions: {
                    code: "FORBIDDEN",
                    status: 403,
                    message: "You don't have permission to access this resource"
                }
            });
        }
}

export default authorization;