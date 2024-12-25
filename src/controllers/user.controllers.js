import { User } from "../models/user.models.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncRequestHandler.js"
import { destroyOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import fs from 'fs'
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(400, error?.message || 'something went wrong while generating tokens')
    }
}


const registerUser = asyncHandler(async (req, res) => {

    const avatarLocalFilePath = req.files?.avatar?.[0]?.path
    let coverImageLocalPath
    console.log(req.files)

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    function removeLocalImage(){
        if(avatarLocalFilePath){
            fs.unlinkSync(avatarLocalFilePath)
        }

        if(coverImageLocalPath){
            fs.unlinkSync(coverImageLocalPath)
        }
    }


    const {fullname, username, email, password} = req.body

    if(
        [fullname, username, email, password].some(field => field?.trim() === '') ||
        !fullname || !username || !password || !email
    ){
        removeLocalImage()
        throw new ApiError(400, 'All fields are mandatory')
    }


    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        console.log(existedUser)
        removeLocalImage()
        throw new ApiError(400, 'User already exist')
    }


    if(!avatarLocalFilePath){
        removeLocalImage()
        throw new ApiError(400, "Avatar file is required")
    }

    let avatar
    try {
        avatar = await uploadOnCloudinary(avatarLocalFilePath)
        console.log("avatar uploaded: ", avatar)
    } catch (error) {
        throw new ApiError(500, 'Failed to upload avatar')
    }

    let coverImage
    try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
        console.log("coverImage uploaded: ", coverImage)
    } catch (error) {
        throw new ApiError(500, 'Failed to upload coverImage')
    }


    try {

        const user = await User.create({
            username: username.toLowerCase(),
            email,
            fullname,
            avatar: avatar.url,
            coverImage: coverImage.url || '',
            password
        })

        const userCreated = await User.findById(user._id).select(
            '-password -refreshToken'
        )

        if(!userCreated){
            throw new ApiError(500, "something went wrong while registering a user")
        }

        return res
            .status(201)
            .json(new ApiResponse(201, userCreated, "user registered successfully"))
    } catch (error) {

        if(avatar){
            await destroyOnCloudinary(avatar.public_id)
        }

        if(coverImage){
            await destroyOnCloudinary(coverImage.public_id)
        }
        console.log(error)

        throw new ApiError(500, error?.message ? `${error?.message} and images were deleted` : `something went wrong while registering and images were deleted`)
    }

})


const loginUser = asyncHandler(async (req, res) => {
    const {username, email, password} = req.body

    if(!username || !email || !password){
        throw new ApiError(400, 'All fields are mandatory')
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(400, 'user does not exist')
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(400, 'Incorrect Password')
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)


    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }, 'User logged in successfully'))

})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            'user fetched successfully'
        ))
})

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }

    return res
        .clearCookie('accessToken', options)
        .clearCookie('refreshToken', options)
        .json(new ApiResponse(200, {}, 'user logout successfully'))
})

export {
    registerUser,
    loginUser,
    getCurrentUser,
    logoutUser,
    generateAccessAndRefreshToken

}
