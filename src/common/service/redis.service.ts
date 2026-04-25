import { createClient } from "redis";
import { REDIS_URL } from "../../config/config.service";
import { Types } from "mongoose";



class RedisService {

    private readonly client;

    constructor( ) {
        this.client = createClient({
            url : REDIS_URL 
        });
        this.handleEvent();
    }

    async connect() {
        this.client.connect();
        console.log("Success to connect with redis");
    }

    handleEvent() {
        this.client.on("error", (error) => {
            console.log("Falied to connect with redis", error);
        })
    }


    revoked_key = ({ userId, jti }: {userId: Types.ObjectId, jti: string}) => {
      return `revoke_token::${userId}::${jti}`;
    };
    
    get_key = (userId: Types.ObjectId)=> {
        return `revoke_token::${userId}`;
    };
    
    
    otp_key = ({email, subject}: {email: string, subject: string})=> {
        return `otp::${email}::${subject}`;
    };
    
    max_otp_key = ({email, subject}: {email: string, subject: string})=> {
        return `${this.otp_key({email, subject})}::max_tries`;
    };
    
    blocked_otp_key = ({email, subject}: {email: string, subject: string})=> {
        return `${this.otp_key({email, subject})}::block`;
    };
    
    
    tries_key = ({email, subject}: {email: string, subject: string})=> {
        return `tries::${email}::${subject}`;
    };
    
    blocked_key = ({email, subject}: {email: string, subject: string})=> {
        return `blocked::${email}::${subject}`;
    };
    
    
    
    
    
    
    
    
    setValue = async ({ key, value, ttl}: {key: string, value: unknown, ttl?: number})=> {
        try {
            const data = typeof value === "string" ? value : JSON.stringify(value);
            return ttl ? await this.client.set(key, data, { EX: ttl }) : await this.client.set(key, data);
        } catch (error) {
            console.log("Error to set data in redis", error);
        }
    };
    
    update = async ({ key, value }: {key: string, value: string })=> {
        try {
            if(!await this.client.exists(key)){
                return 0
            }
            const data = typeof value === "string" ? value : JSON.stringify(value);
            return await this.client.set(key, data);
        } catch (error) {
            console.log("Error to update data in redis", error);
        }
    };
    
    get = async (key: string)=> {
        try {
            const data = await this.client.get(key);
    
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
    
    deleteKey = async (key: string)=> {
        try {
            return await this.client.del(key);
        } catch (error) {
            console.log("Error to delete data in redis", error);
        }
    };
    
    ttl = async (key: string)=> {
        try {
            return await this.client.ttl(key);
        } catch (error) {
            console.log("Error to get ttl in redis", error);
        }
    };
    
    exists = async (key: string)=> {
        try {
            return await this.client.exists(key);
        } catch (error) {
            console.log("Error to check data exists in redis", error);
        }
    };
    
    keys = async (pattern: string)=> {
        try {
            return await this.client.keys(`${pattern}*`);
        } catch (error) {
            console.log("Error to get keys in redis", error);
        }
    };
    
    incr = async (key: string)=> {
        try {
            return await this.client.incr(key);
        } catch (error) {
            console.log("Fail to increment key", error);
        }
    };
    
    expire = async ({key, ttl}: {key: string, ttl: number})=> {
        try {
            return await this.client.expire(key, ttl);
        } catch (error) {
            console.log("Fail to expire key", error);
        }
    };
}

export default new RedisService();