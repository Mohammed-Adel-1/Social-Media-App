import mongoose, { Model, Types } from "mongoose";
import { allowCommentEnum, availabilityEnum, onModelEnum, reactEnum } from "../../common/enum/post.enum";

export interface IComment {
    content?: string,
    attachments?: string[],
    createdBy: Types.ObjectId,
    tags?: Types.ObjectId[],
    reacts?: { userId: Types.ObjectId, react: reactEnum }[],
    folderId: string
    refId: Types.ObjectId,
    onModel: onModelEnum,
}



const commentSchema = new mongoose.Schema<IComment>({
    content: {
        type: String,
        minLength: 1,
        required: true,
    },
    attachments: {
        type: [String]
    },
    createdBy: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },
    tags: {
        type: [Types.ObjectId],
        ref: "user",
    },
    reacts: [
        {
            userId: {
                type: Types.ObjectId,
                ref: "user",
                required: true
            },
            react: {
                type: String,
                enum: reactEnum,
                required: true
            }
        }
    ],
    refId: {
        type: Types.ObjectId,
        refPath: "onModel",
        required: true
    },
    onModel:{
        type: String,
        enum: onModelEnum,
        required: true
    },
    folderId: String
});

commentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "refId",
});

// commentSchema.pre('findOne', function() {
//     const {paranoid, ...rest} = this.getQuery();

//     if(paranoid === false){
//         this.setQuery({ ...rest });
//     } else {
//         this.setQuery({ ...rest, deletedAt: { $exists: false } });
//     }
// }
// )



const commentModel: Model<IComment> = mongoose.models.comment || mongoose.model<IComment>("comment", commentSchema);
export default commentModel;