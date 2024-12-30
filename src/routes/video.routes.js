import { Router } from "express";
import { deleteVideoById, getAllVideos, getVideoById, publishAVideo, updateVideoDetails } from "../controllers/video.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwtToken } from "../middlewares/auth.middlewares.js";

const router = Router()

router.route('/:videoId').get(verifyJwtToken, getVideoById)
router.route('/').get(verifyJwtToken, getAllVideos)


//secured routes
router.route('/upload-video').post(verifyJwtToken ,upload.fields([
    {
        name: 'video',
        maxCount: 1
    },
    {
        name: 'thumbnail',
        maxCount: 1
    }
]), publishAVideo)

router.route('/:videoId').patch(verifyJwtToken, upload.fields([
    {
        name: 'video',
        maxCount: 1
    },
    {
        name: 'thumbnail',
        maxCount: 1
    }
]), updateVideoDetails)

router.route('/:videoId').delete(verifyJwtToken, deleteVideoById)


export default router
