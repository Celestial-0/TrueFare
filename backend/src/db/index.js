import mongoose from "mongoose";
import { config } from "../config/index.js";

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(`${config.database.mongoUri}/${config.database.dbName}`, {
        });
        console.log(`MongoDB connected: ${connection.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;
