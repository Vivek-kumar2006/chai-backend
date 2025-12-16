import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadCloudinary } from "../utils/cloudinary.service.js"

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    
    // 1. Validate Text Fields
    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title and Description are required")
    }

    // 2. Validate Files
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is missing")
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is missing")
    }

    // 3. Upload to Cloudinary
    const videoFile = await uploadCloudinary(videoLocalPath)
    const thumbnail = await uploadCloudinary(thumbnailLocalPath)

    if (!videoFile) {
        throw new ApiError(400, "Video upload failed")
    }
    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail upload failed")
    }

    // 4. Create Video Document
    // Note: Cloudinary response contains 'duration' property for videos
    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
       duration: videoFile.duration || 0, // Cloudinary provides duration in seconds
        owner: req.user._id,
        isPublished: true
    })

    const createdVideo = await Video.findById(video._id)

    if (!createdVideo) {
        throw new ApiError(500, "Video upload failed please try again")
    }

    return res.status(201).json(
        new ApiResponse(200, createdVideo, "Video published successfully")
    )
})

const getAllVideos = asyncHandler(async (req, res) => {
    // Simple feed: Get all published videos, sorted by newest first
    const videos = await Video.aggregate([
        {
            $match: {
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1, // backend usually expects camelCase here in projection
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $sort: {
                createdAt: -1 // Newest videos first
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    )
})

// Optional: You might need these later, keeping them as placeholders
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        }
    ])

    if (!video?.length) {
        throw new ApiError(404, "Video not found")
    }

    return res.status(200).json(
        new ApiResponse(200, video[0], "Video fetched successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById
}  