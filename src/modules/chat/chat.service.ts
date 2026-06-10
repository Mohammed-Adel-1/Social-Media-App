import type { Request, Response, NextFunction } from "express";
import UserRepository from "../../DB/repositories/user.repository";
import { AppError } from "../../common/utils/golbal.error.handler";
import ChatRepository from "../../DB/repositories/chat.repository";
import { successResponse } from "../../common/utils/successResponce";
import { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { S3Service } from "../../common/service/s3.service";
import { Server, Socket } from "socket.io";
import redisService from "../../common/service/redis.service";


class ChatService {
    constructor() { }

    private readonly _userrepo = new UserRepository();
    private readonly _chatrepo = new ChatRepository();
    private readonly _s3Service = new S3Service();
    private readonly _redisService = redisService;

    // Rest APIs

    getChat = async (req: Request, res: Response, next: NextFunction) => {
        const { userId } = req.params;

        let {page, limit} = req.query as unknown as {page: number, limit: number}
        if(page < 0 || !page) page = 1;
        page = page * 1 || 1;
        limit = limit * 1 || 5;

        if(typeof(userId) !== "string") throw new AppError("userId is incorrect")

        const chat = await this._chatrepo.findPaginate({
            page,
            limit,
            req,
            userId
        })

        if (!chat) {
            throw new AppError("there is no chat between you and this user", 400);
        }
        console.log(chat);
        successResponse({ res, message: "Done", data: { chat } });
    }

    createGroupChat = async (req: Request, res: Response, next: NextFunction) => {
        const { group, participants } = req.body;
        const mappedUsers = [...new Set(participants.map((user: string) => Types.ObjectId.createFromHexString(user)))] as Types.ObjectId[];
        const users = await this._userrepo.find({
            filter: {
                _id: { $in: participants },
                friends: { $in: [req.user?._id!] }
            }
        })
        console.log(users);
        console.log(mappedUsers);
        if (users.length !== mappedUsers.length) {
            throw new AppError("Some IDs are duplicate");
        }

        let groupImage = '';
        let roomId = randomUUID();

        if (req.file) {
            groupImage = await this._s3Service.uploadFile({
                path: "chat",
                file: req.file
            }) as string
        }

        mappedUsers.push(req.user?._id!);

        const chat = await this._chatrepo.create({
            createdBy: req.user?._id!,
            group,
            groupImage,
            participants: mappedUsers,
            roomId
        })

        if (!chat) {
            await this._s3Service.deleteFile(groupImage);
            throw new AppError("Failed to create chat");
        }

        successResponse({ res, message: "Group created successfully", data: { chat } });
    }

    getGroupChat = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;

        let {page, limit} = req.query as unknown as {page: number, limit: number}
        if(page < 0 || !page) page = 1;
        page = page * 1 || 1;
        limit = limit * 1 || 5;

        const chat = await this._chatrepo.findOne({
            filter: {
                _id: groupId,
                participants: {
                    $in: [req?.user?._id!]
                },
                group: { $exists: true }
            },
            projection: {
                messages: {
                    $slice: [- (page * limit), limit]
                }
            },
            options: {
                populate: [
                    {
                        path: "messages.createdBy"
                    }
                ]
            }
        });
        console.log(chat);

        if (!chat) {
            throw new AppError("there is no chat between you and this user", 400);
        }
        console.log(chat);
        successResponse({ res, message: "Done", data: { chat } });
    }



    // Socket.io

    sayHi = (data: any) => {
        console.log(data);
    }

    sendMessage = async (data: any, socket: Socket, io: Server) => {
        const { sendTo, content } = data;
        const createdBy = socket.data.user?._id;

        const user = await this._userrepo.findById(sendTo);
        if (!user) {
            throw new AppError("User not exist");
        }

        const chat = await this._chatrepo.findOneAndUpdate({
            filter: {
                participants: { $all: [sendTo, createdBy] },
                group: { $exists: false }
            },
            update: {
                $push: {
                    messages: {
                        content,
                        createdBy
                    }
                }
            }
        })

        if (!chat) {
            await this._chatrepo.create({
                createdBy,
                messages: [{
                    content,
                    createdBy
                }],
                participants: [sendTo, createdBy]
            })
        }

        io.to(await this._redisService.getSockets(createdBy)).emit("successMessage", { content });
        io.to(await this._redisService.getSockets(sendTo)).emit("newMessage", { content, from: socket.data.user });


    }

    join_room = async (data: any, socket: Socket, io: Server) => {
        const {roomId} = data;

        const chat = await this._chatrepo.findOne({
            filter: {
                roomId,
                participants: {
                    $in: [socket.data.user._id]
                },
                group: {$exists: true}
            }
        })
        if(!chat){
            throw new AppError("No chat found", 404);
        }

        socket.join(chat.roomId);
        // console.log({ join: chat.roomId });
    }

    sendGroupMessage = async (data: any, socket: Socket, io: Server) => {
        const { groupId, content } = data;
        const createdBy = socket.data.user?._id;

        const chat = await this._chatrepo.findOneAndUpdate({
            filter: {
                _id: groupId,
                participants: { $in: [createdBy] },
                group: { $exists: true }
            },
            update: {
                $push: {
                    messages: {
                        content,
                        createdBy
                    }
                }
            }
        })

        if (!chat) {
            throw new AppError("Chat not found", 404);
        }

        io.to(await this._redisService.getSockets(createdBy)).emit("successMessage", { content });
        io.to(chat.roomId).emit("newMessage", { content, from: socket.data.user, groupId });
    }

}



export default new ChatService()