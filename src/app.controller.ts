import express from "express"
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { PORT } from "./config/config.service";
import { AppError, globalErrorHandler } from "./common/utils/golbal.error.handler";
import authRouter from "./modules/auth/auth.controller";
import { checkConnectionDB } from "./DB/connectionDB";
import { redisConection } from "./DB/redis/redis.db";
import usersRouter from "./modules/users/users.controller";
const app: express.Application = express();
const port: number = Number(PORT);


const bootstrap = () => {

    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        message: "too many requests from this IP, please thr again later",
        handler: (req: Request, res: Response, next: NextFunction) => {
            throw new AppError("too many requests from this IP, please thr again later", 429);
        },
        legacyHeaders: false,
    })

    app.use(express.json());
    app.use(cors(), helmet(), limiter);

    checkConnectionDB();
    redisConection();

    app.use("/auth", authRouter);
    app.use("/users", usersRouter);

    app.get("/", (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({message: "Welcome on SocialMedai App"})
    })

    
    app.use("{/*demo}", (req: Request, res: Response, next: NextFunction) => {
        throw new AppError(`URL ${req.originalUrl} with method ${req.method} not found`, 404);
    })

    app.use(globalErrorHandler);

    app.listen(port,() => {
        console.log(`Server is runnung on url http://localhost:${port}`);
        
    })
}

export default bootstrap;