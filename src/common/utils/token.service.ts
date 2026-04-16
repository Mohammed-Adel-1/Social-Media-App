import jwt, { PrivateKey, PublicKey, Secret, SignOptions, VerifyOptions } from "jsonwebtoken"


export const generateToken = ({ payload, secret_key, options = {} }: {payload: string | Buffer | object, secret_key: Secret | PrivateKey, options?: SignOptions}) => {
    return jwt.sign(payload, secret_key, options);
}

export const verifyToken = ({ token, secret_key, options = {} }: {token: string, secret_key: Secret | PublicKey, options?: VerifyOptions}) => {
    return jwt.verify(token, secret_key, options);
}