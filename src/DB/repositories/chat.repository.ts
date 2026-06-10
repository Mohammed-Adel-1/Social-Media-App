import { Model, Types } from "mongoose";
import BaseRepository from "./base.repository";
import chatModel, { IChat } from "../models/chat.model";
import {Request} from "express"




class ChatRepository extends BaseRepository<IChat> {

    constructor(protected readonly model: Model<IChat> = chatModel) {
        super(model);
    }


    async findPaginate<T>({
            page = 1,
            limit = 5,
            req,
            userId
        }: {
            page?: number,
            limit?: number,
            req: Request,
            userId: string
        }) {
            return await this.findOne({
            filter: {
                participants: {
                    $all: [req?.user?._id, userId]
                },
                group: { $exists: false }
            },
            projection: {
                messages: {
                    $slice: [- (page * limit), limit]
                }
            },
            options: {
                populate: [
                    {
                        path: "participants"
                    }
                ]
            }
        })
        }

}

export default ChatRepository;