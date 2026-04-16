import { Router } from "express";
import { validation } from "../../common/middleware/validation";
import authentication from "../../common/middleware/authentication";
import userService from "./users.service";
import { updatePasswordSchema } from "./users.validation";


const usersRouter = Router();


usersRouter.patch("/update-password", authentication, validation(updatePasswordSchema), userService.updatePassword);
usersRouter.post("/logout", authentication, userService.logOut);


export default usersRouter;