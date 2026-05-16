import UserRepository from "../../DB/repositories/user.repository";
import redisService from "../../common/service/redis.service";
import { S3Service } from "../../common/service/s3.service";
import PostRepository from "../../DB/repositories/post.repository";
import NotificationService from "../../common/service/notification.service";
import CommentRepository from "../../DB/repositories/comment.repository";
import { NextFunction, Request, Response } from "express";
import { addCommentDto } from "./comment.dto";
import { PostIdDto } from "../post/post.dto";
import { HydratedDocument, Types } from "mongoose";
import { AppCheck } from "firebase-admin/app-check";
import { AppError } from "../../common/utils/golbal.error.handler";
import { successResponse } from "../../common/utils/successResponce";
import { allowCommentEnum, onModelEnum } from "../../common/enum/post.enum";
import { AvailabilityPost } from "../../common/utils/post.utils";
import { randomUUID } from "node:crypto";
import { match } from "node:assert";
import { IComment } from "../../DB/models/comment.model";
import { IPost } from "../../DB/models/post.model";

class commentService {

  private readonly _userRepo = new UserRepository();
  private readonly _postRepo = new PostRepository();
  private readonly _commentRepo = new CommentRepository();
  private readonly _redisService = redisService;
  private readonly _s3Service = new S3Service();
  private readonly _notificationService = NotificationService;
  constructor() { };

  addComment = async (req: Request, res: Response, next: NextFunction) => {
    const { content, tags, onModel }: addCommentDto = req.body;
    const { postId, commentId } = req.params;

    let doc: HydratedDocument<IPost | IComment> | null = null;

    if (onModel === onModelEnum.post && !commentId) {
      doc = await this._postRepo.findOne({
        filter: {
          _id: new Types.ObjectId(postId as string),
          ...AvailabilityPost(req),
          allowComment: allowCommentEnum.allow,
        }
      });

      if (!doc) {
        throw new AppError("Post not exist, not allowed to commetn on this post");
      }
    } else if (onModel === onModelEnum.comment && commentId) {
      const comment = await this._commentRepo.findOne({
        filter: {
          _id: commentId,
          refId: postId!
        },
        options: {
          populate: [
            {
              path: "refId",
              match: {
                ...AvailabilityPost(req),
                allowComment: allowCommentEnum.allow,
              },
            },

          ]
        }
      });

      if (!comment?.refId) {
        throw new AppError("comment not exist, not allowed to add reply to this post");
      }
      doc = comment;
    }

    if(!doc){
      throw new AppError("Invalid onModel value")
    }


    let mentions: Types.ObjectId[] = [];
    let fcmTokens: string[] = [];

    if (tags?.length) {

      const mentionedTags = await this._userRepo.find({
        filter: {
          _id: { $in: tags }
        }
      })

      if (mentionedTags.length !== tags.length) {
        throw new AppError("Invalid tag id")
      }

      for (const tag of mentionedTags) {
        mentions.push(tag._id);
        (await this._redisService.getFCMs(tag._id)).map((token) => { fcmTokens.push(token) });
      }
    }


    let urls: string[] = [];
    if (req.files) {
      urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${doc?.folderId}`
      })
    }

    const comment = await this._commentRepo.create({
      content: content!,
      attachments: urls,
      createdBy: req?.user?._id!,
      refId: new Types.ObjectId(doc?._id as unknown as string),
      tags: mentions,
      folderId: doc?.folderId!,
      onModel
    })

    if (!comment) {
      await this._s3Service.deleteFiles(urls);
      throw new AppError("Failed to add this comment");
    }

    if (fcmTokens.length) {
      await this._notificationService.sendNotifications({
        tokens: fcmTokens,
        data: {
          title: `You are mentioned in ${req.user?.firstName}'s comment`,
          body: content || ""
        }
      })
    }

    successResponse({ res, message: "Done adding your comment" })
  };

  addReply = async (req: Request, res: Response, next: NextFunction) => {
    const { content, tags }: addCommentDto = req.body;
    const { postId, commentId } = req.params;

    const comment = await this._commentRepo.findOne({
      filter: {
        _id: commentId,
        refId: postId!
      },
      options: {
        populate: [
          {
            path: "refId",
            match: {
              ...AvailabilityPost(req),
              allowComment: allowCommentEnum.allow,
            },
          },

        ]
      }
    });

    if (!comment) {
      throw new AppError("comment not exist, not allowed to add reply to this comment");
    }

    let mentions: Types.ObjectId[] = [];
    let fcmTokens: string[] = [];

    if (tags?.length) {

      const mentionedTags = await this._userRepo.find({
        filter: {
          _id: { $in: tags }
        }
      })

      if (mentionedTags.length !== tags.length) {
        throw new AppError("Invalid tag id")
      }

      for (const tag of mentionedTags) {
        mentions.push(tag._id);
        (await this._redisService.getFCMs(tag._id)).map((token) => { fcmTokens.push(token) });
      }
    }


    let urls: string[] = [];
    if (req.files) {
      urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${comment.folderId}`
      })
    }

    const reply = await this._commentRepo.create({
      content: content!,
      attachments: urls,
      createdBy: req?.user?._id!,
      refId: new Types.ObjectId(commentId as string),
      tags: mentions,
      folderId: comment.folderId,
    })

    if (!reply) {
      await this._s3Service.deleteFiles(urls);
      throw new AppError("Failed to add this comment");
    }

    if (fcmTokens.length) {
      await this._notificationService.sendNotifications({
        tokens: fcmTokens,
        data: {
          title: `You are mentioned in ${req.user?.firstName}'s comment`,
          body: content || ""
        }
      })
    }

    successResponse({ res, message: "Done adding your reply" })
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