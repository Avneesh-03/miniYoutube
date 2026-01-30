import {Router} from "express"
import { logoutUser, registerUser,loginUser,refreshAccessToken ,getCurrentUser ,
changeCurrentPassword,updateAccountDetails,updateAvatar,updateUserCoverImage,
getUserChannelProfile,getWatchHistory} from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()
//send image

router.route("/register").post(
    upload.fields([
        {                           // since there are two files to upload so two objects
            name : "avatar",
            maxCount:1
        },
        {
            name : "coverImage",
            maxCount:1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT  ,logoutUser)

router.route("/access-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account-details").patch(verifyJWT,updateAccountDetails)
router.route("/update-Avatar").patch(verifyJWT,upload.single("avatar"),updateAvatar)
router.route("/update-CoverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
//special
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("get-Watch-history").get(verifyJWT,getWatchHistory)
export default router