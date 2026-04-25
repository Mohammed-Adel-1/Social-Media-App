import { IUser } from "../../DB/models/user.model";
import { ITokenPayload } from "../middleware/authentication";



declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      decoded?: ITokenPayload;
    }
  }
}