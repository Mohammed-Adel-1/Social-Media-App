import { NextFunction, Request, Response } from "express";
import UserRepository from "../../DB/repositories/user.repository";
import { logOutDto, updatePasswordDto } from "./users.dto";
import { AppError } from "../../common/utils/golbal.error.handler";
import { compare, hash } from "../../common/utils/security/hash";
import { deleteKey, get_key, keys, revoked_key, setValue } from "../../DB/redis/redis.service";

class userService {

  private readonly _userModel = new UserRepository();
  constructor() { };

  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    const { oldPassword, newPassword }: updatePasswordDto = req.body;

    if (!req.user) {
      throw new AppError("User not authorized", 401);
    }

    const user = await this._userModel.findById(req.user._id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!compare({ plainText: oldPassword, cipherText: user.password })) {
      throw new AppError("Password is incorrect", 401);
    }

    user.password = hash({ plainText: newPassword });
    user.changeCredential = new Date();
    await user.save();

    res.status(200).json({ message: "Password has changed successfully" });
  };


  logOut = async (req: Request, res: Response, next: NextFunction) => {
    const { flag }: logOutDto = req.query;

    if (!req.user || !req.decoded || !req.decoded.jti || !req.decoded.exp) {
      throw new AppError("User not authorized", 401);
    }

    if (flag === "all") {

      await this._userModel.findByIdAndUpdate({
        id: req.user._id,
        update: {
          changeCredential: new Date()
        }
      });

      const userKeys = await keys(get_key(req.user._id));
      if (userKeys && userKeys.length) {
        for(let i=0; i<userKeys.length; i++){
          await deleteKey(userKeys[i] as string);
        }
      }

    } else if (flag === undefined) {

      await setValue({
        key: revoked_key({ userId: req.user._id, jti: req.decoded.jti }),
        value: `${req.decoded.jti}`,
        ttl: req.decoded.exp - Math.floor(Date.now() / 1000)
      });

    }

    res.status(200).json({message: "User logged out successfully"});
  };
  
}


export default new userService;