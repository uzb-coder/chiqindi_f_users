import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    ism: { type: String, required: true },
    telefon: { type: String, required: true, unique: true },
    foiz: { type: String, required: true },
    promo_kod: { type: String, default: null }, // ixtiyoriy
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
