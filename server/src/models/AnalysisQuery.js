import mongoose from "mongoose";

const analysisQuerySchema = new mongoose.Schema(
  {
    forecastFeatures: { type: mongoose.Schema.Types.Mixed, required: true },
    anomalyFeatures: { type: mongoose.Schema.Types.Mixed, required: true },
    result: {
      forecastedTotalPowerKwh: { type: Number, required: true },
      anomalyStatus: { type: String, enum: ["normal", "FAILURE"], required: true },
      anomalyProbability: { type: Number, required: true, min: 0, max: 1 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("AnalysisQuery", analysisQuerySchema);
