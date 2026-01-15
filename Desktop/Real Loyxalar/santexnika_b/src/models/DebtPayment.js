// models/DebtPayment.js
import mongoose from "mongoose";

const debtPaymentSchema = new mongoose.Schema({
  // Mijoz
  client: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "clientModel",
    required: true,
    index: true
  },
  clientModel: {
    type: String,
    enum: ["Client", "DebtClient"],
    required: true
  },
  
  // Qaysi sotuv uchun to'lov
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: true,
    index: true
  },
  
  // To'lov summasi
  tolovSummasi: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Qarz olingan sana (sale yaratilgan sana)
  qarzOlinganSana: {
    type: Date,
    required: true
  },
  
  // Umumiy qarz (sale'ning total summasi)
  umumiyQarz: {
    type: Number,
    required: true,
    min: 0
  },
  
  // To'lovdan keyin qolgan qarz
  qolganQarz: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Qo'shimcha ma'lumot
  izoh: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

// Indexlar - tez qidiruv uchun
debtPaymentSchema.index({ client: 1, createdAt: -1 });
debtPaymentSchema.index({ sale: 1, createdAt: -1 });

export default mongoose.model("DebtPayment", debtPaymentSchema);