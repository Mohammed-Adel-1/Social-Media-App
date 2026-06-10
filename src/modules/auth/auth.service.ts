import { NextFunction, Request, Response } from "express";
import { confirmEmailDto, resendOtpDto, resetPasswordDto, signInDto, signUpDto } from "./auth.dto";
import userModel, { IUser } from "../../DB/models/user.model";
import { HydratedDocument, Model, Types } from "mongoose";
import UserRepository from "../../DB/repositories/user.repository";
import { compare, hash } from "../../common/utils/security/hash";
import { ACCESS_SECRET_KEY_ADMIN, ACCESS_SECRET_KEY_USER, PREFIX_ADMIN, PREFIX_USER, REFRESH_SECRET_KEY_ADMIN, REFRESH_SECRET_KEY_USER, SALT_ROUNDS } from "../../config/config.service";
import { encrypt } from "../../common/utils/security/encrypt";
import { generateOTP, sendEmail } from "../../common/utils/email/send.email";
import { emailTemplate } from "../../common/utils/email/email.template";
import { AppError } from "../../common/utils/golbal.error.handler";
import { eventEmitter } from "../../common/utils/email/email.events";
import { emailEnum } from "../../common/enum/email.enum";
import { blockEnum } from "../../common/enum/block.enum";
import { randomUUID } from "crypto";
import { generateToken, verifyToken } from "../../common/service/token.service";
import { providerEnum, roleEnum } from "../../common/enum/user.enum";
import { ITokenPayload } from "../../common/middleware/authentication";
import { OAuth2Client } from "google-auth-library";
import RedisService from "../../common/service/redis.service";
import notificationService from "../../common/service/notification.service";


class AuthService {

  private readonly _userRepo = new UserRepository();
  private readonly _redisService = RedisService;
  private readonly _notificationService = notificationService;
  constructor() { };

  private sendEmailOtp = async ({ email, subject }: { email: string, subject: string }) => {
    const isBlocked = await this._redisService.ttl(this._redisService.blocked_otp_key({ email, subject }));
    if ((isBlocked ?? 0) > 0) {
      throw new Error(`You are blocked from resending otp, please try again after ${isBlocked} seconds`);
    }

    const otpTTL = await this._redisService.ttl(this._redisService.otp_key({ email, subject }));
    if ((otpTTL ?? 0) > 0) {
      throw new Error(`You can resend otp after ${otpTTL} seconds`);
    }

    if (await this._redisService.get((this._redisService.max_otp_key({ email, subject })) ?? 0) >= 3) {
      await this._redisService.setValue({ key: this._redisService.blocked_otp_key({ email, subject }), value: 1, ttl: 60 * 10, });
      throw new Error("You have exceeded the maximum number of tries");
    }

    const otp = await generateOTP();

    eventEmitter.emit(emailEnum.confirmEmail, async () => {
      await this._redisService.setValue({
        key: this._redisService.otp_key({ email, subject }),
        value: hash({ plainText: `${otp}` }),
        ttl: 60 * 2,
      });

      const key = this._redisService.max_otp_key({ email, subject });

      const attempts = await this._redisService.incr(key);
      if (attempts === 1) {
        await this._redisService.expire({ key, ttl: 60 * 7 });
      }

      await sendEmail({ to: email, subject, html: emailTemplate(otp) });
    })
  };

  private checkBlocked = async ({ email, subject, tries = 5 }: { email: string, subject: string, tries?: number }) => {
    const isBlocked = await this._redisService.ttl(this._redisService.blocked_key({ email, subject }));
    if ((isBlocked ?? 0) > 0) {
      throw new Error(
        `You are blocked, try again after ${isBlocked} seconds`,
      );
    }

    const numOfTries = await this._redisService.get(this._redisService.tries_key({ email, subject }));
    if ((numOfTries ?? 0) >= tries) {
      this._redisService.setValue({ key: this._redisService.blocked_key({ email, subject }), value: 1, ttl: 60 * 5 });
      throw new Error("You have exceeded the maximum number of tries");
    }

    const key = this._redisService.tries_key({ email, subject });

    const attempts = await this._redisService.incr(key);
    if (attempts === 1) {
      await this._redisService.expire({ key, ttl: 60 * 7 });
    }
  };

  signUp = async (req: Request, res: Response, next: NextFunction) => {
    const { userName, email, password, age, gender, address, phone }: signUpDto = req.body;

    if (await this._userRepo.findOne({ filter: { email } })) {
      throw new AppError("Email already exists", 409);
    }

    const user: HydratedDocument<IUser> = await this._userRepo.create({
      userName,
      email,
      password,
      age,
      gender,
      address,
      phone: phone ? encrypt(phone) : null,
    } as Partial<IUser>);



    const otp = await generateOTP();

    eventEmitter.emit(emailEnum.confirmEmail, async () => {
      await sendEmail({ to: email, subject: "Email Confirmarion", html: emailTemplate(otp) });

      await this._redisService.setValue({
        key: this._redisService.otp_key({ email, subject: emailEnum.confirmEmail }),
        value: hash({ plainText: `${otp}` }),
        ttl: 60 * 2,
      });

      await this._redisService.setValue({
        key: this._redisService.max_otp_key({ email, subject: emailEnum.confirmEmail }),
        value: 1,
        ttl: 60 * 7,
      });
    });

    res.status(201).json({ message: "User signed up successfully", user });
  };

