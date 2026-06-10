import mongoose, { Model, Types } from "mongoose";

interface IMessage{
    createdBy:Types.ObjectId,
    content: string,
}

export interface IChat {

    // One to one chat
    createdBy: Types.ObjectId,
    participants: Types.ObjectId[],
    messages: IMessage[];

    // One to many chat
    group: string,
    groupImage: string,
    roomId: string
}

const messageSchema = new mongoose.Schema<IMessage>({
    content: {
        type: String,
        required: true
    },
    createdBy:{ type: Types.ObjectId, ref: "user", required: true}
}, {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});




const chatSchema = new mongoose.Schema<IChat>({
    participants: [{ type: Types.ObjectId, ref: "user", required: true}],
    createdBy: { type: Types.ObjectId, ref: "user", required: true},
    messages: [messageSchema],

    group: String,
    groupImage: String,
    roomId: String,
}, {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});


const chatModel: Model<IChat> = mongoose.models.chat || mongoose.model<IChat>("chat", chatSchema);
export default chatModel;