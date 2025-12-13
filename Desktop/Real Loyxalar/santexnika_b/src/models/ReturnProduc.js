// models/ReturnProduc.js
import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    productDetails: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        miqdor: {
          type: Number,
          required: true,
          min: [0.001, "Miqdor 0 dan katta bo‘lishi kerak"],
        },
        sababi: {
          type: String,
          required: true,
          trim: true,
          minlength: [1, "Sabab bo‘sh bo‘lmasligi kerak"],
        },
      },
    ],
    umumiyIzoh: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Return", returnSchema);