  signIn = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password,
      //  fcm
    }: signInDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.login, tries: 5 });

    const user = await this._userRepo.findOne({ filter: { email } });

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
      secret_key: user.role === roleEnum.user ? ACCESS_SECRET_KEY_USER : ACCESS_SECRET_KEY_ADMIN,
      options: {
        expiresIn: "5day",
        jwtid,
        // noTimestamp: true,
        // notBefore: "1m",
        // jwtid: uuidv4()
      },
    });

    const refresh_token = generateToken({
      payload: { id: user._id, email },
      secret_key: user.role === roleEnum.user ? REFRESH_SECRET_KEY_USER : REFRESH_SECRET_KEY_ADMIN,
      options: {
        expiresIn: "1y",
        jwtid,
        // noTimestamp: true,
        // notBefore: "1m",
        // jwtid: uuidv4()
      },
    });

    // if (fcm) {
    //   await this._redisService.addFCM({ userId: user?._id, FCMToken: fcm });
    //   const tokens = await this._redisService.getFCMs(user._id);

    //   await this._notificationService.sendNotifications({
    //     tokens,
    //     data: {
    //       title: `New Login On Your Account`,
    //       body: `There is a new device logged in your account`
    //     }
    //   })
    // }

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

    let user = await this._userRepo.findOne({ filter: { email } });

    if (!user) {
      user = await this._userRepo.create({
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
      secret_key: user.role === roleEnum.user ? ACCESS_SECRET_KEY_USER : ACCESS_SECRET_KEY_ADMIN,
      options: {
        expiresIn: 60 * 5,
      },
    });

    const refresh_token = generateToken({
      payload: { id: user._id, email: user.email },
      secret_key: user.role === roleEnum.user ? REFRESH_SECRET_KEY_USER : REFRESH_SECRET_KEY_ADMIN,
      options: {
        expiresIn: "1y",
      },
    });

    res.status(200).json({ message: "User SignedIn Successfully", data: { access_token, refresh_token } });
  };

  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { email, code }: confirmEmailDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.confirmEmail });

    const otpValue = await this._redisService.get(this._redisService.otp_key({ email, subject: emailEnum.confirmEmail }));
    if (!otpValue) {
      throw new AppError("OTP expired");
    }

    if (!compare({ plainText: code, cipherText: otpValue })) {
      throw new AppError("OTP incorrect");
    }

    const user = await this._userRepo.findOneAndUpdate({ filter: { email }, update: { confirmed: true } });

    if (!user) throw new AppError("User not exist");

    await this._redisService.deleteKey(this._redisService.otp_key({ email, subject: emailEnum.confirmEmail }));
    await this._redisService.deleteKey(this._redisService.max_otp_key({ email, subject: emailEnum.confirmEmail }));

    res.status(201).json({ message: "User email confirmed successfully" });
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    const { email }: resendOtpDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.resendOtp });

    const user = await this._userRepo.findOne({
      filter: {
        email,
        confirmed: { $exists: false },
        provider: providerEnum.system
      }
    });

    if (!user) throw new AppError("User not exist");

    this.sendEmailOtp({ email, subject: emailEnum.confirmEmail });

    res.status(200).json({ message: "OTP for confirming your email is sent to your email" });
  };

  forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email }: resendOtpDto = req.body;

    await this.checkBlocked({ email, subject: blockEnum.forgetPassword });

    const user = await this._userRepo.findOne({
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

    const otpValue = await this._redisService.get(this._redisService.otp_key({ email, subject: emailEnum.forgetPassword }));
    if (!otpValue) {
      throw new AppError("OTP expired");
    }

    if (!compare({ plainText: code, cipherText: otpValue })) {
      throw new AppError("OTP incorrect");
    }

    const user = await this._userRepo.findOneAndUpdate({
      filter: {
        email,
        confirmed: true,
        provider: providerEnum.system
      },
      update: {
        password,
        changeCredential: new Date(),
      }
    });

    if (!user) throw new AppError("User not exist");

    await this._redisService.deleteKey(this._redisService.otp_key({ email, subject: emailEnum.forgetPassword }));
    await this._redisService.deleteKey(this._redisService.max_otp_key({ email, subject: emailEnum.forgetPassword }));

    res.status(200).json({ message: "Password has succussfully changed for your email" });
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    const { prefix, authorization } = req.body;

    if (!authorization) throw new AppError("token must be provided");

    if (!prefix || !Object.values(roleEnum).includes(prefix)) throw new AppError("prefix is incorrect");

    if (authorization === undefined) throw new AppError("Token is required");

    let REFRESH_SECRET_KEY = "";
    let ACCESS_SECRET_KEY = "";
    if (prefix === PREFIX_USER) {
      REFRESH_SECRET_KEY = REFRESH_SECRET_KEY_USER;
      ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_USER;
    } else if (prefix === PREFIX_ADMIN) {
      REFRESH_SECRET_KEY = REFRESH_SECRET_KEY_ADMIN;
      ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_ADMIN;
    } else {
      throw new AppError("prefix is incorrect")
    }


    const decoded = verifyToken({ token: authorization, secret_key: REFRESH_SECRET_KEY }) as ITokenPayload;

    if (!decoded || !decoded.id || !decoded.jti) throw new AppError("Invalid token, payLoad");

    const user = await this._userRepo.findById(new Types.ObjectId(decoded.id));

    if (!user) {
      throw new AppError("User not exist");
    }

    if (user?.changeCredential?.getTime() > (decoded.iat ?? 0) * 1000) {
      throw new Error("Invalid token, loggedout");
    }

    const revokeToken = await this._redisService.get(this._redisService.revoked_key({ userId: user._id, jti: decoded.jti }));
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

  //============================= GraphQL =============================

  getUsers = async () => {
    return await this._userRepo.find({ filter: {} });
  }

  getuser = async (id: Types.ObjectId) => {
    return await this._userRepo.findOne({ filter: { _id: id } });
  }

}


export default new AuthService;