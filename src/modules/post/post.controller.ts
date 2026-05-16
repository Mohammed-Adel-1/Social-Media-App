import { Router } from "express";
import postService from "./post.service";
import { validation } from "../../common/middleware/validation";
import { createPostSchema, reactSchema, updatePostSchema } from "./post.validation";
import authentication from "../../common/middleware/authentication";
import { multerCloud } from "../../common/middleware/multer.cloud";
import commentRouter from "../comment/comment.controller";



const postRouter = Router();

postRouter.use("/:postId/comments", commentRouter)

postRouter.post("/",authentication, multerCloud().array("attachments"), validation(createPostSchema), postService.createPost);

postRouter.get("/", authentication, postService.getPosts);

postRouter.patch("/:postId",authentication, validation(reactSchema), postService.reactPost);

postRouter.patch("/update/:postId",authentication, multerCloud().array("attachments"), validation(updatePostSchema), postService.updatePost);

postRouter.delete("/delete/:postId",authentication, postService.deletePost);

export default postRouter;