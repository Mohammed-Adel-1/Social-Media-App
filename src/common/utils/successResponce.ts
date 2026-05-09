import { Response } from "express";



export const successResponse = ({
    res,
    status = 200,
    message = "Done",
    data = undefined
}: {
    res: Response,
    status?: number,
    message?: string,
    data?: any
}) => {
    return res.status(status).json({ message, data });
}