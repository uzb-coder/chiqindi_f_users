import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    nomi: { type: String, required: true }, // Harajat nomi (masalan: Elektr to‘lovi)
    summa: { type: Number, required: true }, // Harajat summasi
    sana: { type: Date, default: Date.now }, // Sana
    izoh: { type: String }, // Qo‘shimcha izoh
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
