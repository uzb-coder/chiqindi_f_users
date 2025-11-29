import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    ism: { type: String, required: true },
    tel: { type: String, required: true, unique: true },
    manzil: { type: String, default: null },    // YANGI MAYDON
    foiz: { type: String, default: null }, // ixtiyoriy
    promo_kod: { type: String, default: null }, // ixtiyoriy
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
