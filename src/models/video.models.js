import mongoose, { Schema, Types } from "mongoose";

const videoSchema = new Schema({
    video: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    views: {
        type: String
    },
    isPublished: {
        type: Boolean,
        default: false
    }

}, {timestamps: true})

export const Video = mongoose.model('Video', videoSchema)
