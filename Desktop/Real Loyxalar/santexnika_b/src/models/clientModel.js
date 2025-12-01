// models/clientModel.js
import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    ism: { type: String, required: true },
    tel: { type: String, required: true, unique: true },
    manzil: { type: String, default: null },
    foiz: { type: Number, default: 0 },        // Number qilamiz, % sifatida
    promo_kod: { type: String, unique: true, sparse: true }, // faqat promo mijozlarda bo‘ladi
    type: {
      type: String,
      enum: ["regular", "promo", "debt"],      // YANGI: mijoz turi
      default: "regular"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);