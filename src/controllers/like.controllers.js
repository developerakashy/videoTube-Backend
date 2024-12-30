import mongoose from "mongoose";
import { Like } from "../models/like.models.js";
import { asyncHandler } from "../utils/asyncRequestHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    const isVideoAvailable = await Video.findById(videoId)

    if(!isVideoAvailable){
        throw new ApiError(400, 'video not found')
    }

    let videoLike = await Like.findOne({
        video: new mongoose.Types.ObjectId(videoId)
    })

    if(!videoLike){
        console.log('video like creation', videoLike)
        const likeCreation = await Like.create({
            video: new mongoose.Types.ObjectId(videoId)
        })

        if(!likeCreation){
            throw new ApiError(400, 'something went wrong while creating video like')
        }

        videoLike = await Like.findOne({
            video: new mongoose.Types.ObjectId(videoId)
        })
    }

    if(!videoLike){
        throw new ApiError(400, 'something went wrong while getting video like')
    }

    const userLiked = videoLike?.users.indexOf(req.user._id)


    if(userLiked === -1){

        const addUser = await Like.updateOne(
            { video: videoId },
            {
                $addToSet: {
                    users: req.user._id
                }
            }
        )

        if(!addUser){
            throw new ApiError(400, 'something went wrong while liking the video')
        }

        console.log('user added successfully')

    }else{

        const removeUser = await Like.updateOne(
            { video: videoId },
            {
                $pull: {
                    users: req.user._id
                }
            }
        )

        if(!removeUser){
            throw new ApiError(400, 'something went wrong while unliking video')
        }

        console.log('user removed successfully')
    }

    let videoLiked = await Like.findOne({
        video: new mongoose.Types.ObjectId(videoId)
    })

    if(!videoLiked){
        throw new ApiError(400, 'something went wrong while getting video likes')
    }

    return res.status(200).json(new ApiResponse(200, videoLiked, 'like toggled'))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    const isComment = await Comment.findById(commentId)

    if(!isComment){
        throw new ApiError(400, 'comment not found')
    }

    let commentLike = await Like.findOne({
        comment: new mongoose.Types.ObjectId(commentId)

    })

    if(!commentLike){
        const commentLikeCreation = await Like.create({
            comment: new mongoose.Types.ObjectId(commentId)
        })

        if(!commentLikeCreation){
            throw new ApiError(400, 'something went wrong while creating the comment')
        }

        commentLike = await Like.findOne({
            comment: new mongoose.Types.ObjectId(commentId)
        })
    }

    if(!commentLike){
        throw new ApiError(400, 'something went wrong while getting comment like')
    }

    const userLiked = commentLike?.users.indexOf(req?.user?._id)
    
    if(userLiked === -1){
        const addUser = await Like.updateOne(
            {comment: commentId},
            {
                $addToSet: {
                    users: req?.user?._id
                }
            }
        )

        if(!addUser){
            throw new ApiError(400, 'something went wrong while liking the comment')
        }

        console.log('user added successfully')

    } else {
        const removeUser = await Like.updateOne(
            {comment: commentId},
            {
                $pull: {
                    users: req?.user?._id
                }
            }
        )

        if(!removeUser){
            throw new ApiError(400, 'something went wrong while unliking the comment')
        }

        console.log('user removed successfully')
    }

    const commentLiked = await Like.findOne({
        comment: commentId
    })

    if(!commentLiked){
        throw new ApiError(400, 'something went wrong while getting comment likes')
    }

    return res.status(200).json(new ApiResponse(200, commentLiked, 'like toggle'))

})

const getLikedVideos = asyncHandler(async (req, res) => {
    const pipeline = [
        [
            {
              $unwind: '$users'
            },
            {
              $match: {
                users: new mongoose.Types.ObjectId(req?.user?._id)
              }
            },
            {
              $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'videoLiked'
              }
            },
            {
              $addFields: {
                video: {
                  $first: '$videoLiked'
                }
              }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'video.owner',
                    foreignField: '_id',
                    as: 'videoOwner'
                }
            },
            {
              $project: {
                video: 1
              }
            }
          ]
    ]

    try {
        const userLikedVideo = await Like.aggregate(pipeline)

        return res.status(200).json(new ApiResponse(200, userLikedVideo, 'user liked video retrieval success'))
    } catch (error) {
        throw new ApiError(400, error.message || 'something went in aggregation pipeline')
    }
})


export {
    toggleVideoLike,
    getLikedVideos,
    toggleCommentLike
}
