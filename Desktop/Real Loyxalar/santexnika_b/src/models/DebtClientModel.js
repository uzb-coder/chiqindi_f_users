// models/DebtClient.js
import mongoose from "mongoose";

const debtClientSchema = new mongoose.Schema({
  ism: { type: String, required: true },
  tel: { type: String, required: true },
  manzil: { type: String, default: "" },
  qarzlar: [
    {
      miqdor: { type: Number, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

const DebtClient = mongoose.model("DebtClient", debtClientSchema);

export default DebtClient;
