import express from "express"
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { PORT } from "./config/config.service";
import { AppError, globalErrorHandler } from "./common/utils/golbal.error.handler";
import authRouter from "./modules/auth/auth.controller";
import { checkConnectionDB } from "./DB/connectionDB";
import usersRouter from "./modules/users/users.controller";
import redisService from "./common/service/redis.service";
import { S3Service } from "./common/service/s3.service";
import { pipeline } from "node:stream/promises";
import postRouter from "./modules/post/post.controller";
import commentRouter from "./modules/comment/comment.controller";
import { createHandler } from "graphql-http/lib/use/express";
import gql_schema from "./modules/graphql/graphql.shcema";
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


    app.use("/graphql", createHandler({ schema: gql_schema, context: (req) => ({ req }) }));

    // app.get("/upload", async(req: Request, res: Response, next: NextFunction) => {

    //     const { folderName } = req.query as { folderName: string};

    //     let result = await new S3Service().getFiles(folderName);
    //     let resultMapped = result.Contents?.map((file)=>{
    //         return file.Key;
    //     })

    //     res.status(200).json({message: "Done", date: resultMapped});
    // })

    // app.get("/upload/pre-signed/*path", async(req: Request, res: Response, next: NextFunction) => {
    //     const { path } = req.params as {path: string[]};
    //     const { download } = req.query as { download: string};
    //     const Key = path.join("/") as string;

    //     const url = await new S3Service().getPreSignedUrl({Key, download: download ? download : undefined});

    //     res.status(200).json({message: "Done", date: url});
    // })

    // app.get("/upload/*path", async(req: Request, res: Response, next: NextFunction) => {
    //     const { path } = req.params as {path: string[]};
    //     const { download } = req.query;
    //     const Key = path.join("/") as string;

    //     const result = await new S3Service().getFile(Key);
    //     const stream = result.Body as NodeJS.ReadableStream;
    //     res.setHeader("Content-Type", result.ContentType!);
    //     if(download && download === "true") {
    //         res.setHeader("Content-Disposition", `attachment; filename="${path.pop()}"`);
    //     }

    //     await pipeline(stream, res);
    // });


    // app.post("/send-notification", (req: Request, res: Response, next: NextFunction)=>{

    //     notificationService.sendNotification({
    //         token: req.body.token,
    //         data: {
    //             title: "law bt4of da fkda eldnya fola",
    //             body: "Hiiiii"
    //         }
    //     })
    //     // console.log({token: req.body.token});
    // })

    checkConnectionDB();
    redisService.connect();

    app.use("/auth", authRouter);
    app.use("/users", usersRouter);
    app.use("/post", postRouter);
    app.use("/comment", commentRouter);

    app.get("/", (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({ message: "Welcome on SocialMedai App" })
    })


    app.use("{/*demo}", (req: Request, res: Response, next: NextFunction) => {
        throw new AppError(`URL ${req.originalUrl} with method ${req.method} not found`, 404);
    })

    app.use(globalErrorHandler);

    app.listen(port, () => {
        console.log(`Server is runnung on url http://localhost:${port}`);

    })
}

export default bootstrap;