import { asyncHandler } from "../utils/asyncRequestHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const heathcheck = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, 'OK', 'Health check passed'))
})

export {heathcheck}
