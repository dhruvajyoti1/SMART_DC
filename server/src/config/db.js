import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/smartdc-energy";

  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected:", mongoose.connection.name);
  });
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  await mongoose.connect(uri);
  return mongoose.connection;
}
