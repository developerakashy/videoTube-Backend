import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema({
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    video: {
        type: Schema.Types.ObjectId,
        ref: 'Video'
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }
})

export const Like = mongoose.model('Like', likeSchema)
