import { Router } from "express";
import { validation } from "../../common/middleware/validation";
import authentication from "../../common/middleware/authentication";
import userService from "./users.service";
import { updatePasswordSchema } from "./users.validation";
import { multerCloud } from "../../common/middleware/multer.cloud";
import { multer_enum, store_enum } from "../../common/enum/multer.enum";


const usersRouter = Router();


usersRouter.patch("/update-password", authentication, validation(updatePasswordSchema), userService.updatePassword);
usersRouter.post("/logout", authentication, userService.logOut);
usersRouter.post("/upload",
    authentication,
    multerCloud({ custom_types: multer_enum.image }).single("attachment"),
    userService.uploadProfileImage);
usersRouter.get("/upload/*path", userService.getProfileImage);
usersRouter.delete("/upload/delete-image", authentication, userService.deleteProfileImage);


export default usersRouter;