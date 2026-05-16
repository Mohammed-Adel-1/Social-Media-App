import UserRepository from "../../DB/repositories/user.repository";
import redisService from "../../common/service/redis.service";
import { S3Service } from "../../common/service/s3.service";
import { NextFunction, Request, Response } from "express";
import { createPostDto, PostIdDto, reactDto, updatePostDto } from "./post.dto";
import { AppError } from "../../common/utils/golbal.error.handler";
import { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import PostRepository from "../../DB/repositories/post.repository";
import { availabilityEnum, removeReactEnum } from "../../common/enum/post.enum";
import { updatePasswordDto } from "../users/users.dto";
import NotificationService from "../../common/service/notification.service";
import { AvailabilityPost } from "../../common/utils/post.utils";
import { reactSchema } from "./post.validation";
import { successResponse } from "../../common/utils/successResponce";

class postService {

  private readonly _userRepo = new UserRepository();
  private readonly _postRepo = new PostRepository();
  private readonly _redisService = redisService;
  private readonly _s3Service = new S3Service();
  private readonly _notificationService = NotificationService;
  constructor() { };

  createPost = async (req: Request, res: Response, next: NextFunction) => {
    const { content, allowComment, availability, tags }: createPostDto = req.body;

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
    const folderId = randomUUID();
    if (req.files) {
      urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${folderId}`
      })
    }

    const post = await this._postRepo.create({
      content: content!,
      attachments: urls,
      createdBy: req?.user?._id!,
      tags: mentions,
      folderId,
      availability,
      allowComment
    })

    if (!post) {
      await this._s3Service.deleteFiles(urls);
      throw new AppError("Failed to create post");
    }

    if (fcmTokens.length) {
      await this._notificationService.sendNotifications({
        tokens: fcmTokens,
        data: {
          title: `You are mentioned in ${req.user?.firstName}'s post`,
          body: content || ""
        }
      })
    }

    res.status(200).json({
      message: "Post created successfully",
      data: post
    });

  };

  getPosts = async (req: Request, res: Response, next: NextFunction) => {

    const posts = await this._postRepo.paginate({
      page: +req?.query?.page!,
      limit: +req?.query?.limit!,
      search: {
        ...AvailabilityPost(req),
        ...(
          req.query.search ? {
            $or: [
              { content: { $regex: req.query.search, $options: "i" } }
            ]
          } : {}
        )
      },
      populate: [
        {
          path: "comments",
          populate: [
            { path: "replies" }
          ]
        },

      ]
    })

    res.status(200).json({ data: posts });
  };

  reactPost = async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const { react, flag }: reactDto = req.query;

    if (!req.user) {
      throw new AppError("Not Authorized");
    }

    let update: any;

    if (flag === removeReactEnum.remove) {
      update = {
        $pull: {
          reacts: {
            userId: req.user._id
          }
        }
      };
    } else {
      update = [
        {
          $set: {
            reacts: {
              $filter: {
                input: "$reacts",
                as: "r",
                cond: {
                  $ne: ["$$r.userId", req.user._id]
                }
              }
            }
          }
        },
        {
          $set: {
            reacts: {
              $concatArrays: [
                "$reacts",
                [
                  {
                    userId: req.user._id,
                    react
                  }
                ]
              ]
            }
          }
        }
      ];
    }

    const post = await this._postRepo.findByIdAndUpdate({ id: new Types.ObjectId(postId as string), update, options: { updatePipeline: true } });


    if (!post) {
      throw new AppError("Failed to react to this post");
    }

    successResponse({ res, message: "Done reacting to the post", data: post });
  };

  updatePost = async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const { content, allowComment, availability, tags, removeFiles, removeTags }: updatePostDto = req.body;

    const post = await this._postRepo.findOne({
      filter: {
        _id: new Types.ObjectId(postId as string),
        createdBy: req?.user?._id!,
      }
    })

    if (!post) {
      throw new AppError("Post not found, Not authorized");
    }

    if (removeFiles?.length) {

      const invalidFiles = removeFiles.filter((file: string) => {
        return !post?.attachments?.includes(file);
      })

      if (invalidFiles.length) {
        throw new AppError("Some of path file you want to remove not exist");
      }

      await this._s3Service.deleteFiles(removeFiles);

      post.attachments = post?.attachments?.filter((file: string) => {
        return !removeFiles.includes(file);
      }) || [];


    }

    if (req.files?.length) {
      let urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${post.folderId}`
      })
      post.attachments?.push(...urls)
    }



    const updateTags = new Set(post?.tags?.map((id) => id.toString()));

    removeTags?.forEach((tag: string) => {
      return updateTags.delete(tag);
    })

    let fcmTokens: string[] = [];

    if (tags?.length) {

      if (tags.includes(req?.user?._id.toString()!)) {
        throw new AppError("You can't tag yourself");
      }

      const mentionedPeople = await this._userRepo.find({
        filter: {
          _id: { $in: tags }
        }
      })

      if (mentionedPeople.length !== tags.length) {
        throw new AppError("Invalid tag id")
      }

      const x = post.tags || [];
      for (const mentioned of mentionedPeople) {
        if (x.includes(mentioned._id)) {
          throw new AppError("You can't tag the same person twice");
        }
        updateTags.add(mentioned._id.toString());

        (await this._redisService.getFCMs(mentioned._id)).map((token) => {
          fcmTokens.push(token);
        });
      }

    }
    post.tags = [...updateTags].map((id: string) => new Types.ObjectId(id));

    if (fcmTokens.length) {
      await this._notificationService.sendNotifications({
        tokens: fcmTokens,
        data: {
          title: `You are mentioned in ${req.user?.firstName}'s post`,
          body: content || post.content || ""
        }
      })
    }


    if (content) post.content = content;
    if (availability) post.availability = availability;
    if (allowComment) post.allowComment = allowComment;

    await post.save();

    res.status(200).json({ message: "Post updated successfully", post });
  };

  deletePost = async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;

    if (!req.user) {
      throw new AppError("Not Authorized");
    }

    const post = await this._postRepo.findOneAndDelete({
      filter: {
        _id: postId,
        createdBy: req.user._id
      }
    })

    if (!post) {
      throw new AppError("Failed to delete post");
    }

    await this._s3Service.deleteFiles(post.attachments!);

    successResponse({ res, message: "Done deleting your post" });
  };
}

export default new postService;