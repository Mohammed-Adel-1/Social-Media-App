import mongoose, { Model, Types } from "mongoose";
import { allowCommentEnum, availabilityEnum, reactEnum } from "../../common/enum/post.enum";

export interface IComment {
    content?: string,
    userId: Types.ObjectId,
    postId: Types.ObjectId,
}



const commentSchema = new mongoose.Schema<IComment>({
    content:{
        type: String,
        minLength: 1,
        required: true,
    },
    userId: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },
    postId: {
        type: Types.ObjectId,
        ref: "post",
        required: true
    },
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