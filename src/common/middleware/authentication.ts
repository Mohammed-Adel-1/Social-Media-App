import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/golbal.error.handler";
import { ACCESS_SECRET_KEY_ADMIN, ACCESS_SECRET_KEY_USER, PREFIX_ADMIN, PREFIX_USER } from "../../config/config.service";
import { verifyToken } from "../service/token.service";
import { JwtPayload } from "jsonwebtoken";
import userModel, { IUser } from "../../DB/models/user.model";
import redisService from "../service/redis.service";
import { roleEnum } from "../enum/user.enum";


export interface ITokenPayload extends JwtPayload {
  id: string;
  email: string;
};


const authentication = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization) throw new AppError("Token is required");

  const [prefix, token] = authorization.split(" ");

  if (!prefix || !Object.values(roleEnum).includes(prefix)) throw new AppError("prefix is incorrect");

  if (token === undefined) throw new AppError("Token is required");

  let ACCESS_SECRET_KEY = "";
  if (prefix === PREFIX_USER) {
    ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_USER;
  } else if (prefix === PREFIX_ADMIN) {
    ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_ADMIN;
  } else {
    throw new AppError("prefix is incorrect")
  }

  const decoded = verifyToken({ token, secret_key: ACCESS_SECRET_KEY }) as ITokenPayload;

  if (!decoded || !decoded.id || !decoded.jti) throw new AppError("Invalid token, payLoad");

  const user = await userModel.findOne({ _id: decoded.id });

  if (!user) throw new AppError("User not exist");

  if (user?.changeCredential?.getTime() > (decoded.iat ?? 0) * 1000) {
    throw new Error("Invalid token, loggedout");
  }

  const revokeToken = await redisService.get(redisService.revoked_key({ userId: user._id, jti: decoded.jti }));
  if (revokeToken) {
    throw new Error("Invalid token revoked");
  }

  req.user = user;
  req.decoded = decoded;

  next();
}


export default authentication;