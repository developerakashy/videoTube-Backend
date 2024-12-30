import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import heathcheckRouter from './routes/healthcheck.routes.js'
import userRouter from './routes/user.routes.js'
import videoRouter from './routes/video.routes.js'
import commentRouter from './routes/comment.routes.js'
import likeRouter from './routes/Like.routes.js'



const app = express()


app.use(cors({
    origin: process.env.CORS_URL,
    credentials: true

}))


//common middlewares
app.use(express.json({limit: '16kb'}))
app.use(express.urlencoded({
    extended: true,
    limit: '16kb'
}))
app.use(express.static('public'))
app.use(cookieParser())


//routes
app.use('/api/v1/healthcheck', heathcheckRouter)
app.use('/api/v1/user', userRouter)
app.use('/api/v1/video', videoRouter)
app.use('/api/v1/comment', commentRouter)
app.use('/api/v1/like', likeRouter)


export { app }
