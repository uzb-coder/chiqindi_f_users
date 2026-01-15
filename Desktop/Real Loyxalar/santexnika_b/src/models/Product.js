import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  nomi: { type: String, required: true },
  tannarxi: { type: Number, required: true },
  narxi: { type: Number, required: true },
  valyuta: { type: String, default: "UZS" },
  birligi: { type: String, required: true },
  categorya: { type: String, required: true },
  ombordagi_soni: { type: Number, required: true },
  categorya: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  }
}, { timestamps: true });

export default mongoose.model("Product", ProductSchema);
