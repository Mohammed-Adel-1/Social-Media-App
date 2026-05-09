import UserRepository from "../../DB/repositories/user.repository";
import redisService from "../../common/service/redis.service";
import { S3Service } from "../../common/service/s3.service";
import PostRepository from "../../DB/repositories/post.repository";
import NotificationService from "../../common/service/notification.service";
import CommentRepository from "../../DB/repositories/comment.repository";
import { NextFunction, Request, Response } from "express";
import { addCommentDto } from "./comment.dto";
import { PostIdDto } from "../post/post.dto";
import { Types } from "mongoose";
import { AppCheck } from "firebase-admin/app-check";
import { AppError } from "../../common/utils/golbal.error.handler";
import { successResponse } from "../../common/utils/successResponce";
import { allowCommentEnum } from "../../common/enum/post.enum";

class commentService {

  private readonly _userRepo = new UserRepository();
  private readonly _postRepo = new PostRepository();
  private readonly _commentRepo = new CommentRepository();
  private readonly _redisService = redisService;
  private readonly _s3Service = new S3Service();
  private readonly _notificationService = NotificationService;
  constructor() { };

  addComment = async (req: Request, res: Response, next: NextFunction) => {
    const { content }: addCommentDto = req.body;
    const { postId } = req.params;

    const post = await this._postRepo.findById(new Types.ObjectId(postId as string));

    if (!post) {
      throw new AppError("Post not exist");
    }

    if (post.allowComment !== allowCommentEnum.allow) {
      throw new AppError("Comments are not allowed for this post");
    }

    const comment = this._commentRepo.create({
      content,
      postId: new Types.ObjectId(postId as string),
      userId: req?.user?._id!
    })

    if (!comment) {
      throw new AppError("Failed to add this comment");
    }

    successResponse({ res, message: "Done adding your comment" })
  };

  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    const { commentId } = req.params;

    if (!req.user) {
      throw new AppError("Not Authorized");
    }

    const comment = this._commentRepo.findOneAndDelete({
      filter: {
        _id: new Types.ObjectId(commentId as string),
        userId: req.user._id,
      }
    });

    if (!comment) {
      throw new AppError("Failed to delete this comment");
    }


    successResponse({ res, message: "Done deleting your comment" })
  };

  updateComment = async (req: Request, res: Response, next: NextFunction) => {
    const { content } = req.body;
    const { commentId } = req.params;

    if (!req.user) {
      throw new AppError("Not Authorized");
    }

    const comment = await this._commentRepo.findOneAndUpdate({
      filter: {
        _id: new Types.ObjectId(commentId as string),
        userId: req.user._id,
      },
      update: {
        content
      }
    });

    if (!comment) {
      throw new AppError("Failed to update this comment");
    }


    successResponse({ res, message: "Done updateing your comment", data: comment })
  };
}

export default new commentService;