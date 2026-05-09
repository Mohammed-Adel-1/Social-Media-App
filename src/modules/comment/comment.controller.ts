import { Router } from "express";
import authentication from "../../common/middleware/authentication";
import { validation } from "../../common/middleware/validation";
import { addCommentSchema, deleteCommentSchema, updateCommentSchema } from "./comment.validation";
import commentService from "./comment.service";




const commentRouter = Router();

commentRouter.post("/:postId", authentication, validation(addCommentSchema), commentService.addComment);

commentRouter.patch("/update/:commentId", authentication, validation(updateCommentSchema), commentService.updateComment);

commentRouter.delete("/delete/:commentId", authentication, validation(deleteCommentSchema), commentService.deleteComment);

export default commentRouter;