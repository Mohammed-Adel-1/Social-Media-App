import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/golbal.error.handler";
import { ACCESS_SECRET_KEY_ADMIN, ACCESS_SECRET_KEY_USER, PREFIX_ADMIN, PREFIX_USER } from "../../config/config.service";
import { verifyToken } from "../service/token.service";
import { JwtPayload } from "jsonwebtoken";
import userModel, { IUser } from "../../DB/models/user.model";
import redisService from "../service/redis.service";
import { roleEnum } from "../enum/user.enum";
import { HydratedDocument } from "mongoose";


export interface ITokenPayload extends JwtPayload {
  id: string;
  email: string;
};

export const decodeToken_and_fetchUser = async (authorization: string) => {
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
    throw new AppError("Invalid token, loggedout");
  }

  const revokeToken = await redisService.get(redisService.revoked_key({ userId: user._id, jti: decoded.jti }));
  if (revokeToken) {
    throw new AppError("Invalid token revoked");
  }

  return {user, decoded};
}

const authentication = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  const {user, decoded} = await decodeToken_and_fetchUser(authorization!);

  req.user = user;
  req.decoded = decoded;

  next();
};

export const authentication_gql = async (authorization: string) => {

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

  // if (user?.changeCredential?.getTime() > (decoded.iat ?? 0) * 1000) {
  //   throw new AppError("Invalid token, loggedout");
  // }

  // const revokeToken = await redisService.get(redisService.revoked_key({ userId: user._id, jti: decoded.jti }));
  // if (revokeToken) {
  //   throw new AppError("Invalid token revoked");
  // }

  return { user, decoded };
};


export default authentication;