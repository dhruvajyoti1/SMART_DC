import mongoose from "mongoose";

const cachedResultsSchema = new mongoose.Schema(
  {
    resultType: { type: String, enum: ["forecast", "anomaly"], required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CachedResults", cachedResultsSchema);
