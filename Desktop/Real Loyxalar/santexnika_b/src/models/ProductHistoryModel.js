import mongoose from "mongoose";

const productHistorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  oldQuantity: { type: Number, required: true },
  addedQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("ProductHistory", productHistorySchema);
