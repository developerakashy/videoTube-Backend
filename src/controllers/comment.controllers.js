import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncRequestHandler.js";
import { Comment } from "../models/comment.models.js";
import mongoose from "mongoose";

const getAllComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    let {page = 1, limit = 10} = req.query

    page = Number(page)
    limit = Number(limit)
    const skip = (page - 1) * limit

    const pipeline = []

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, 'video Unavailable')
    }

    const currentUser = req?.user ? new mongoose.Types.ObjectId(req.user._id) : ""

    pipeline.push(
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        {
            $addFields: {
                userDetail: {
                    $first: '$userInfo'
                }
            }
        },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'comment',
                as: 'commentLikeModel'
            }
        },
        {
            $addFields: {
                likes: {
                    $size: {
                        $ifNull: [{$arrayElemAt: ['$commentLikeModel.users', 0]}, []]
                    }
                },
                userLiked: {
                    $in: [currentUser, {$ifNull: [{$arrayElemAt: ['$commentLikeModel.users', 0]}, []]}]
                }
            }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $project: {
                userDetail: 1,
                content: 1,
                userLiked: 1,
                likes: 1
            }
        }
    )


    try {
        const comment = await Comment.aggregate(pipeline)

        if(!comment){
            throw new ApiError(400, 'comment not found')
        }

        return res.status(200).json(new ApiResponse(200, comment, 'comments fetched successfully'))
    } catch (error) {

        throw new ApiError(400, error.message || 'unable to find video comments')
    }


})

const addComment = asyncHandler(async (req, res) => {
    const {content} = req.body
    const {videoId} = req.params

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, 'video unavailable! cannot comment')
    }

    try {
        const comment = await Comment.create({
            content: content.trim(),
            owner: req.user._id,
            video: videoId
        })

        if(!comment){
            throw new ApiError(400, 'something went wrong while commenting')
        }

        return res.status(200).json(new ApiResponse(200, comment, 'successfully commented'))
    } catch (error) {

        throw new ApiError(400, error?.message || 'something went wrong')
    }

})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if(!content?.trim()){
        throw new ApiError(400, 'updation field required')
    }


    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(400, 'comment not found')
    }

    if(req.user._id.toString() !== comment.owner.toString()){
        throw new ApiError(400, 'user is unauthorized to edit comment')
    }

    try {

        const updateComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content: content
                }
            }
        )

        const commentUpdated = await Comment.findById(updateComment._id)

        if(!commentUpdated){
            throw new ApiError(400, 'something went wrong while updating')
        }

        return res.status(204).json(new ApiResponse(204, commentUpdated, 'updation successfull'))

    } catch (error) {

        throw new ApiError(400, error?.message || 'something went wrong while updating the comment')

    }
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(400, 'unable to locate comment')
    }

    if(req.user._id.toString() !== comment.owner.toString()){
        throw new ApiError('400', 'user unautorized to delete comment')
    }

    try {
        const commentDeleted = await Comment.findByIdAndDelete(commentId)

        if(!commentDeleted){
            throw new ApiError(400, 'something went wrong while deleting the comment')
        }

        return res.status(200).json(new ApiResponse(200, commentDeleted, 'comment deleted successfully'))
    } catch (error) {

        throw new ApiError(400, error?.message || 'something went wrong while deleting the video')

    }
})


export  {
    addComment,
    getAllComments,
    updateComment,
    deleteComment
}
