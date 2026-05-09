import { Model } from "mongoose";
import BaseRepository from "./base.repository";
import commentModel, { IComment } from "../models/comment.model";




class CommentRepository extends BaseRepository<IComment> {

    constructor(protected readonly model: Model<IComment> = commentModel) {
        super(model);
    }


}

export default CommentRepository;