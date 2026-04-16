import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/golbal.error.handler";


const authorization = (roles: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {

        if(!req.user) throw new AppError("Invalid User")

        if(!roles.includes(req.user.role)){
            throw new Error("You are not authorized");
        }
        next();
    } 
}

export default authorization;