import { Router } from "express";
import { verifyJwtToken } from "../middlewares/auth.middlewares.js";
import { getLikedVideos, toggleCommentLike, toggleVideoLike } from "../controllers/like.controllers.js";

const router = Router()

//secured routes
router.route('/').get(verifyJwtToken, getLikedVideos)
router.route('/video/:videoId').post(verifyJwtToken, toggleVideoLike)
router.route('/comment/:commentId').post(verifyJwtToken, toggleCommentLike)

export default router
