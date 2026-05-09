import { Types } from "mongoose";
import { availabilityEnum } from "../enum/post.enum";
import { Request } from "express";

export const AvailabilityPost = (req: Request) => {
    return {
        $or: [
            { availability: availabilityEnum.public },
            req.user?._id
                ? {
                    availability: availabilityEnum.onlyme,
                    createdBy: req.user._id
                }
                : {},
            {
                availability: availabilityEnum.friends,
                createdBy: {
                    $in: [req.user?._id, ...(req.user?.friends || [])]
                }
            },
            { tags: { $in: [req.user?._id] } }
        ]
    };
};