import { Router } from "express";
import AuthService from "./auth.service";
import { validation } from "../../common/middleware/validation";
import { confirmEmailSchema, resendOtpSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./auth.validation";


const authRouter = Router();


authRouter.post("/signup", validation(signUpSchema),AuthService.signUp);
authRouter.post("/signin", validation(signInSchema),AuthService.signIn);
authRouter.post("/signup/gmail", AuthService.signUpAndSignInWithGmail);
authRouter.post("/confirm-email", validation(confirmEmailSchema),AuthService.confirmEmail);
authRouter.post("/resend-otp", validation(resendOtpSchema),AuthService.resendOtp);
authRouter.patch("/forget-password", validation(resendOtpSchema),AuthService.forgetPassword);
authRouter.post("/reset-password", validation(resetPasswordSchema),AuthService.resetPassword);
authRouter.get("/refresh", AuthService.refreshToken);


export default authRouter;