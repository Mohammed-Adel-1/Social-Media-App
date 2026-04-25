import mongoose, { Model, Types } from "mongoose";
import { genderEnum, providerEnum, roleEnum } from "../../common/enum/user.enum";
import { NextFunction } from "express";
import { hash } from "../../common/utils/security/hash";

const systemOnlyRequired = function (this: IUser): boolean {
    return this.provider == providerEnum.system ? true : false;
}


export interface IUser {
    _id: Types.ObjectId,
    firstName: string,
    lastName: string,
    userName: string,
    email: string,
    password: string,
    age: number,
    phone?: string,
    address?: string,
    gender?: string
    confirmed?: Boolean
    role: string,
    provider: string,
    createdAt: Date,
    updatedAt: Date,
    changeCredential: Date
}



const userSchema = new mongoose.Schema<IUser>({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minLength: 3,
        maxLength: 25
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minLength: 3,
        maxLength: 25
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: 3,
        maxLength: 25
    },
    password: {
        type: String,
        required: systemOnlyRequired,
        trim: true,
        minLength: 8,
    },
    age: {
        type: Number,
        required: systemOnlyRequired,
        trim: true,
        min: 18,
        max: 60
    },
    phone: {
        type: String,
        required: systemOnlyRequired,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
        minLength: 3,
        maxLength: 30
    },
    gender: {
        type: String,
        enum: genderEnum,
        default: genderEnum.male
    },
    role: {
        type: String,
        enum: roleEnum,
        default: roleEnum.user
    },
    provider: {
        type: String,
        enum: providerEnum,
        default: providerEnum.system
    },
    confirmed: Boolean,
    changeCredential: Date

}, {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});


userSchema.virtual("userName").get(function () {
    return this.firstName + " " + this.lastName;
}).set(function (val: string) {
    this.set({ firstName: val.split(" ")[0], lastName: val.split(" ")[1] });
})


userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await hash({ plainText: this.password });
    }
})

userSchema.pre('findOneAndUpdate', async function () {
    const update = this.getUpdate() as any;

    if (update.password) {
        update.password = await hash({ plainText: update.password });
    }
});

const userModel: Model<IUser> = mongoose.models.user || mongoose.model<IUser>("user", userSchema);
export default userModel;