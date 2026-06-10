import { Router } from "express";
import chatService from "./chat.service";
import authentication from "../../common/middleware/authentication";
import { multerCloud } from "../../common/middleware/multer.cloud";
import { multer_enum } from "../../common/enum/multer.enum";


const chatRouter = Router({ mergeParams: true});


chatRouter.get("/", authentication, chatService.getChat);
chatRouter.get("/group/:groupId", authentication, chatService.getGroupChat);

chatRouter.post("/group/create", multerCloud({custom_types: multer_enum.image}).single("attachment"), authentication, chatService.createGroupChat);


export default chatRouter