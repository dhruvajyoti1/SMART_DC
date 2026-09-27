import mongoose from "mongoose";

const simulationLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    forecastedTotalPowerKwh: { type: Number, required: true },
    anomalyStatus: { type: String, enum: ["normal", "FAILURE"], required: true },
    anomalyProbability: { type: Number, required: true, min: 0, max: 1 },
    position: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("SimulationLog", simulationLogSchema);
