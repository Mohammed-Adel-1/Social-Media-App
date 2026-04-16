import mongoose, { Model, Types } from "mongoose";
import { genderEnum, providerEnum, roleEnum } from "../../common/enum/user.enum";



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
        min: 3,
        max: 25
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        unieue: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        min: 3,
        max: 25
    },
    password: {
        type: String,
        required: true,
        trim: true,
        min: 8,
        max: 25
    },
    age: {
        type: Number,
        required: true,
        trim: true,
        min: 18,
        max: 60
    },
    phone: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
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

},{
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true},
    toObject: { virtuals: true},
});


userSchema.virtual("userName").get(function () {
    return this.firstName + " " + this.lastName;
}).set( function(val: string) {
    this.set({ firstName: val.split(" ")[0], lastName: val.split(" ")[1] });
})

const userModel: Model<IUser> = mongoose.models.user || mongoose.model<IUser>("user", userSchema);
export default userModel;