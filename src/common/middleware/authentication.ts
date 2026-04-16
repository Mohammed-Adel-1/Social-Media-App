import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/golbal.error.handler";
import { ACCESS_SECRET_KEY, TOKEN_PREFIX } from "../../config/config.service";
import { verifyToken } from "../utils/token.service";
import { JwtPayload } from "jsonwebtoken";
import userModel, { IUser } from "../../DB/models/user.model";
import { get, revoked_key } from "../../DB/redis/redis.service";

export interface ITokenPayload extends JwtPayload {
  id: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      decoded?: ITokenPayload;
    }
  }
}


const authentication = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization) throw new AppError("Token is required");

  const [prefix, token] = authorization.split(" ");

  if (prefix !== TOKEN_PREFIX) throw new AppError("Token prefix is incorrect");
  if (token === undefined) throw new AppError("Token is required");

  const decoded = verifyToken({ token, secret_key: ACCESS_SECRET_KEY }) as ITokenPayload;

  if (!decoded || !decoded.id || !decoded.jti) throw new AppError("Invalid token, payLoad");

  const user = await userModel.findOne({ _id: decoded.id });

  if (!user) throw new AppError("User not exist");

  if (user?.changeCredential?.getTime() > (decoded.iat ?? 0) * 1000) {
    throw new Error("Invalid token, loggedout");
  }

  const revokeToken = await get(revoked_key({ userId: user._id, jti: decoded.jti }));
  if (revokeToken) {
    throw new Error("Invalid token revoked");
  }

  req.user = user;
  req.decoded = decoded;

  next();
}


export default authentication;