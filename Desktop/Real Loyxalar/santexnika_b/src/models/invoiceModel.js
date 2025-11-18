import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    total: Number,
    paid: Number,
    status: { type: String, default: "issued" }, // issued/paid/partial
  },
  { timestamps: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
