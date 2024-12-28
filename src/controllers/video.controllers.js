import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncRequestHandler.js";
import fs from 'fs'
import { destroyOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";


const getAllVideos = asyncHandler(async (req, res) => {
    let {page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'hightolow', userId } = req.query

    if(!sortBy.trim()){
        sortBy = 'createdAt'
    }

    if(!sortType.trim()){
        sortType = 'hightolow'
    }

    limit = Number(limit)
    page = Number(page)
    //sortType Defined
    //sortBy Defined

    let skip = (page - 1) * limit
    let sortOrder = sortType.toLowerCase() === 'hightolow' ? -1 : 1
    let pipeline = []


    if(userId.trim()){
        const user = await User.findById(userId)

        if(user){
            pipeline.push({
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            })
        }

    }

    pipeline.push({
        $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'userInfo'
        },
    })

    pipeline.push({
        $addFields: {
            userDetail: {
                $first: '$userInfo'
            }
        }
    })

    if(query.trim()){

        pipeline.push({
            $match: {
                $or: [
                    {title: {$regex: query, $options: 'i'}},
                    {description: {$regex: query, $options: 'i'}},
                    {'userDetail.username': {$regex: query, $options: 'i'}},
                    {'userDetail.fullname': {$regex: query, $options: 'i'}}
                ]
            }
        })

    }

    pipeline.push({
        $sort: {
            [sortBy]: sortOrder
        }
    })

    pipeline.push(
        { $skip: skip },
        { $limit: limit}
    )

    pipeline.push({
        $project: {
            userDetail: 1,
            video: 1,
            thumbnail: 1,
            title: 1,
            description: 1,
            duration: 1,
            createdAt: 1,
            updatedAt: 1,
            isPublished: 1
        }
    })

    try {
        const video = await Video.aggregate(pipeline)

        if(!video || !video.length){
            throw new ApiError(400, 'no videos available')
        }

        res.status(200).json(new ApiResponse(200, video, 'data retreival success'))

    } catch (error) {

        throw new ApiError(400, error.message || 'failed to find video')

    }




    //sortBy - depending on different fields in model - optional like recently created
    //sortType: HighToLow, LowToHigh - default creation - optional
    //userId - optional
    //query -  regex for title or description or username - optional

})


const publishAVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body

    const videoLocalFilePath = req.files?.video?.[0]?.path
    const thumbnailLocalFilePath = req.files?.thumbnail?.[0]?.path


    function removeLocalImage(){
        if(videoLocalFilePath){
            fs.unlinkSync(videoLocalFilePath)
        }

        if(thumbnailLocalFilePath){
            fs.unlinkSync(thumbnailLocalFilePath)
        }
    }

    if(!title?.trim() || !description?.trim()){
        removeLocalImage()
        throw new ApiError(400, 'All fields are mandatory')
    }

    if(req.files?.video?.[0]?.mimetype !== 'video/mp4' || !videoLocalFilePath){
        removeLocalImage()
        let errMsg = videoLocalFilePath ? 'video file unsupported' : 'video required'
        throw new ApiError(400, errMsg)
    }

    if(req.files?.thumbnail?.[0]?.mimetype === 'video/mp4' || !thumbnailLocalFilePath){
        removeLocalImage()
        let errMsg = thumbnailLocalFilePath ? 'should be an image' : 'thumbail required'
        throw new ApiError(400, errMsg)
    }



    let video
    try {
        video = await uploadOnCloudinary(videoLocalFilePath)
        console.log('video uploaded: ', video)
    } catch (error) {
        throw new ApiError(500, 'Failed to upload video')
    }

    let thumbnail
    try {
        thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath)
        console.log('thumbail uploaded: ', thumbnail)

    } catch (error) {
        throw new ApiError(500, 'Failed to upload thumbnail')
    }

    try {

        const videoCreated = await Video.create({
            video: video.url,
            title,
            description,
            owner: req.user._id,
            duration: video.duration,
            isPublished: true,
            thumbnail: thumbnail.url

        })

        console.log(videoCreated)

        const videoInfo = await Video.findById(videoCreated._id)

        if(!video){
            throw new ApiError(400, 'Something went wrong while uploading the video')
        }

        console.log('videoCreated: ', videoInfo)

        return res.status(201).json(new ApiResponse(201, videoInfo, 'video published successfully'))

    } catch (error) {
        if(video){
            await destroyOnCloudinary(video.public_id, {resource_type: 'video'})
        }

        if(thumbnail){
            await destroyOnCloudinary(thumbnail.public_id)
        }

        throw new ApiError(400, error.message || 'something went wrong while uploading video and images were deleted')
    }
})


const getVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    try {
        const video = await Video.findById(videoId)

        return res.status(200).json(new ApiResponse(200, video, 'video fetched successfully'))
    } catch (error) {

        throw new ApiError(400, 'video not found')
    }

})

//updates video title or discription or video or thumnail and also removes old videos and thumbnail
const updateVideoDetails = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title = '', description = ''} = req.body
    const newVideoLocalPath = req.files?.video?.[0]?.path
    const newThumbnailLocalPath = req.files?.thumbnail?.[0]?.path
    const update = {}

    const oldVideo = await Video.findById(videoId)
    let oldThumbnailPublicId
    let oldVideoPublicId

    if(req.user._id.toString() !== oldVideo.owner.toString()){
        removeLocalImage()
        throw new ApiError(400, 'user is unauthorized to update the video')
    }

    function removeLocalImage(){
        if(newVideoLocalPath){
            fs.unlinkSync(newVideoLocalPath)
        }

        if(newThumbnailLocalPath){
            fs.unlinkSync(newThumbnailLocalPath)
        }
    }

    if(!title?.trim() && !description?.trim() && !newThumbnailLocalPath && !newVideoLocalPath){
        removeLocalImage()
        throw new ApiError(400, 'Updation Fields required')
    }

    if(newVideoLocalPath && req.files?.video?.[0]?.mimetype !== 'video/mp4'){
        removeLocalImage()
        throw new ApiError(400, 'should be a video file')
    }

    if(newThumbnailLocalPath && req.files?.thumbnail?.[0]?.mimetype === 'video/mp4'){
        removeLocalImage()
        throw new ApiError(400, 'should be an image file')
    }

    let newVideo
    if(newVideoLocalPath){
        try {
            newVideo = await uploadOnCloudinary(newVideoLocalPath, { resource_type: 'video'})
            console.log('new VIdeo: ', newVideo)
        } catch (error) {
            throw new ApiError(400, 'Failed to upload video')
        }

    }

    let newThumbnail
    if(newThumbnailLocalPath){
        try {
            newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath)
            console.log('new Thumnail: ', newThumbnail)
        } catch (error) {
            throw new ApiError(400, 'Failed to upload Thumnail')
        }
    }

    if(title.trim()){
        update.title = title
    }

    if(description.trim()){
        update.description = description
    }

    if(newThumbnail){
        update.thumbnail = newThumbnail.url
    }

    if(newVideo){
        update.video = newVideo.url
        update.duration = newVideo.duration
    }



    try {
        const videoUpdated = await Video.findByIdAndUpdate(
            videoId,
            { $set: update }
        )

        const updatedVideo = await Video.findById(videoId)

        if(!updatedVideo){
            throw new ApiError(400, 'something went wrong while updating video')
        }

        if(newVideo){
            let urlArray = oldVideo.video.split('/')
            oldVideoPublicId = urlArray[urlArray.length - 1].split('.')[0]

            const res = await destroyOnCloudinary(oldVideoPublicId, {resource_type: 'video'})

            console.log(res)
        }

        if(newThumbnail){
            let urlArray = oldVideo.thumbnail.split('/')
            oldThumbnailPublicId = urlArray[urlArray.length - 1].split('.')[0]

            const res = await destroyOnCloudinary(oldThumbnailPublicId)

            console.log(res)
        }

        res.status(204).json(new ApiResponse(204, updatedVideo, 'updation successfull'))

    } catch (error) {
        if(newThumbnail){
            await destroyOnCloudinary(newThumbnail.public_id)
        }

        if(newVideo){
            await destroyOnCloudinary(newVideo, {resource_type: 'video'})
        }

        throw new ApiError(400, error.message || 'something went wrong and images were deleted')
    }

})

//delete's video doc and also video and thumnail from cloudianry
const deleteVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)


    if(req.user._id.toString() !== video.owner.toString()){
        throw new ApiError(400, 'user is not authorize to delete the video')
    }

    try {
        const videoDel = await Video.findByIdAndDelete(videoId)

        if(!videoDel){
            throw new ApiError(400, 'video not found')
        }

        let videoUrlArray = video.video.split('/')
        let thumbnailUrlArray = video.thumbnail.split('/')

        let videoPublicId = videoUrlArray[videoUrlArray.length - 1].split('.')[0]
        let thumbnailPublicId = thumbnailUrlArray[thumbnailUrlArray.length - 1].split('.')[0]

        await destroyOnCloudinary(videoPublicId, {resource_type: 'video'})
        await destroyOnCloudinary(thumbnailPublicId)

        res.status(200).json(new ApiResponse(200, videoDel, 'video deleted successfully'))
    } catch (error) {
        throw new ApiError(200, error.message || 'something went wrong while deleting the video')
    }
})



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideoDetails,
    deleteVideoById

}
