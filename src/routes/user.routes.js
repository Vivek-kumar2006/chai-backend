import { Router } from "express";
import { loginUser, registerUser,logoutUser,refreshAccessToken, changeCurrentPassword, updateUserAvatar, updatecoverImage, getChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getCurrentUser } from "../controllers/user.controller.js";

const router = Router()


router.route("/register").post(
    upload.fields([
    {
       name:"avatar",
       maxCount:1
    },
    {
        name:"coverImage",
        maxCount:1
    }]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)  
router.route("/cover-image").patch(verifyJWT,upload.single("/coverImage"),updatecoverImage)

router.route("/c/:username").get(verifyJWT,getChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory)

export default  router
