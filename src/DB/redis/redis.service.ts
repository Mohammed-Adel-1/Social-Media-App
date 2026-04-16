import { Types } from "mongoose";
import { redisClient } from "./redis.db.js";

export const revoked_key = ({ userId, jti }: {userId: Types.ObjectId, jti: string}) => {
  return `revoke_token::${userId}::${jti}`;
};

export const get_key = (userId: Types.ObjectId)=> {
    return `revoke_token::${userId}`;
};


export const otp_key = ({email, subject}: {email: string, subject: string})=> {
    return `otp::${email}::${subject}`;
};

export const max_otp_key = ({email, subject}: {email: string, subject: string})=> {
    return `${otp_key({email, subject})}::max_tries`;
};

export const blocked_otp_key = ({email, subject}: {email: string, subject: string})=> {
    return `${otp_key({email, subject})}::block`;
};


export const tries_key = ({email, subject}: {email: string, subject: string})=> {
    return `tries::${email}::${subject}`;
};

export const blocked_key = ({email, subject}: {email: string, subject: string})=> {
    return `blocked::${email}::${subject}`;
};








export const setValue = async ({ key, value, ttl}: {key: string, value: unknown, ttl?: number})=> {
    try {
        const data = typeof value === "string" ? value : JSON.stringify(value);
        return ttl ? await redisClient.set(key, data, { EX: ttl }) : await redisClient.set(key, data);
    } catch (error) {
        console.log("Error to set data in redis", error);
    }
};

export const update = async ({ key, value }: {key: string, value: string })=> {
    try {
        if(!await redisClient.exists(key)){
            return 0
        }
        const data = typeof value === "string" ? value : JSON.stringify(value);
        return await redisClient.set(key, data);
    } catch (error) {
        console.log("Error to update data in redis", error);
    }
};

export const get = async (key: string)=> {
    try {
        const data = await redisClient.get(key);

        if(!data) return null;

        try {
            return JSON.parse(data);
        } catch (error) {
            return data;
        }
    } catch (error) {
        console.log("Error to get data in redis", error);
    }
};

export const deleteKey = async (key: string)=> {
    try {
        return await redisClient.del(key);
    } catch (error) {
        console.log("Error to delete data in redis", error);
    }
};

export const ttl = async (key: string)=> {
    try {
        return await redisClient.ttl(key);
    } catch (error) {
        console.log("Error to get ttl in redis", error);
    }
};

export const exists = async (key: string)=> {
    try {
        return await redisClient.exists(key);
    } catch (error) {
        console.log("Error to check data exists in redis", error);
    }
};

export const keys = async (pattern: string)=> {
    try {
        return await redisClient.keys(`${pattern}*`);
    } catch (error) {
        console.log("Error to get keys in redis", error);
    }
};

export const incr = async (key: string)=> {
    try {
        return await redisClient.incr(key);
    } catch (error) {
        console.log("Fail to increment key", error);
    }
};

export const expire = async ({key, ttl}: {key: string, ttl: number})=> {
    try {
        return await redisClient.expire(key, ttl);
    } catch (error) {
        console.log("Fail to expire key", error);
    }
};