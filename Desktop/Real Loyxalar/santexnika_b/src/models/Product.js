import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  nomi: { type: String, required: true },
  narxi: { type: Number, required: true },
  valyuta: { type: String, default: "UZS" },
  birligi: { type: String, required: true },
  ombordagi_soni: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("Product", ProductSchema);
