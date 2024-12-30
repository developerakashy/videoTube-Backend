import { asyncHandler } from "../utils/asyncRequestHandler.js";
import jwt from 'jsonwebtoken'
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { generateAccessAndRefreshToken } from "../controllers/user.controllers.js";


const verifyJwtToken = asyncHandler(async (req, res, next) => {
    const incomingAccessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken


    if(!incomingAccessToken || !incomingRefreshToken){
        if((req?.baseUrl === '/api/v1/video' || req?.baseUrl === '/api/v1/comment') && req?.method === 'GET'){

            return next()
        }

        throw new ApiError(400, 'user not loggedIn')
    }

    try {
        const decodeToken = jwt.verify(incomingAccessToken, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodeToken._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(400, 'Invalid access token')
        }

        req.user = user

        return next()

    } catch (error) {
        console.warn('Access token expired')
        if(!(error?.name === 'TokenExpiredError')) throw new ApiError(400, error?.name)
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
    try {
        console.warn('New token creation using Refresh')
        const decodeToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodeToken._id).select("-password")

        if(!user){
            throw new ApiError(400, 'Invalid refresh token')
        }

        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(400, 'Refresh token used or expired')
        }

        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        const tokenRefreshedUser = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

        req.user = tokenRefreshedUser
        res.cookie('accessToken', accessToken, options).cookie('refreshToken', newRefreshToken, options)

        next()

    } catch (error) {
        if(error?.name === 'TokenExpiredError'){
            res.clearCookie('accessToken', options).clearCookie('refreshToken', options)
        }

        throw new ApiError(400, error?.message || 'Token invalid or expired')
    }
})

export { verifyJwtToken }
