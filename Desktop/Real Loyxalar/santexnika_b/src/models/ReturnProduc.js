import mongoose from "mongoose";

const returnSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  miqdor: { type: Number, required: true },
  sababi: { type: String },
  status: { type: String, default: "pending" },
}, { timestamps: true });

export default mongoose.model("Return", returnSchema);
