import { NextFunction, Request, Response } from "express";
import { confirmEmailDto, resendOtpDto, resetPasswordDto, signInDto, signUpDto } from "./auth.dto";
import userModel, { IUser } from "../../DB/models/user.model";
import { HydratedDocument, Model, Types } from "mongoose";
import UserRepository from "../../DB/repositories/user.repository";
import { compare, hash } from "../../common/utils/security/hash";
import { ACCESS_SECRET_KEY, REFRESH_SECRET_KEY, SALT_ROUNDS } from "../../config/config.service";
import { encrypt } from "../../common/utils/security/encrypt";
import { generateOTP, sendEmail } from "../../common/utils/email/send.email";
import { emailTemplate } from "../../common/utils/email/email.template";
import { AppError } from "../../common/utils/golbal.error.handler";
import { eventEmitter } from "../../common/utils/email/email.events";
import { emailEnum } from "../../common/enum/email.enum";
import { blocked_key, blocked_otp_key, deleteKey, expire, get, incr, max_otp_key, otp_key, revoked_key, setValue, tries_key, ttl } from "../../DB/redis/redis.service";
import { blockEnum } from "../../common/enum/block.enum";
import { randomUUID } from "crypto";
import { generateToken, verifyToken } from "../../common/utils/token.service";
import { providerEnum } from "../../common/enum/user.enum";
import { ITokenPayload } from "../../common/middleware/authentication";
import { OAuth2Client } from "google-auth-library";


class AuthService {

  private readonly _userModel = new UserRepository();
  constructor() { };

  private sendEmailOtp = async ({ email, subject }: { email: string, subject: string }) => {
    const isBlocked = await ttl(blocked_otp_key({ email, subject }));
    if ((isBlocked ?? 0) > 0) {
      throw new Error(`You are blocked from resending otp, please try again after ${isBlocked} seconds`);
    }

    const otpTTL = await ttl(otp_key({ email, subject }));
    if ((otpTTL ?? 0) > 0) {
      throw new Error(`You can resend otp after ${otpTTL} seconds`);
    }

    if (await get((max_otp_key({ email, subject })) ?? 0) >= 3) {
      await setValue({ key: blocked_otp_key({ email, subject }), value: 1, ttl: 60 * 10, });
      throw new Error("You have exceeded the maximum number of tries");
    }

    const otp = await generateOTP();

    eventEmitter.emit(emailEnum.confirmEmail, async () => {
      await setValue({
        key: otp_key({ email, subject }),
        value: hash({ plainText: `${otp}` }),
        ttl: 60 * 2,
      });

      const key = max_otp_key({ email, subject });

      const attempts = await incr(key);
      if (attempts === 1) {
        await expire({ key, ttl: 60 * 7 });
      }

      await sendEmail({ to: email, subject, html: emailTemplate(otp) });
    })
  };

  private checkBlocked = async ({ email, subject, tries = 5 }: { email: string, subject: string, tries?: number }) => {
    const isBlocked = await ttl(blocked_key({ email, subject }));
    if ((isBlocked ?? 0) > 0) {
      throw new Error(
        `You are blocked, try again after ${isBlocked} seconds`,
      );
    }

    const numOfTries = await get(tries_key({ email, subject }));
    if ((numOfTries ?? 0) >= tries) {
      setValue({ key: blocked_key({ email, subject }), value: 1, ttl: 60 * 5 });
      throw new Error("You have exceeded the maximum number of tries");
    }

    const key = tries_key({ email, subject });

    const attempts = await incr(key);
    if (attempts === 1) {
      await expire({ key, ttl: 60 * 7 });
    }
  };

  signUp = async (req: Request, res: Response, next: NextFunction) => {
    const { userName, email, password, age, gender, address, phone }: signUpDto = req.body;

    if (await this._userModel.findOne({ filter: { email } })) {
      throw new AppError("Email already exists", 409);
    }

    const user: HydratedDocument<IUser> = await this._userModel.create({
      userName,
      email,
      password: hash({ plainText: password, saltRounds: SALT_ROUNDS }),
      age,
      gender,
      address,
      phone: phone ? encrypt(phone) : null,
    } as Partial<IUser>);



    const otp = await generateOTP();

    eventEmitter.emit(emailEnum.confirmEmail, async () => {
      await sendEmail({ to: email, subject: "Email Confirmarion", html: emailTemplate(otp) });

      await setValue({
        key: otp_key({ email, subject: emailEnum.confirmEmail }),
        value: hash({ plainText: `${otp}` }),
        ttl: 60 * 2,
      });

      await setValue({
        key: max_otp_key({ email, subject: emailEnum.confirmEmail }),
        value: 1,
        ttl: 60 * 7,
      });
    });

    res.status(201).json({ message: "User signed up successfully", user });
  };

