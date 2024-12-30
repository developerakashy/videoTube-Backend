import { Router } from "express";
import { verifyJwtToken } from "../middlewares/auth.middlewares.js";
import { addComment, deleteComment, getAllComments, updateComment } from "../controllers/comment.controllers.js";

const router = Router()


router.route('/:videoId').get(verifyJwtToken, getAllComments)
//secured routes
router.route('/:videoId').post(verifyJwtToken, addComment)
router.route('/:commentId').patch(verifyJwtToken, updateComment)
router.route('/:commentId').delete(verifyJwtToken, deleteComment)

export default router
