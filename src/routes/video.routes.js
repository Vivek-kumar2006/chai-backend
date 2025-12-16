// import { Router } from 'express';
// import { verifyJWT } from "../middlewares/auth.middleware.js";
// import { upload } from "../middlewares/multer.middleware.js";
// import { publishAVideo, getAllVideos } from "../controllers/video.controller.js";

// const router = Router();
// router.use(verifyJWT); // Apply verifyJWT to all routes

// router.route("/publish").post(
//     upload.fields([
//         { name: "videoFile", maxCount: 1 },
//         { name: "thumbnail", maxCount: 1 }
//     ]),
//     publishAVideo
// );

// router.route("/").get(getAllVideos);

// export default router;

import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { publishAVideo, getAllVideos, getVideoById } from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes

// --- 1. FEED ROUTE (Get All Videos) ---
// This matches "http://localhost:9000/api/v1/videos/"
router.route("/").get(getAllVideos);

// --- 2. PUBLISH ROUTE (Upload Video) ---
// This matches "http://localhost:9000/api/v1/videos/publish"
router.route("/publish").post(
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishAVideo
);

// --- 3. VIDEO DETAIL ROUTE (Watch Video) ---
// This matches "http://localhost:9000/api/v1/videos/:videoId"
router.route("/:videoId").get(getVideoById);

export default router;