  signIn = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password }: signInDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.login, tries: 5 });

    const user = await this._userModel.findOne({ filter: { email } });

    if (!user) {
      throw new AppError("Invalid Email", 409);
    };

    if (user.confirmed !== true) {
      throw new AppError("Failed login, Your email is not confirmed", 400);
    };

    if (!compare({ plainText: password, cipherText: user.password })) {
      throw new AppError("Password is not correct", 400);
    }

    const jwtid = randomUUID();

    const access_token = generateToken({
      payload: { id: user._id, email },
      secret_key: ACCESS_SECRET_KEY,
      options: {
        expiresIn: 60 * 30,
        jwtid,
        // noTimestamp: true,
        // notBefore: "1m",
        // jwtid: uuidv4()
      },
    });

    const refresh_token = generateToken({
      payload: { id: user._id, email },
      secret_key: REFRESH_SECRET_KEY,
      options: {
        expiresIn: "1y",
        jwtid,
        // noTimestamp: true,
        // notBefore: "1m",
        // jwtid: uuidv4()
      },
    });

    res.status(200).json({ message: "User signedin successfully", data: { access_token, refresh_token } });
  };

  signUpAndSignInWithGmail = async (req: Request, res: Response, next: NextFunction) => {
    const { idToken } = req.body;

    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
      idToken,
      audience:
        "367829066840-ip9nn34hpd5n5vbuobvlo8l2v4ihmhg8.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new AppError("Token is incorrect", 401)
    }

    const { email, email_verified, name } = payload;

    if (!email || !name || !email_verified) {
      throw new Error("Missing required data from Google");
    }

    let user = await this._userModel.findOne({ filter: { email } });

    if (!user) {
      user = await this._userModel.create({
        email,
        confirmed: email_verified,
        userName: name,
        provider: providerEnum.google,
      });
    }

    if (user.provider === providerEnum.system) {
      throw new Error("Please log in on system only", { cause: 400 });
    }

    const access_token = generateToken({
      payload: { id: user._id, email: user.email },
      secret_key: ACCESS_SECRET_KEY,
      options: {
        expiresIn: 60 * 5,
      },
    });

    res.status(200).json({ message: "User SignedIn Successfully", data: { access_token } });
  };

  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { email, code }: confirmEmailDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.confirmEmail });

    const otpValue = await get(otp_key({ email, subject: emailEnum.confirmEmail }));
    if (!otpValue) {
      throw new AppError("OTP expired");
    }

    if (!compare({ plainText: code, cipherText: otpValue })) {
      throw new AppError("OTP incorrect");
    }

    const user = await this._userModel.findOneAndUpdate({ filter: { email }, update: { confirmed: true } });

    if (!user) throw new AppError("User not exist");

    await deleteKey(otp_key({ email, subject: emailEnum.confirmEmail }));
    await deleteKey(max_otp_key({ email, subject: emailEnum.confirmEmail }));

    res.status(201).json({ message: "User email confirmed successfully" });
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    const { email }: resendOtpDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.resendOtp });

    const user = await this._userModel.findOne({
      filter: {
        email,
        confirmed: { $exists: false },
        provider: providerEnum.system
      }
    });

    if (!user) throw new AppError("User not exist");

    this.sendEmailOtp({ email, subject: emailEnum.confirmEmail })

    res.status(200).json({ message: "OTP for confirming your email is sent to your email" });
  };

  forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email }: resendOtpDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.forgetPassword });

    const user = await this._userModel.findOne({
      filter: {
        email,
        confirmed: true,
        provider: providerEnum.system
      }
    });

    if (!user) throw new AppError("User not exist");

    this.sendEmailOtp({ email, subject: emailEnum.forgetPassword });

    res.status(200).json({ message: "OTP for reseting your password is sent to your email" });
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email, code, password }: resetPasswordDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.resetPassword });

    const otpValue = await get(otp_key({ email, subject: emailEnum.forgetPassword }));
    if (!otpValue) {
      throw new AppError("OTP expired");
    }

    if (!compare({ plainText: code, cipherText: otpValue })) {
      throw new AppError("OTP incorrect");
    }

    const user = await this._userModel.findOneAndUpdate({
      filter: {
        email,
        confirmed: true,
        provider: providerEnum.system
      },
      update: {
        password: hash({ plainText: password }),
        changeCredential: new Date(),
      }
    });

    if (!user) throw new AppError("User not exist");

    await deleteKey(otp_key({ email, subject: emailEnum.forgetPassword }));
    await deleteKey(max_otp_key({ email, subject: emailEnum.forgetPassword }));

    res.status(200).json({ message: "Password has succussfully changed for your email" });
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.body;

    if (!authorization) throw new AppError("token must be provided");

    const decoded = verifyToken({ token: authorization, secret_key: REFRESH_SECRET_KEY }) as ITokenPayload;

    if (!decoded || !decoded.id || !decoded.jti) throw new AppError("Invalid token, payLoad");

    const user = await this._userModel.findById(new Types.ObjectId(decoded.id));

    if (!user) {
      throw new AppError("User not exist");
    }

    if (user?.changeCredential?.getTime() > (decoded.iat ?? 0) * 1000) {
      throw new Error("Invalid token, loggedout");
    }

    const revokeToken = await get(revoked_key({ userId: user._id, jti: decoded.jti }));
    if (revokeToken) {
      throw new Error("Invalid toke, revoked");
    }

    const access_token = generateToken({
      payload: { id: user._id, email: user.email },
      secret_key: ACCESS_SECRET_KEY,
      options: {
        expiresIn: 60 * 30,
        jwtid: decoded.jti,
      },
    });

    res.status(200).json({ message: "Refresh Token done", data: { access_token } })
  };

}


export default new AuthService;