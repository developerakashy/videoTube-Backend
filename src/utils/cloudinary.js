import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {

    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        fs.unlinkSync(localFilePath)
        return response

    } catch (error) {
        console.log('Error uploading file', error)
        fs.unlinkSync(localFilePath)

        return null
    }
}

const destroyOnCloudinary = async (public_id, options = {resource_type: 'image'}) => {
    try {
        const response = await cloudinary.uploader.destroy(public_id, options)

        return response
    } catch (error) {
        console.log('file not found')
    }
}

export { uploadOnCloudinary, destroyOnCloudinary }
