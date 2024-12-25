import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { getCurrentUser, loginUser, logoutUser, registerUser } from "../controllers/user.controllers.js";
import { verifyJwtToken } from "../middlewares/auth.middlewares.js";

const router = Router()

router.route('/register').post(upload.fields([
    {
        name: 'avatar',
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]), registerUser)

router.route('/login').post(upload.none(), loginUser)
router.route('/refresh-token').post(verifyJwtToken)

//secured routes
router.route('/current-user').get(verifyJwtToken, getCurrentUser)
router.route('/logout').get(verifyJwtToken, logoutUser)

export default router
