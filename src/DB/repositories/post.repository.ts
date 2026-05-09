import { Model } from "mongoose";
import BaseRepository from "./base.repository";
import postModel, { IPost } from "../models/post.model";




class PostRepository extends BaseRepository<IPost> {

    constructor(protected readonly model: Model<IPost> = postModel) {
        super(model);
    }


}

export default PostRepository;