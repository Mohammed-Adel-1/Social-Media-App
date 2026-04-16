import { compareSync, hashSync } from "bcrypt"
import { SALT_ROUNDS } from "../../../config/config.service";


export const hash = ({ plainText, saltRounds = Number(SALT_ROUNDS) }: {plainText: string, saltRounds?: number}) => {
    return hashSync(plainText, saltRounds);
};

export const compare = ({ plainText, cipherText }: {plainText: string, cipherText: string}) => {
    return compareSync(plainText, cipherText);
};