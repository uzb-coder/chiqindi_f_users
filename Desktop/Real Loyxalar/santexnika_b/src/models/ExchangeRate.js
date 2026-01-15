import mongoose from "mongoose";

const exchangeRateSchema = new mongoose.Schema({
  usd: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("ExchangeRate", exchangeRateSchema);
