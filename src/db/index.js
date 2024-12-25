import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`)

        console.log(`MongoDb Connected: ${connectionInstance.connection.host}`)

    } catch(e) {
        console.log(e)
    }
}

export { connectDB }
