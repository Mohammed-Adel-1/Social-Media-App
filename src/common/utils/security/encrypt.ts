import crypto from "crypto";
import { ENCRYPTION_SECRET_KEY } from "../../../config/config.service";

const algorithm = "aes-256-cbc";
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_SECRET_KEY, 'hex');
const IV_LENGTH = 16;

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};


export const decrypt = (data: string) => {
  const [ivHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex as string, "hex");

  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted as string, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
