import { Router } from "express";
import authentication from "../../common/middleware/authentication";
import { validation } from "../../common/middleware/validation";
import { addCommentSchema, deleteCommentSchema, updateCommentSchema } from "./comment.validation";
import commentService from "./comment.service";
import { multerCloud } from "../../common/middleware/multer.cloud";


const commentRouter = Router({mergeParams: true});



commentRouter.post("/", authentication,multerCloud().array("attachments"), validation(addCommentSchema), commentService.addComment);

commentRouter.post("/:commentId/replies", authentication,multerCloud().array("attachments"), 
// validation(addCommentSchema), 
commentService.addReply);

commentRouter.patch("/update/:commentId", authentication, validation(updateCommentSchema), commentService.updateComment);

commentRouter.delete("/delete/:commentId", authentication, validation(deleteCommentSchema), commentService.deleteComment);

export default commentRouter;