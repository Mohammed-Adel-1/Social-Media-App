import mongoose, { Model, Types } from "mongoose";
import { allowCommentEnum, availabilityEnum, reactEnum } from "../../common/enum/post.enum";

export interface IPost {
    content?: string,
    attachments?: string[],
    createdBy: Types.ObjectId,
    tags?: Types.ObjectId[],
    reacts?: {userId: Types.ObjectId, react: reactEnum}[],
    allowComment?: allowCommentEnum,
    availability?: availabilityEnum,
    folderId: string
}



const postSchema = new mongoose.Schema<IPost>({
    content:{
        type: String,
        minLength: 1,
        required: function(this:IPost) {return !this.attachments?.length}
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
    allowComment:{
        type: String,
        enum: Object.values(allowCommentEnum),
        default: allowCommentEnum.allow,
    },
    availability:{
        type: String,
        enum: Object.values(availabilityEnum),
        default: availabilityEnum.public,
    },
    folderId: String
}, {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});


// soft delete
postSchema.pre('findOne', function() {
    const {paranoid, ...rest} = this.getQuery();

    if(paranoid === false){
        this.setQuery({ ...rest });
    } else {
        this.setQuery({ ...rest, deletedAt: { $exists: false } });
    }
}
)

// hard and cascad delete
postSchema.pre("findOneAndDelete", async function (next) {
  const post = await this.model.findOne(this.getFilter());

  if (post) {
    await mongoose.model("Comment").deleteMany({
      post: post._id,
    });
  }
});



const postModel: Model<IPost> = mongoose.models.post || mongoose.model<IPost>("post", postSchema);
export default postModel;