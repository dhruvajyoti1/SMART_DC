import mongoose from "mongoose";
import logger from "./logger.js";

export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/smartdc-energy";

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected: %s", mongoose.connection.name);
  });
  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error: %s", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  await mongoose.connect(uri);
  return mongoose.connection;
}
