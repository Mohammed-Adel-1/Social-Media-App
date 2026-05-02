import { Router } from "express";
import { validation } from "../../common/middleware/validation";
import authentication from "../../common/middleware/authentication";
import userService from "./users.service";
import { updatePasswordSchema } from "./users.validation";
import { multerCloud } from "../../common/middleware/multer.cloud";
import { store_enum } from "../../common/enum/multer.enum";


const usersRouter = Router();


usersRouter.patch("/update-password", authentication, validation(updatePasswordSchema), userService.updatePassword);
usersRouter.post("/logout", authentication, userService.logOut);
usersRouter.post("/upload", authentication, multerCloud({ store_type: store_enum.disk}).single("attachment"), userService.uploadImage);


export default usersRouter;