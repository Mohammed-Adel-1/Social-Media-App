import mongoose from "mongoose";
import { DB_URI } from "../config/config.service";




export const checkConnectionDB = async () => {
    try {
        await mongoose.connect(DB_URI as string);
        console.log(`Database connected successfully! ${DB_URI}`);
    } catch (error) {
        console.log(error);
    }
}