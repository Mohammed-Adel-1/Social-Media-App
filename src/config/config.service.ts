import dotenv from "dotenv";
import { resolve } from "node:path";

const NODE_ENV = process.env.NODE_ENV;
dotenv.config({ path: resolve(__dirname, `../../.env.${NODE_ENV}`) });

export const PORT: number = Number(process.env.PORT) || 3000;
export const SALT_ROUNDS: number = Number(process.env.SALT_ROUNDS);
export const DB_URI: string = process.env.DB_URI!;
export const ENCRYPTION_SECRET_KEY: string = process.env.ENCRYPTION_SECRET_KEY!;
export const EMAIL: string = process.env.EMAIL!;
export const EMAIL_PASS: string = process.env.EMAIL_PASS!;
export const REDIS_URL: string = process.env.REDIS_URL!;
export const ACCESS_SECRET_KEY: string = process.env.ACCESS_SECRET_KEY!;
export const REFRESH_SECRET_KEY: string = process.env.REFRESH_SECRET_KEY!;
export const TOKEN_PREFIX: string = process.env.TOKEN_PREFIX!;