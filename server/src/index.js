import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import liveRoutes from "./routes/liveRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173", "http://localhost:3000"] }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "SmartDC-Energy Express Server" });
});

app.use("/api/live", liveRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/analytics", analyticsRoutes);

// DB connection attempted but NOT blocking server startup -- ML prediction
// routes should keep working even if MongoDB is temporarily unavailable,
// since DB writes there are logging/audit trail, not the core value.
connectDB().catch((err) => {
  console.error("MongoDB connection failed (server will still serve ML-proxy routes):", err.message);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
